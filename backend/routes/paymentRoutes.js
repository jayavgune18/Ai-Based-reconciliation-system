const express = require('express');
const router = express.Router();
const {
  getPaymentConfig,
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  getPaymentById,
  runReconciliation,
  getReconciliationReport,
  downloadPdfReport,
  downloadExcelReport
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

// ── Public Routes ──
// Public configuration (returns only public key ID, never secret)
router.get('/config', getPaymentConfig);

// Webhook endpoint: Razorpay calls this asynchronously (verified via webhook secret signature)
router.post('/webhook', handleWebhook);

// ── Protected Routes ──
// Create new payment order with backend security validation
router.post('/create-order', protect, createOrder);

// Verify payment signature cryptographically on server
router.post('/verify', protect, verifyPayment);

// Transaction History & Details
router.get('/history', protect, getPaymentHistory);
router.get('/:id', protect, getPaymentById);

// ── Financial Reconciliation Endpoints ──
// Run automated reconciliation between gateway payments and internal records
router.post('/reconcile', protect, runReconciliation);

// Get current reconciliation status and stats
router.get('/reconcile/report', protect, getReconciliationReport);

// Download Reconciliation PDF Report
router.get('/reconcile/download-pdf', protect, downloadPdfReport);

// Download Reconciliation Excel Report
router.get('/reconcile/download-excel', protect, downloadExcelReport);

module.exports = router;
