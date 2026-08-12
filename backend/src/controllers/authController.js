const AuthService = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Authentication Controller
 * Handles HTTP requests for auth endpoints
 */

class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static register = asyncHandler(async (req, res, next) => {
    try {
      const result = await AuthService.register(req.body);

      return successResponse(201, result, 'User registered successfully').send(res);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Login user
   * POST /api/auth/login
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static login = asyncHandler(async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      return successResponse(200, result, 'Login successful').send(res);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Get current user profile
   * GET /api/auth/me
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static getCurrentUser = asyncHandler(async (req, res, next) => {
    try {
      const user = await AuthService.getUserById(req.user.id);

      return successResponse(200, { user }, 'User profile fetched successfully').send(
        res
      );
    } catch (error) {
      next(error);
    }
  });

  /**
   * Update user profile
   * PUT /api/auth/profile
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static updateProfile = asyncHandler(async (req, res, next) => {
    try {
      const updatedUser = await AuthService.updateProfile(req.user.id, req.body);

      return successResponse(200, { user: updatedUser }, 'Profile updated successfully').send(
        res
      );
    } catch (error) {
      next(error);
    }
  });

  /**
   * Change password
   * POST /api/auth/change-password
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static changePassword = asyncHandler(async (req, res, next) => {
    try {
      const result = await AuthService.changePassword(req.user.id, req.body);

      return successResponse(200, result, result.message).send(res);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Logout user
   * POST /api/auth/logout
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static logout = asyncHandler(async (req, res, next) => {
    try {
      // Clear token from client (handled on frontend)
      // Could implement token blacklisting here for enhanced security

      return successResponse(200, {}, 'Logout successful').send(res);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Deactivate account
   * DELETE /api/auth/account
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static deactivateAccount = asyncHandler(async (req, res, next) => {
    try {
      const result = await AuthService.deactivateAccount(req.user.id);

      return successResponse(200, result, 'Account deactivated successfully').send(res);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Get all users (admin only)
   * GET /api/auth/users
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static getAllUsers = asyncHandler(async (req, res, next) => {
    try {
      const { page, limit, role, isActive } = req.query;

      const result = await AuthService.getAllUsers({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        role,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });

      return successResponse(200, result, 'Users fetched successfully').send(res);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Get user by ID (admin only)
   * GET /api/auth/users/:userId
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static getUserById = asyncHandler(async (req, res, next) => {
    try {
      const user = await AuthService.getUserById(req.params.userId);

      return successResponse(200, { user }, 'User fetched successfully').send(res);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Update user role (admin only)
   * PUT /api/auth/users/:userId/role
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static updateUserRole = asyncHandler(async (req, res, next) => {
    try {
      const { role } = req.body;
      const user = await AuthService.updateUserRole(req.params.userId, role);

      return successResponse(200, { user }, 'User role updated successfully').send(res);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Reactivate user account (admin only)
   * POST /api/auth/users/:userId/reactivate
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static reactivateAccount = asyncHandler(async (req, res, next) => {
    try {
      const user = await AuthService.reactivateAccount(req.params.userId);

      return successResponse(200, { user }, 'User account reactivated successfully').send(res);
    } catch (error) {
      next(error);
    }
  });
}

module.exports = AuthController;
