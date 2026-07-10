const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { 
  registerUser, loginUser, getMe, logout, checkAdmin,
  sendOtp, verifyOtp, oauthCallback 
} = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { apiLimiter, authLimiter } = require('../middlewares/rateLimiter');

// ==================== LOCAL AUTH ====================
router.post('/register', apiLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.get('/admin/check', protect, authorize('admin'), checkAdmin);

// ==================== OTP VERIFICATION ====================
router.post('/send-otp', apiLimiter, sendOtp);
router.post('/verify-otp', apiLimiter, verifyOtp);

// ==================== OAUTH - GOOGLE ====================
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false 
}));

router.get('/google/callback', 
  passport.authenticate('google', { 
    session: false, 
    failureRedirect: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/login?error=google_auth_failed`
  }), 
  oauthCallback
);

// ==================== OAUTH - GITHUB ====================
router.get('/github', passport.authenticate('github', { 
  scope: ['user:email'],
  session: false 
}));

router.get('/github/callback', 
  passport.authenticate('github', { 
    session: false, 
    failureRedirect: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/login?error=github_auth_failed`
  }), 
  oauthCallback
);

module.exports = router;