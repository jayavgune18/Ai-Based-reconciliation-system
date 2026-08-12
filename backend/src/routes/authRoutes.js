const express = require('express');
const AuthController = require('../controllers/authController');
const {
  authMiddleware,
  adminMiddleware,
  rateLimitMiddleware,
  ownershipMiddleware,
} = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Authentication Routes
 * All endpoints under /api/auth
 */

// ==================== PUBLIC ROUTES ====================

/**
 * POST /api/auth/register
 * Register a new user
 * Body: { firstName, lastName, email, password, confirmPassword, phone?, department? }
 */
router.post('/register', rateLimitMiddleware(5, 15 * 60 * 1000), AuthController.register);

/**
 * POST /api/auth/login
 * Login user
 * Body: { email, password }
 * Returns: { user, accessToken, refreshToken }
 */
router.post('/login', rateLimitMiddleware(5, 15 * 60 * 1000), AuthController.login);

// ==================== PROTECTED ROUTES ====================

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 * Header: Authorization: Bearer <token>
 */
router.get('/me', authMiddleware, AuthController.getCurrentUser);

/**
 * PUT /api/auth/profile
 * Update current user profile
 * Header: Authorization: Bearer <token>
 * Body: { firstName?, lastName?, phone?, department? }
 */
router.put('/profile', authMiddleware, AuthController.updateProfile);

/**
 * POST /api/auth/change-password
 * Change current user password
 * Header: Authorization: Bearer <token>
 * Body: { oldPassword, newPassword, confirmPassword }
 */
router.post(
  '/change-password',
  authMiddleware,
  rateLimitMiddleware(3, 10 * 60 * 1000),
  AuthController.changePassword
);

/**
 * POST /api/auth/logout
 * Logout current user
 * Header: Authorization: Bearer <token>
 */
router.post('/logout', authMiddleware, AuthController.logout);

/**
 * DELETE /api/auth/account
 * Deactivate current user account
 * Header: Authorization: Bearer <token>
 */
router.delete('/account', authMiddleware, AuthController.deactivateAccount);

// ==================== ADMIN ROUTES ====================

/**
 * GET /api/auth/users
 * Get all users (paginated)
 * Header: Authorization: Bearer <token>
 * Query: ?page=1&limit=10&role=accountant&isActive=true
 */
router.get('/users', authMiddleware, adminMiddleware, AuthController.getAllUsers);

/**
 * GET /api/auth/users/:userId
 * Get specific user by ID
 * Header: Authorization: Bearer <token>
 */
router.get('/users/:userId', authMiddleware, adminMiddleware, AuthController.getUserById);

/**
 * PUT /api/auth/users/:userId/role
 * Update user role
 * Header: Authorization: Bearer <token>
 * Body: { role: "admin"|"accountant"|"manager"|"viewer" }
 */
router.put(
  '/users/:userId/role',
  authMiddleware,
  adminMiddleware,
  AuthController.updateUserRole
);

/**
 * POST /api/auth/users/:userId/reactivate
 * Reactivate deactivated user account
 * Header: Authorization: Bearer <token>
 */
router.post(
  '/users/:userId/reactivate',
  authMiddleware,
  adminMiddleware,
  AuthController.reactivateAccount
);

module.exports = router;
