/**
 * Centralized Error Handler
 * Manages all error types and formats with consistent responses
 */

class AppError extends Error {
  /**
   * Custom error class extending native Error
   *
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code for client-side identification
   */
  constructor(message, statusCode, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * Authentication Error
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization Error
 */
class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not Found Error
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Conflict Error (e.g., duplicate email)
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Server Error
 */
class ServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * Rate Limit Error
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (error) => {
  const messages = Object.values(error.errors).map((err) => err.message);
  return new ValidationError('Validation failed', messages);
};

/**
 * Handle Mongoose duplicate key error
 */
const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyPattern)[0];
  return new ConflictError(`${field.charAt(0).toUpperCase() + field.slice(1)} already exists`);
};

/**
 * Handle Mongoose cast error
 */
const handleCastError = (error) => {
  return new ValidationError(`Invalid ${error.path}: ${error.value}`);
};

/**
 * Global error handler middleware
 * Should be used as the last middleware in the Express app
 */
const errorHandlerMiddleware = (err, req, res, next) => {
  // Default error properties
  let error = { ...err };
  error.message = err.message;

  // Handle specific Mongoose errors
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }

  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  if (err.name === 'CastError') {
    error = handleCastError(err);
  }

  // Fallback to AppError if not already an instance
  if (!(error instanceof AppError)) {
    error = new ServerError(
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message
    );
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      stack: error.stack,
    });
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    statusCode: error.statusCode || 500,
    message: error.message || 'Internal server error',
    code: error.code,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Async handler wrapper to catch Promise rejections
 *
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ServerError,
  RateLimitError,
  errorHandlerMiddleware,
  asyncHandler,
};
