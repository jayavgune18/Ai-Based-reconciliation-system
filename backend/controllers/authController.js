const User = require('../models/User');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const Session = require('../models/Session');

// Helper to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkeychangeinproduction123!@#', {
    expiresIn: process.env.JWT_EXPIRE || '1d',
  });
};

// Helper to send token in response (both as JSON and signed cookie)
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 1) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // Cannot be accessed by client-side JS (XSS protection)
    signed: true,   // Signed cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  };

  res.status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
      },
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  const { name, email, password, role } = req.body;

  try {
    // Check MongoDB connection state before querying
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      res.statusCode = 503;
      return next(new Error('Database is not connected. Please check that MongoDB is running and the connection string is correct.'));
    }

    if (!name || !email || !password) {
      res.statusCode = 400;
      return next(new Error('Please provide name, email and password.'));
    }

    // Password strength check
    if (password.length < 6) {
      res.statusCode = 400;
      return next(new Error('Password must be at least 6 characters.'));
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.statusCode = 400;
      return next(new Error('User already exists with this email address.'));
    }

    // Public registration always creates a 'user' role account.
    // Admin accounts can only be created via the admin panel.
    const userRole = 'user';

    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
    });

    if (user) {
      sendTokenResponse(user, 201, res);
    } else {
      res.statusCode = 400;
      return next(new Error('Invalid user data provided.'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      res.statusCode = 400;
      return next(new Error('Please provide email and password.'));
    }

    // Check MongoDB connection state before querying
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      res.statusCode = 503;
      return next(new Error('Database is not connected. Please check that MongoDB is running and the connection string is correct.'));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.statusCode = 401;
      return next(new Error('Invalid email or password.'));
    }

    // Check if account is active
    if (!user.isActive) {
      res.statusCode = 401;
      return next(new Error('Account has been deactivated. Contact support.'));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.statusCode = 401;
      return next(new Error('Invalid email or password.'));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create session record
    const token = generateToken(user._id);
    try {
      await Session.create({
        userId: user._id,
        token,
        deviceInfo: req.headers['user-agent'] || 'Unknown device',
        ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (sessionErr) {
      // Session creation failure shouldn't block login
      console.warn('⚠️ Failed to create session record:', sessionErr.message);
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user: {
        ...user.toObject(),
        password: undefined
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    // Deactivate current session
    const currentToken = req.headers.authorization?.split(' ')[1] || req.signedCookies?.token;
    if (currentToken) {
      await Session.updateOne(
        { token: currentToken, userId: req.user.id },
        { $set: { isActive: false } }
      );
    }

    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 5 * 1000), // 5 seconds
      httpOnly: true,
      signed: true,
    });

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if current user has admin privileges
// @route   GET /api/auth/admin/check
// @access  Private/Admin
const checkAdmin = async (req, res, next) => {
  try {
    res.json({
      success: true,
      isAdmin: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== OTP VERIFICATION ====================

// @desc    Send OTP to user's email (simulated - generates and stores OTP)
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res, next) => {
  const { email } = req.body;

  try {
    if (!email) {
      res.statusCode = 400;
      return next(new Error('Please provide an email address.'));
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.statusCode = 404;
      return next(new Error('No account found with this email. Please register first.'));
    }

    // Generate a 6-digit OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;

    // Store OTP and expiry in user document
    user.otpCode = otp;
    user.otpExpires = new Date(Date.now() + expiryMinutes * 60 * 1000);
    await user.save();

    // In production, send this OTP via email/SMS
    // For now, we return it in the response (dev mode only)
    console.log(`📧 OTP for ${email}: ${otp} (expires in ${expiryMinutes} min)`);

    res.json({
      success: true,
      message: `OTP sent to ${email}. It expires in ${expiryMinutes} minutes.`,
      // Only include OTP in development mode for testing
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and mark user as verified
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      res.statusCode = 400;
      return next(new Error('Please provide email and OTP.'));
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.statusCode = 404;
      return next(new Error('No account found with this email.'));
    }

    if (!user.otpCode || !user.otpExpires) {
      res.statusCode = 400;
      return next(new Error('No OTP has been sent. Please request a new OTP.'));
    }

    if (user.otpExpires < new Date()) {
      res.statusCode = 400;
      return next(new Error('OTP has expired. Please request a new OTP.'));
    }

    if (user.otpCode !== otp) {
      res.statusCode = 400;
      return next(new Error('Invalid OTP. Please try again.'));
    }

    // OTP verified - mark user as verified and clear OTP fields
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// ==================== OAUTH HANDLERS ====================

// @desc    OAuth callback handler (Google/GitHub)
// @route   GET /api/auth/:provider/callback
// @access  Public
const oauthCallback = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/login?error=oauth_failed`);
    }

    // Update last login
    req.user.lastLogin = new Date();
    await req.user.save();

    const token = generateToken(req.user._id);

    const cookieOptions = {
      expires: new Date(
        Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 1) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    };

    // Redirect to frontend with token in cookie
    res.cookie('token', token, cookieOptions)
      .redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/dashboard`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  logout,
  checkAdmin,
  sendOtp,
  verifyOtp,
  oauthCallback,
};