const errorHandler = (err, req, res, next) => {
  console.error('💥 Server Error Triggered:', err);

  let error = { ...err };
  error.message = err.message;

  // MongoDB Connection Timeout
  if (err.name === 'MongooseError' || err.message.includes('buffering timed out')) {
    const message = 'Database connection timeout. Please try again.';
    error = new Error(message);
    res.statusCode = 503;
  }

  // Mongoose Bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new Error(message);
    res.statusCode = 404;
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new Error(message);
    res.statusCode = 400;
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new Error(message);
    res.statusCode = 400;
  }

  res.status(res.statusCode === 200 ? 500 : (res.statusCode || 500)).json({
    success: false,
    message: error.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = errorHandler;
