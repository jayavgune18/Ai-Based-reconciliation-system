const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');
const {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  asyncHandler,
} = require('../utils/errorHandler');
const { validateRegistration, validateLogin, validatePasswordChange } = require('../validators/authValidator');

/**
 * Authentication Service
 * Handles all auth-related business logic
 */

class AuthService {
  /**
   * Register a new user
   *
   * @param {object} userData - User registration data
   * @returns {Promise<object>} - Created user and tokens
   * @throws {ValidationError|ConflictError}
   */
  static async register(userData) {
    try {
      // Validate input
      validateRegistration(userData);

      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new ConflictError('Email is already registered');
      }

      // Create new user
      const user = new User({
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        role: userData.role || 'viewer',
        phone: userData.phone || null,
        department: userData.department || null,
      });

      // Save user to database
      await user.save();

      // Generate tokens
      const accessToken = generateAccessToken({
        id: user._id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = generateRefreshToken({
        id: user._id,
      });

      return {
        user: user.toJSON(),
        accessToken,
        refreshToken,
        message: 'Registration successful',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login user
   *
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} - User and tokens
   * @throws {ValidationError|AuthenticationError}
   */
  static async login(email, password) {
    try {
      // Validate input
      validateLogin({ email, password });

      // Find user by email and include password field
      const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
        '+password'
      );

      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AuthenticationError('Your account has been deactivated');
      }

      // Check if account is locked
      if (user.isLocked) {
        throw new AuthenticationError(
          'Your account is locked due to too many failed login attempts. Please try again later.'
        );
      }

      // Compare passwords
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await user.incLoginAttempts();
        throw new AuthenticationError('Invalid email or password');
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      // Generate tokens
      const accessToken = generateAccessToken({
        id: user._id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = generateRefreshToken({
        id: user._id,
      });

      // Remove password from response
      const userObj = user.toJSON();

      return {
        user: userObj,
        accessToken,
        refreshToken,
        message: 'Login successful',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user by ID
   *
   * @param {string} userId - User ID
   * @returns {Promise<object>} - User object
   * @throws {NotFoundError}
   */
  static async getUserById(userId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new NotFoundError('User');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user by email
   *
   * @param {string} email - User email
   * @returns {Promise<object>} - User object
   * @throws {NotFoundError}
   */
  static async getUserByEmail(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() });

      if (!user) {
        throw new NotFoundError('User');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   *
   * @param {string} userId - User ID
   * @param {object} updateData - Data to update
   * @returns {Promise<object>} - Updated user
   * @throws {NotFoundError|ValidationError}
   */
  static async updateProfile(userId, updateData) {
    try {
      // Allowed fields to update
      const allowedFields = [
        'firstName',
        'lastName',
        'phone',
        'department',
      ];

      // Filter out disallowed fields
      const filteredData = {};
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      // Validate email format if email is being updated
      if (updateData.email) {
        throw new ValidationError('Email cannot be changed', [
          'Use change email endpoint instead',
        ]);
      }

      // Update user
      const user = await User.findByIdAndUpdate(userId, filteredData, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change user password
   *
   * @param {string} userId - User ID
   * @param {object} passwordData - Old and new passwords
   * @returns {Promise<object>} - Success message
   * @throws {NotFoundError|AuthenticationError|ValidationError}
   */
  static async changePassword(userId, passwordData) {
    try {
      // Validate input
      validatePasswordChange(passwordData);

      // Find user
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new NotFoundError('User');
      }

      // Verify old password
      const isOldPasswordValid = await user.comparePassword(passwordData.oldPassword);
      if (!isOldPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Update password
      user.password = passwordData.newPassword;
      await user.save();

      return {
        message: 'Password changed successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deactivate user account
   *
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Success message
   * @throws {NotFoundError}
   */
  static async deactivateAccount(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      );

      if (!user) {
        throw new NotFoundError('User');
      }

      return {
        message: 'Account deactivated successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reactivate user account (admin only)
   *
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Updated user
   * @throws {NotFoundError}
   */
  static async reactivateAccount(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: true },
        { new: true }
      );

      if (!user) {
        throw new NotFoundError('User');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   *
   * @param {object} filters - Filter options
   * @returns {Promise<array>} - Array of users
   */
  static async getAllUsers(filters = {}) {
    try {
      const { page = 1, limit = 10, role, isActive } = filters;
      const skip = (page - 1) * limit;

      // Build query
      const query = {};
      if (role) query.role = role;
      if (isActive !== undefined) query.isActive = isActive;

      // Execute query with pagination
      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean();

      // Get total count
      const total = await User.countDocuments(query);

      return {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user role (admin only)
   *
   * @param {string} userId - User ID
   * @param {string} newRole - New role
   * @returns {Promise<object>} - Updated user
   * @throws {NotFoundError|ValidationError}
   */
  static async updateUserRole(userId, newRole) {
    try {
      const validRoles = ['admin', 'accountant', 'manager', 'viewer'];
      
      if (!validRoles.includes(newRole)) {
        throw new ValidationError('Invalid role', [
          `Role must be one of: ${validRoles.join(', ')}`,
        ]);
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { role: newRole },
        { new: true }
      );

      if (!user) {
        throw new NotFoundError('User');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AuthService;
