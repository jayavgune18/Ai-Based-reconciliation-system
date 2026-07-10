const User = require('../models/User');
const Session = require('../models/Session');

// @desc    Get all users (admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password -otpCode -otpExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      count: users.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID (admin only)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -otpCode -otpExpires');

    if (!user) {
      res.statusCode = 404;
      return next(new Error('User not found.'));
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role (admin only)
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['user', 'admin'];

    if (!role || !allowedRoles.includes(role)) {
      res.statusCode = 400;
      return next(new Error(`Invalid role. Must be one of: ${allowedRoles.join(', ')}`));
    }

    // Prevent admin from changing their own role
    if (req.params.id === req.user.id) {
      res.statusCode = 400;
      return next(new Error('You cannot change your own role.'));
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password -otpCode -otpExpires');

    if (!user) {
      res.statusCode = 404;
      return next(new Error('User not found.'));
    }

    res.json({
      success: true,
      message: `User role updated to '${role}' successfully.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active status (admin only)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const toggleUserStatus = async (req, res, next) => {
  try {
    // Prevent admin from deactivating themselves
    if (req.params.id === req.user.id) {
      res.statusCode = 400;
      return next(new Error('You cannot change your own account status.'));
    }

    const user = await User.findById(req.params.id).select('-password -otpCode -otpExpires');

    if (!user) {
      res.statusCode = 404;
      return next(new Error('User not found.'));
    }

    user.isActive = !user.isActive;
    await user.save();

    // If deactivating, revoke all sessions
    if (!user.isActive) {
      await Session.updateMany(
        { userId: user._id, isActive: true },
        { $set: { isActive: false } }
      );
    }

    res.json({
      success: true,
      message: `User account ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      res.statusCode = 400;
      return next(new Error('You cannot delete your own account.'));
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      res.statusCode = 404;
      return next(new Error('User not found.'));
    }

    // Clean up sessions
    await Session.deleteMany({ userId: user._id });

    res.json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system stats (admin only)
// @route   GET /api/admin/stats
// @access  Private/Admin
const getSystemStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminCount = await User.countDocuments({ role: 'admin' });
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const totalSessions = await Session.countDocuments({ isActive: true });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        adminCount,
        verifiedUsers,
        activeSessions: totalSessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getSystemStats,
};