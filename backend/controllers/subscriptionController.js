const SubscriptionService = require('../services/subscriptionService');
const InvoiceGenerator = require('../services/invoiceGenerator');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { PLANS, getPlanById } = require('../config/plans');
const { isConfigured, verifyWebhookSignature, keyId } = require('../config/razorpay');

/**
 * 1. Get Available Subscription Plans & Tiers
 * GET /api/subscriptions/plans
 */
const getPlans = (req, res) => {
  res.json({
    success: true,
    plans: Object.values(PLANS),
    isRazorpayLive: isConfigured(),
    keyId: process.env.RAZORPAY_KEY_ID || keyId,
    currency: 'INR'
  });
};

/**
 * 2. Get User's Current Active Subscription & Usage Quota
 * GET /api/subscriptions/current
 */
const getCurrentSubscription = async (req, res, next) => {
  try {
    const subscription = await SubscriptionService.getUserSubscription(req.user._id);
    const plan = getPlanById(subscription.planId);

    // Calculate days remaining in current billing cycle
    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const msRemaining = Math.max(0, periodEnd.getTime() - now.getTime());
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    // Calculate usage percentages
    const jobsLimit = subscription.usage.jobsLimit || plan.limits.jobsPerMonth;
    const jobsUsed = subscription.usage.jobsUsedThisMonth || 0;
    const jobsPercentage = Math.min(100, Math.round((jobsUsed / jobsLimit) * 100));

    const txnsLimit = subscription.usage.transactionsLimit || plan.limits.transactionsPerJob;
    const txnsUsed = subscription.usage.transactionsProcessedThisMonth || 0;
    const txnsPercentage = Math.min(100, Math.round((txnsUsed / (plan.limits.transactionsPerMonth || 1000)) * 100));

    res.json({
      success: true,
      subscription: {
        id: subscription._id,
        planId: subscription.planId,
        planName: subscription.planName,
        billingCycle: subscription.billingCycle,
        price: subscription.price,
        currency: subscription.currency,
        status: subscription.status,
        autoRenew: subscription.autoRenew,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelledAt: subscription.cancelledAt,
        cancellationReason: subscription.cancellationReason,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        daysRemaining,
        usage: {
          jobsUsedThisMonth: jobsUsed,
          jobsLimit,
          jobsPercentage,
          transactionsProcessedThisMonth: txnsUsed,
          transactionsLimit: txnsLimit,
          transactionsPercentage: txnsPercentage,
          aiChecksUsed: subscription.usage.aiChecksUsed || 0,
          aiChecksLimit: subscription.usage.aiChecksLimit || plan.limits.aiChecksPerMonth,
          lastResetDate: subscription.usage.lastResetDate
        },
        features: plan.features
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Create Checkout Session for Razorpay
 * POST /api/subscriptions/checkout
 * Body: { planId, cycle, customerDetails }
 */
const createCheckoutSession = async (req, res, next) => {
  try {
    const { planId, cycle = 'monthly', customerDetails } = req.body;

    if (!planId) {
      res.statusCode = 400;
      return next(new Error('Please select a valid subscription plan.'));
    }

    if (planId === 'free') {
      res.statusCode = 400;
      return next(new Error('Free starter tier does not require payment checkout.'));
    }

    const sessionData = await SubscriptionService.createCheckoutSession(
      req.user._id,
      planId,
      cycle,
      customerDetails
    );

    res.json({
      success: true,
      ...sessionData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Verify Payment and Automatically Activate Plan
 * POST /api/subscriptions/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, cycle, method, customerDetails }
 */
const verifySubscription = async (req, res, next) => {
  try {
    const result = await SubscriptionService.verifyAndActivateSubscription(
      req.user._id,
      req.body
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Upgrade or Downgrade Subscription Plan
 * POST /api/subscriptions/upgrade-downgrade
 * Body: { newPlanId, newCycle }
 */
const upgradeOrDowngrade = async (req, res, next) => {
  try {
    const { newPlanId, newCycle = 'monthly' } = req.body;

    if (!newPlanId) {
      res.statusCode = 400;
      return next(new Error('Please specify the new plan.'));
    }

    const currentSub = await SubscriptionService.getUserSubscription(req.user._id);

    // If downgrading to free tier: soft cancel paid plan so they keep features till period end
    if (newPlanId === 'free') {
      const cancelResult = await SubscriptionService.cancelSubscription(
        req.user._id,
        'Downgraded to Free Starter plan at period end'
      );
      return res.json(cancelResult);
    }

    // For paid upgrades/downgrades: create checkout session
    const sessionData = await SubscriptionService.createCheckoutSession(
      req.user._id,
      newPlanId,
      newCycle
    );

    res.json({
      success: true,
      requiresPayment: true,
      checkoutSession: sessionData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Cancel Subscription inside Dashboard
 * POST /api/subscriptions/cancel
 * Body: { reason }
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await SubscriptionService.cancelSubscription(req.user._id, reason);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Resume / Re-activate Subscription Auto-renewal
 * POST /api/subscriptions/resume
 */
const resumeSubscription = async (req, res, next) => {
  try {
    const result = await SubscriptionService.resumeSubscription(req.user._id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get Billing History / Invoices
 * GET /api/subscriptions/invoices
 */
const getBillingHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = { user: req.user._id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Invoice.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      invoices
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Download Official PDF Invoice
 * GET /api/subscriptions/invoices/:id/pdf
 */
const downloadInvoicePdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Search by invoiceNumber or ObjectId
    const query = id.startsWith('INV-')
      ? { invoiceNumber: id }
      : { _id: id };

    const invoice = await Invoice.findOne(query).populate('user', 'name email');

    if (!invoice) {
      res.statusCode = 404;
      return next(new Error('Invoice not found.'));
    }

    // Ensure user is authorized to download this invoice
    if (req.user.role !== 'admin' && invoice.user._id.toString() !== req.user._id.toString()) {
      res.statusCode = 403;
      return next(new Error('Unauthorized to access this invoice.'));
    }

    const subscription = await SubscriptionService.getUserSubscription(invoice.user._id);

    // Generate & Stream PDF
    InvoiceGenerator.generateInvoicePdf(invoice, invoice.user, subscription, res);
  } catch (error) {
    next(error);
  }
};

/**
 * 10. Webhook endpoint for Razorpay recurring subscription lifecycle
 * POST /api/subscriptions/webhook
 */
const handleSubscriptionWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const webhookSignature = req.headers['x-razorpay-signature'];

    if (webhookSecret && webhookSignature) {
      const isValid = verifyWebhookSignature(req.body, webhookSignature, webhookSecret);
      if (!isValid) {
        console.warn('⚠️ Subscription webhook signature mismatch.');
        return res.status(400).json({ status: 'error', message: 'Invalid webhook signature.' });
      }
    }

    const result = await SubscriptionService.handleWebhookEvent(req.body);
    res.json({ status: 'ok', ...result });
  } catch (error) {
    console.error('💥 Subscription Webhook Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
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
};
