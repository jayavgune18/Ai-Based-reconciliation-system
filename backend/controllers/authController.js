const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkeychangeinproduction123!@#', {
    expiresIn: '1d',
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

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.statusCode = 400;
      return next(new Error('User already exists with this email address.'));
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user', // Defaults to 'user', but can pass 'admin' for demo setups
    });

    if (user) {
      res.status(201).json({
        success: true,
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
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

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      res.json({
        success: true,
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      res.statusCode = 401;
      return next(new Error('Invalid email or password.'));
    }
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
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
