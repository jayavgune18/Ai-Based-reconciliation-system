const express = require('express');
const router = express.Router();
const { getStats, getFraudAlerts, getAuditLogs } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/stats', protect, getStats);
router.get('/fraud-alerts', protect, getFraudAlerts);
router.get('/audit-logs', protect, getAuditLogs);

module.exports = router;
