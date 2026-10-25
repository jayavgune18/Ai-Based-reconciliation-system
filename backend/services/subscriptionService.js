const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { PLANS, getPlanById, calculatePlanPrice } = require('../config/plans');
const { razorpayInstance, isConfigured, verifySignature, keyId, keySecret } = require('../config/razorpay');

class SubscriptionService {
  /**
   * Get or initialize active subscription for a user
   * Auto-resets usage if 30-day period rolled over
   * @param {string} userId
   * @returns {Promise<Subscription>}
   */
  static async getUserSubscription(userId) {
    let subscription = await Subscription.findOne({ user: userId });

    if (!subscription) {
      const freePlan = PLANS.free;
      subscription = await Subscription.create({
        user: userId,
        planId: 'free',
        planName: freePlan.name,
        billingCycle: 'monthly',
        price: 0,
        currency: 'INR',
        status: 'active',
        autoRenew: true,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usage: {
          jobsUsedThisMonth: 0,
          jobsLimit: freePlan.limits.jobsPerMonth,
          transactionsProcessedThisMonth: 0,
          transactionsLimit: freePlan.limits.transactionsPerJob,
          aiChecksUsed: 0,
          aiChecksLimit: freePlan.limits.aiChecksPerMonth,
          lastResetDate: new Date()
        },
        history: [
          {
            action: 'created',
            toPlan: 'free',
            billingCycle: 'monthly',
            amount: 0,
            note: 'Free starter plan automatically initialized.'
          }
        ]
      });

      // Update User reference
      await User.findByIdAndUpdate(userId, {
        subscription: subscription._id,
        subscriptionTier: 'free'
      });
    } else {
      // Check if period rolled over to reset monthly counters
      const didReset = subscription.checkAndResetCycle();
      if (didReset) {
        await subscription.save();
      }
    }

    return subscription;
  }

  /**
   * Create Razorpay Checkout Session for Subscription / Plan Order
   * @param {string} userId
   * @param {string} planId
   * @param {string} cycle - 'monthly' | 'yearly'
   * @param {object} customerDetails
   * @returns {Promise<object>}
   */
  static async createCheckoutSession(userId, planId, cycle = 'monthly', customerDetails = {}) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found.');

    const planPriceInfo = calculatePlanPrice(planId, cycle);
    const plan = getPlanById(planId);

    if (planPriceInfo.price === 0) {
      throw new Error('Free plan does not require checkout. Activate directly.');
    }

