const errorHandler = (err, req, res, next) => {
  // Log full error for server-side debugging
  console.error('💥 Server Error Triggered:');
  console.error(`   Name: ${err.name}`);
  console.error(`   Message: ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(`   Stack: ${err.stack}`);
  }

  // Determine status code: use err.statusCode or res.statusCode or default 500
  let statusCode = err.statusCode || res.statusCode || 500;
  // If nothing was explicitly set, default to 500
  if (statusCode < 400) statusCode = 500;

  let message = err.message || 'Internal Server Error';

  // MongoDB Connection Timeout
  if (err.name === 'MongooseError' || err.message?.includes('buffering timed out')) {
    message = 'Database connection timeout. Please try again.';
    statusCode = 503;
  }

  // Mongoose Bad ObjectId - sanitize to not leak internal IDs
  if (err.name === 'CastError') {
    message = 'Resource not found';
    statusCode = 404;
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    message = 'Duplicate field value entered';
    statusCode = 400;
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(val => val.message).join(', ');
    statusCode = 400;
  }

  // JWT Errors - don't leak internal details
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid authentication token.';
    statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Authentication token has expired. Please login again.';
    statusCode = 401;
  }

  // In production, don't expose raw error messages
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = errorHandler;
