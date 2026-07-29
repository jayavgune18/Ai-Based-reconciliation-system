const rateLimit = require('express-rate-limit');

// In a proxy environment like Render, req.ip might be the proxy's IP.
// 'X-Forwarded-For' header gives the original client IP.
// This key generator ensures we rate-limit the actual user, not the proxy.
const keyGenerator = (req) => {
  // Use the first IP in the X-Forwarded-For header, or fall back to req.ip
  return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
};

// Custom handler to ensure consistent JSON error response format
// express-rate-limit v7 passes (req, res, next) - options is NOT passed as a parameter
const handler = (req, res, next) => {
  // In express-rate-limit v7, the message is available via req.rateLimit
  const message = req.rateLimit?.message?.message 
    || req.rateLimit?.message 
    || 'Too many requests, please try again later.';
  res.status(429).json({
    success: false,
    message,
  });
};

// General API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator,
  handler,
});

// Auth-specific rate limiter (stricter - for login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per 15 minutes
  message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator,
  handler,
});

// File upload endpoints rate limit (hardened to prevent DDoS / Disk flooding)
const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit IP to 20 uploads per 5 minutes
  message: { message: 'Too many statement uploads from this IP, please wait 5 minutes before uploading again.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
});

module.exports = { apiLimiter, authLimiter, uploadLimiter };