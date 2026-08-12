const { verifyAccessToken, extractTokenFromHeaders } = require('../utils/tokenUtils');
const { AuthenticationError, AuthorizationError, asyncHandler } = require('../utils/errorHandler');
const User = require('../models/User');

/**
 * Authentication and Authorization Middleware
 * Handles JWT verification and role-based access control
 */

/**
 * Verify JWT token and attach user to request
 * This middleware should be applied to protected routes
 */
const authMiddleware = asyncHandler(async (req, res, next) => {
  try {
    // Extract token from headers
    const token = extractTokenFromHeaders(req.headers);

    if (!token) {
      throw new AuthenticationError('Authorization token is missing');
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Fetch user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.isActive) {
      throw new AuthenticationError('User account is inactive');
    }

    // Attach user and token to request object
    req.user = user;
    req.user.id = user._id;
    req.token = token;

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Role-based access control middleware
 * Checks if user has required role(s)
 *
 * @param {...string} allowedRoles - Roles allowed to access endpoint
 * @returns {Function} - Middleware function
 */
const roleMiddleware = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError(
        `Only users with roles: ${allowedRoles.join(', ')} can access this resource`
      );
    }

    next();
  });
};

/**
 * Admin-only middleware
 * Shorthand for checking admin role
 */
const adminMiddleware = roleMiddleware('admin');

/**
 * Accountant or Admin middleware
 * Allows both accountants and admins
 */
const accountantMiddleware = roleMiddleware('admin', 'accountant');

/**
 * Manager or higher middleware
 * Allows managers and admins
 */
const managerMiddleware = roleMiddleware('admin', 'manager', 'accountant');

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if missing
 */
const optionalAuthMiddleware = asyncHandler(async (req, res, next) => {
  try {
    // Extract token from headers
    const token = extractTokenFromHeaders(req.headers);

    if (token) {
      try {
        // Verify token
        const decoded = verifyAccessToken(token);

        // Fetch user from database
        const user = await User.findById(decoded.id);

        if (user && user.isActive) {
          req.user = user;
          req.user.id = user._id;
          req.token = token;
        }
      } catch (error) {
        // Silently ignore token errors, treat as unauthenticated
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Rate limiting middleware for login attempts
 * Prevents brute force attacks
 *
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} - Middleware function
 */
const rateLimitMiddleware = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${ip}:${req.path}`;

    if (!attempts.has(key)) {
      attempts.set(key, { count: 0, resetTime: Date.now() + windowMs });
    }

    const record = attempts.get(key);

    if (Date.now() > record.resetTime) {
      record.count = 0;
      record.resetTime = Date.now() + windowMs;
    }

    record.count++;

    if (record.count > maxAttempts) {
      return res.status(429).json({
        success: false,
        statusCode: 429,
        message: `Too many attempts. Please try again after ${Math.ceil((record.resetTime - Date.now()) / 1000)} seconds`,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    next();
  };
};

/**
 * Ownership middleware
 * Ensures user can only modify their own data (unless admin)
 */
const ownershipMiddleware = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AuthenticationError('User not authenticated');
  }

  // Allow admins to modify any user
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if user is modifying their own data
  const userId = req.params.userId || req.params.id;
  if (userId !== req.user.id.toString()) {
    throw new AuthorizationError('You can only modify your own data');
  }

  next();
});

module.exports = {
  authMiddleware,
  roleMiddleware,
  adminMiddleware,
  accountantMiddleware,
  managerMiddleware,
  optionalAuthMiddleware,
  rateLimitMiddleware,
  ownershipMiddleware,
};
