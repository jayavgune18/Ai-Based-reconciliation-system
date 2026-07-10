const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { apiLimiter } = require('../middlewares/rateLimiter');
const {
  updateProfile,
  getStorageStats,
  changePassword,
  getSessions,
  revokeSession,
  logoutAllDevices,
  disableAccount,
  deleteAccount,
} = require('../controllers/settingsController');

// Profile management
router.put('/profile', protect, updateProfile);
router.get('/storage', protect, getStorageStats);
router.put('/change-password', protect, changePassword);

// Session management
router.get('/sessions', protect, getSessions);
router.delete('/sessions/:id', protect, revokeSession);
router.post('/logout-all', protect, logoutAllDevices);

// Account management
router.post('/disable-account', protect, disableAccount);
router.delete('/delete-account', protect, deleteAccount);

module.exports = router;