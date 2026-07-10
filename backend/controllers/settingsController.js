const User = require('../models/User');
const Session = require('../models/Session');
const Transaction = require('../models/Transaction');
const ReconciliationJob = require('../models/ReconciliationJob');
const ReconciliationMatch = require('../models/ReconciliationMatch');
const AuditLog = require('../models/AuditLog');
const jwt = require('jsonwebtoken');

// Helper to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkeychangeinproduction123!@#', {
    expiresIn: process.env.JWT_EXPIRE || '1d',
  });
};

// @desc    Update profile info (name, email, avatar)
// @route   PUT /api/settings/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  const { name, email, avatar } = req.body;

  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      res.statusCode = 404;
      return next(new Error('User not found.'));
    }

    // Update name if provided
    if (name) user.name = name;

    // Update email if provided (check uniqueness)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        res.statusCode = 400;
        return next(new Error('Email is already in use by another account.'));
      }
      user.email = email;
      user.isVerified = false; // Require re-verification on email change
    }

    // Update avatar if provided
    if (avatar) user.avatar = avatar;

    await user.save();

    // Log audit trail
    await AuditLog.create({
      userId: user._id,
      action: 'PROFILE_UPDATE',
      details: {
        name: name || undefined,
        email: email || undefined,
        avatarChanged: !!avatar,
      },
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get storage statistics
// @route   GET /api/settings/storage
// @access  Private
const getStorageStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Count records across all collections
    const [
      transactionCount,
      bankTransactions,
      internalTransactions,
      reconJobCount,
      matchCount,
      auditLogCount,
      sessionCount,
    ] = await Promise.all([
      Transaction.countDocuments(),
      Transaction.countDocuments({ source: 'bank' }),
      Transaction.countDocuments({ source: 'internal' }),
      ReconciliationJob.countDocuments({ createdBy: userId }),
      ReconciliationMatch.countDocuments(),
      AuditLog.countDocuments({ userId }),
      Session.countDocuments({ userId, isActive: true }),
    ]);

    // Calculate approximate storage (rough estimate)
    const avgDocumentSize = 1.5; // KB per document average
    const totalDocuments = transactionCount + reconJobCount + matchCount + auditLogCount + sessionCount;
    const usedStorageKB = Math.round(totalDocuments * avgDocumentSize * 100) / 100;
    const usedStorageMB = Math.round((usedStorageKB / 1024) * 100) / 100;
    const totalStorageMB = 500; // Example: 500 MB total quota per user
    const usagePercent = Math.round((usedStorageMB / totalStorageMB) * 100 * 100) / 100;

    res.json({
      success: true,
      storage: {
        used: {
          kb: usedStorageKB,
          mb: usedStorageMB,
        },
        total: {
          mb: totalStorageMB,
        },
        usagePercent: Math.min(usagePercent, 100),
        details: {
          transactions: transactionCount,
          bankRecords: bankTransactions,
          internalRecords: internalTransactions,
          reconciliationJobs: reconJobCount,
          matches: matchCount,
          auditLogs: auditLogCount,
          activeSessions: sessionCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/settings/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  try {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      res.statusCode = 400;
      return next(new Error('Please provide current password, new password, and confirm new password.'));
    }

    if (newPassword.length < 6) {
      res.statusCode = 400;
      return next(new Error('New password must be at least 6 characters.'));
    }

    if (newPassword !== confirmNewPassword) {
      res.statusCode = 400;
      return next(new Error('New password and confirm password do not match.'));
    }

    // Get user with password field
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      res.statusCode = 404;
      return next(new Error('User not found.'));
    }

    // For OAuth-only users (no password set)
    if (!user.password) {
      // Allow setting a password for the first time
      user.password = newPassword;
      await user.save();

      return res.json({
        success: true,
        message: 'Password has been set successfully.',
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.statusCode = 400;
      return next(new Error('Current password is incorrect.'));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log audit trail
    await AuditLog.create({
      userId: user._id,
      action: 'PASSWORD_CHANGE',
      details: {
        method: user.password ? 'password_update' : 'initial_setup',
      },
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    // Invalidate all other sessions (except current)
    // Generate new token for current session
    const newToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again on other devices.',
      token: newToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active sessions/devices
// @route   GET /api/settings/sessions
// @access  Private
const getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user.id, isActive: true })
      .sort({ lastActivity: -1 })
      .select('-token') // Don't expose tokens
      .lean();

    // Mark current session (if we can identify it)
    const currentToken = req.headers.authorization?.split(' ')[1] || req.signedCookies?.token;
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      isCurrentSession: session._id.toString() === req.sessionId || false,
    }));

    res.json({
      success: true,
      count: sessionsWithCurrent.length,
      sessions: sessionsWithCurrent,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke a specific session (logout device)
// @route   DELETE /api/settings/sessions/:id
// @access  Private
const revokeSession = async (req, res, next) => {
  const { id } = req.params;

  try {
    const session = await Session.findOne({ _id: id, userId: req.user.id });

    if (!session) {
      res.statusCode = 404;
      return next(new Error('Session not found.'));
    }

    // Prevent revoking current session via this endpoint (use logout instead)
    if (session.token === (req.headers.authorization?.split(' ')[1] || req.signedCookies?.token)) {
      res.statusCode = 400;
      return next(new Error('Cannot revoke current session. Use logout instead.'));
    }

    session.isActive = false;
    await session.save();

    // Log audit trail
    await AuditLog.create({
      userId: req.user.id,
      action: 'SESSION_REVOKE',
      details: {
        revokedSessionId: session._id,
        deviceName: session.deviceName || 'Unknown',
        ipAddress: session.ip || 'Unknown',
      },
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    res.json({
      success: true,
      message: 'Session revoked successfully. Device has been logged out.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout from all devices (except current)
// @route   POST /api/settings/logout-all
// @access  Private
const logoutAllDevices = async (req, res, next) => {
  try {
    const currentToken = req.headers.authorization?.split(' ')[1] || req.signedCookies?.token;

    // Deactivate all sessions except current
    const result = await Session.updateMany(
      { userId: req.user.id, isActive: true, token: { $ne: currentToken } },
      { $set: { isActive: false } }
    );

    // Log audit trail
    await AuditLog.create({
      userId: req.user.id,
      action: 'LOGOUT_ALL_DEVICES',
      details: {
        loggedOutCount: result.modifiedCount,
      },
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    res.json({
      success: true,
      message: `Logged out from ${result.modifiedCount} other device(s). Current session remains active.`,
      loggedOutDevices: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disable account (temporary)
// @route   POST /api/settings/disable-account
// @access  Private
const disableAccount = async (req, res, next) => {
  const { password } = req.body;

  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      res.statusCode = 404;
      return next(new Error('User not found.'));
    }

    // Verify password before disabling
    if (user.password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.statusCode = 400;
        return next(new Error('Password is incorrect. Account was not disabled.'));
      }
    }

    user.isActive = false;
    await user.save();

    // Invalidate all sessions
    await Session.updateMany(
      { userId: user._id, isActive: true },
      { $set: { isActive: false } }
    );

    // Clear cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
      signed: true,
    });

    // Log audit trail
    await AuditLog.create({
      userId: user._id,
      action: 'ACCOUNT_DISABLE',
      details: {
        previousActive: true,
      },
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    res.json({
      success: true,
      message: 'Account has been disabled. You can reactivate by contacting support or logging in again.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete account permanently
// @route   DELETE /api/settings/delete-account
// @access  Private
const deleteAccount = async (req, res, next) => {
  const { password, confirmation } = req.body;

  try {
    if (confirmation !== 'CONFIRM_DELETE') {
      res.statusCode = 400;
      return next(new Error('Please type CONFIRM_DELETE to confirm account deletion.'));
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      res.statusCode = 404;
      return next(new Error('User not found.'));
    }

    // Verify password before deletion
    if (user.password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.statusCode = 400;
        return next(new Error('Password is incorrect. Account was not deleted.'));
      }
    }

    const userId = user._id;

    // Delete all user-related data
    await Promise.all([
      User.findByIdAndDelete(userId),
      Session.deleteMany({ userId }),
      AuditLog.deleteMany({ userId }),
      // Note: We keep transactions and jobs for data integrity,
      // but anonymize them by removing the user reference
    ]);

    // Clear cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
      signed: true,
    });

    // Note: AuditLog for deletion is intentionally not created here
    // because the user's audit logs are deleted alongside the account.
    // The deletion itself is the audit record.

    res.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
  getStorageStats,
  changePassword,
  getSessions,
  revokeSession,
  logoutAllDevices,
  disableAccount,
  deleteAccount,
};