    const receipt = `sub_rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let razorpayOrderId = null;
    let razorpaySubscriptionId = null;

    // Create live Razorpay Order or Subscription if live keys are present
    if (isConfigured() && razorpayInstance) {
      try {
        const order = await razorpayInstance.orders.create({
          amount: planPriceInfo.amountInPaise,
          currency: 'INR',
          receipt,
          notes: {
            userId: user._id.toString(),
            planId,
            planName: plan.name,
            cycle,
            type: 'subscription_purchase'
          }
        });
        razorpayOrderId = order.id;
      } catch (err) {
        console.warn('⚠️ Razorpay live order error, falling back to simulated order:', err.message);
        razorpayOrderId = `order_sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      }
    } else {
      // Sandbox fallback order for local/test development
      razorpayOrderId = `order_sub_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    return {
      orderId: razorpayOrderId,
      subscriptionId: razorpaySubscriptionId,
      amount: planPriceInfo.price,
      amountInPaise: planPriceInfo.amountInPaise,
      currency: 'INR',
      planId,
      planName: plan.name,
      cycle,
      keyId: process.env.RAZORPAY_KEY_ID || keyId,
      customerDetails: {
        name: customerDetails.name || user.name,
        email: customerDetails.email || user.email,
        contact: customerDetails.contact || '9876543210'
      }
    };
  }

  /**
   * Cryptographically verify payment and activate plan with instant limit upgrades
   * @param {string} userId
   * @param {object} verificationPayload
   * @returns {Promise<object>}
   */
  static async verifyAndActivateSubscription(userId, verificationPayload) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpay_subscription_id,
      planId,
      cycle = 'monthly',
      method = 'upi',
      customerDetails = {}
    } = verificationPayload;

    if (!razorpay_payment_id) {
      throw new Error('Razorpay Payment ID is required for verification.');
    }

    // 1. Cryptographic Signature Verification
    let isValid = false;
    if (razorpay_subscription_id) {
      // Recurring subscription signature check
      if (!isConfigured() && razorpay_signature?.startsWith('mock_sig_')) {
        isValid = true;
      } else {
        const generatedSig = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || keySecret)
          .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
          .digest('hex');
        isValid = generatedSig === razorpay_signature;
      }
    } else if (razorpay_order_id) {
      // Standard order signature check
      isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    } else {
      // Sandbox mode check
      isValid = !isConfigured() || razorpay_signature?.startsWith('mock_sig_');
    }

    if (!isValid) {
      throw new Error('Payment cryptographic signature verification failed! Possible tampering detected.');
    }

    const plan = getPlanById(planId);
    const planPriceInfo = calculatePlanPrice(planId, cycle);
    const user = await User.findById(userId);

    // 2. Fetch or create user subscription record
    let subscription = await Subscription.findOne({ user: userId });
    const previousPlan = subscription ? subscription.planId : 'free';

    const periodDays = cycle === 'yearly' ? 365 : 30;
    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

    if (!subscription) {
      subscription = new Subscription({ user: userId });
    }

    // 3. Activate Plan & Update Limits Instantly
    subscription.planId = plan.id;
    subscription.planName = plan.name;
    subscription.billingCycle = cycle;
    subscription.price = planPriceInfo.price;
    subscription.currency = 'INR';
    subscription.status = 'active';
    subscription.autoRenew = true;
    subscription.cancelAtPeriodEnd = false;
    subscription.razorpayPaymentId = razorpay_payment_id;
    subscription.razorpayOrderId = razorpay_order_id;
    if (razorpay_subscription_id) subscription.razorpaySubscriptionId = razorpay_subscription_id;
    subscription.currentPeriodStart = periodStart;
    subscription.currentPeriodEnd = periodEnd;

    // Instant limit updates based on tier
    subscription.usage.jobsLimit = plan.limits.jobsPerMonth;
    subscription.usage.transactionsLimit = plan.limits.transactionsPerJob;
    subscription.usage.aiChecksLimit = plan.limits.aiChecksPerMonth;
    subscription.usage.lastResetDate = periodStart;

    // Record in history log
    subscription.history.push({
      action: previousPlan === 'free' ? 'created' : 'upgraded',
      fromPlan: previousPlan,
      toPlan: plan.id,
      billingCycle: cycle,
      amount: planPriceInfo.price,
      paymentId: razorpay_payment_id,
      note: `Plan activated successfully via Razorpay Checkout (${method.toUpperCase()}).`,
      timestamp: new Date()
    });

    await subscription.save();

    // 4. Update User Model
    await User.findByIdAndUpdate(userId, {
      subscription: subscription._id,
      subscriptionTier: plan.id
    });

    // 5. Generate Official Tax Invoice Record
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const subtotal = Math.round((planPriceInfo.price / 1.18) * 100) / 100;
    const taxAmount = Math.round((planPriceInfo.price - subtotal) * 100) / 100;

    const invoice = await Invoice.create({
      invoiceNumber,
      user: userId,
      subscription: subscription._id,
      planId: plan.id,
      planName: plan.name,
      billingCycle: cycle,
      amount: planPriceInfo.price,
      amountInPaise: planPriceInfo.amountInPaise,
      subtotal,
      taxAmount,
      taxRatePercentage: 18,
      currency: 'INR',
      status: 'paid',
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpaySubscriptionId: razorpay_subscription_id,
      method,
      customerDetails: {
        name: customerDetails.name || user.name,
        email: customerDetails.email || user.email,
        contact: customerDetails.contact || '9876543210',
        company: customerDetails.company || 'Enterprise Account'
      },
      billingPeriod: {
        start: periodStart,
        end: periodEnd
      },
      paidAt: new Date(),
      receiptUrl: `/api/subscriptions/invoices/${invoiceNumber}/pdf`
    });

    // 6. Security Audit Log
    await AuditLog.create({
      userId,
      action: 'SUBSCRIPTION_ACTIVATED',
      details: {
        planId: plan.id,
        planName: plan.name,
        cycle,
        amount: planPriceInfo.price,
        invoiceNumber,
        paymentId: razorpay_payment_id,
        method
      },
      ipAddress: '0.0.0.0'
    });

    return {
      success: true,
      message: `Congratulations! ${plan.name} has been activated with new usage limits updated instantly.`,
      subscription,
      invoice
    };
  }

  /**
   * Cancel an active subscription
   * Soft cancellation: retains features until currentPeriodEnd
   * @param {string} userId
   * @param {string} reason
   * @returns {Promise<object>}
   */
  static async cancelSubscription(userId, reason = 'User requested cancellation') {
    const subscription = await Subscription.findOne({ user: userId });
    if (!subscription) throw new Error('Active subscription not found.');

    if (subscription.planId === 'free') {
      throw new Error('Free tier cannot be cancelled.');
    }

    // Cancel on Razorpay SDK if recurring subscription exists
    if (subscription.razorpaySubscriptionId && isConfigured() && razorpayInstance) {
      try {
        await razorpayInstance.subscriptions.cancel(subscription.razorpaySubscriptionId, {
          cancel_at_cycle_end: 1
        });
      } catch (rzpErr) {
        console.warn('⚠️ Razorpay subscription cancellation warning:', rzpErr.message);
      }
    }

    subscription.autoRenew = false;
    subscription.cancelAtPeriodEnd = true;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason;

    subscription.history.push({
      action: 'cancelled',
      fromPlan: subscription.planId,
      toPlan: 'free',
      billingCycle: subscription.billingCycle,
      note: `Subscription cancelled. Access retained until ${subscription.currentPeriodEnd.toLocaleDateString('en-IN')}. Reason: ${reason}`,
      timestamp: new Date()
    });

    await subscription.save();

    await AuditLog.create({
      userId,
      action: 'SUBSCRIPTION_CANCELLED',
      details: {
        planId: subscription.planId,
        reason,
        accessUntil: subscription.currentPeriodEnd
      }
    });

    return {
      success: true,
      message: `Your subscription has been cancelled. You will continue to have access to ${subscription.planName} features until ${subscription.currentPeriodEnd.toLocaleDateString('en-IN')}.`,
      subscription
    };
  }

  /**
   * Resume/Re-activate Auto-Renewal for a cancelled subscription before period end
   * @param {string} userId
   * @returns {Promise<object>}
   */
  static async resumeSubscription(userId) {
    const subscription = await Subscription.findOne({ user: userId });
    if (!subscription) throw new Error('Subscription not found.');

    subscription.autoRenew = true;
    subscription.cancelAtPeriodEnd = false;
    subscription.cancelledAt = null;
    subscription.cancellationReason = null;
    subscription.status = 'active';

    subscription.history.push({
      action: 'resumed',
      fromPlan: subscription.planId,
      toPlan: subscription.planId,
      billingCycle: subscription.billingCycle,
      note: 'Auto-renewal re-activated by customer.',
      timestamp: new Date()
    });

    await subscription.save();

    return {
      success: true,
      message: `Subscription auto-renewal re-activated successfully! Your next billing date is ${subscription.currentPeriodEnd.toLocaleDateString('en-IN')}.`,
      subscription
    };
  }

  /**
   * Handle Webhook Events Asynchronously
   * Supports recurring renewals, halts, activations, and cancellations
   * @param {object} event - Razorpay Webhook Event Body
   * @returns {Promise<object>}
   */
  static async handleWebhookEvent(event) {
    const eventType = event.event;
    console.log(`🔔 Subscription Webhook Processing Event: ${eventType}`);

    if (eventType === 'subscription.charged') {
      // Recurring subscription charge succeeded!
      const subEntity = event.payload?.subscription?.entity;
      const paymentEntity = event.payload?.payment?.entity;

      if (subEntity) {
        const subId = subEntity.id;
        const subscription = await Subscription.findOne({ razorpaySubscriptionId: subId });

        if (subscription) {
          // Extend period
          const cycleDays = subscription.billingCycle === 'yearly' ? 365 : 30;
          subscription.currentPeriodStart = new Date();
          subscription.currentPeriodEnd = new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000);
          subscription.status = 'active';

          // Reset monthly quota
          subscription.usage.jobsUsedThisMonth = 0;
          subscription.usage.transactionsProcessedThisMonth = 0;
          subscription.usage.aiChecksUsed = 0;
          subscription.usage.lastResetDate = new Date();

          subscription.history.push({
            action: 'renewed',
            fromPlan: subscription.planId,
            toPlan: subscription.planId,
            billingCycle: subscription.billingCycle,
            amount: paymentEntity?.amount ? paymentEntity.amount / 100 : subscription.price,
            paymentId: paymentEntity?.id,
            note: 'Recurring subscription auto-renewed via webhook charge.',
            timestamp: new Date()
          });

          await subscription.save();

          // Generate Renewal Invoice
          const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
          const amount = paymentEntity?.amount ? paymentEntity.amount / 100 : subscription.price;
          const subtotal = Math.round((amount / 1.18) * 100) / 100;
          const taxAmount = Math.round((amount - subtotal) * 100) / 100;

          await Invoice.create({
            invoiceNumber,
            user: subscription.user,
            subscription: subscription._id,
            planId: subscription.planId,
            planName: subscription.planName,
            billingCycle: subscription.billingCycle,
            amount,
            amountInPaise: Math.round(amount * 100),
            subtotal,
            taxAmount,
            taxRatePercentage: 18,
            currency: 'INR',
            status: 'paid',
            razorpayPaymentId: paymentEntity?.id || `pay_wh_${Date.now()}`,
            razorpayOrderId: paymentEntity?.order_id,
            razorpaySubscriptionId: subId,
            method: paymentEntity?.method || 'recurring_mandate',
            billingPeriod: {
              start: subscription.currentPeriodStart,
              end: subscription.currentPeriodEnd
            },
            paidAt: new Date()
          });
        }
      }
    } else if (eventType === 'subscription.cancelled') {
      const subEntity = event.payload?.subscription?.entity;
      if (subEntity?.id) {
        await Subscription.findOneAndUpdate(
          { razorpaySubscriptionId: subEntity.id },
          {
            status: 'cancelled',
            autoRenew: false,
            cancelAtPeriodEnd: true,
            cancelledAt: new Date(),
            cancellationReason: 'Cancelled via Razorpay Webhook notification'
          }
        );
      }
    } else if (eventType === 'subscription.halted') {
      const subEntity = event.payload?.subscription?.entity;
      if (subEntity?.id) {
        await Subscription.findOneAndUpdate(
          { razorpaySubscriptionId: subEntity.id },
          {
            status: 'past_due',
            autoRenew: false
          }
        );
      }
    }

    return { received: true, event: eventType };
  }
}

module.exports = SubscriptionService;
