const express = require('express');
const router = express.Router();
const {
  getPlans,
  getCurrentSubscription,
  createCheckoutSession,
  verifySubscription,
  upgradeOrDowngrade,
  cancelSubscription,
  resumeSubscription,
  getBillingHistory,
  downloadInvoicePdf,
  handleSubscriptionWebhook
} = require('../controllers/subscriptionController');
const { protect } = require('../middlewares/authMiddleware');

// ── Public Routes ──
// Get available plans with pricing & feature comparison
router.get('/plans', getPlans);

// Webhook endpoint called asynchronously by Razorpay
router.post('/webhook', handleSubscriptionWebhook);

// ── Protected Routes ──
// Current subscription details & usage meters
router.get('/current', protect, getCurrentSubscription);

// Create checkout session for plan purchase
router.post('/checkout', protect, createCheckoutSession);

// Cryptographically verify signature and activate plan
router.post('/verify', protect, verifySubscription);

// Upgrade or downgrade active plan
router.post('/upgrade-downgrade', protect, upgradeOrDowngrade);

// Cancel active subscription (soft cancel retaining period)
router.post('/cancel', protect, cancelSubscription);

// Resume auto-renewal before period end
router.post('/resume', protect, resumeSubscription);

// Billing history & invoices list
router.get('/invoices', protect, getBillingHistory);

// Download PDF invoice
router.get('/invoices/:id/pdf', protect, downloadInvoicePdf);

module.exports = router;
