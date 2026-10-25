const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    planId: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
      index: true
    },
    planName: {
      type: String,
      default: 'Free Starter'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    price: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'past_due', 'paused', 'expired'],
      default: 'active',
      index: true
    },
    razorpaySubscriptionId: {
      type: String,
      sparse: true,
      index: true
    },
    razorpayPlanId: {
      type: String,
      sparse: true
    },
    razorpayCustomerId: {
      type: String,
      sparse: true
    },
    razorpayPaymentId: {
      type: String,
      sparse: true
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    autoRenew: {
      type: Boolean,
      default: true
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String,
      trim: true
    },
    usage: {
      jobsUsedThisMonth: {
        type: Number,
        default: 0,
        min: 0
      },
      jobsLimit: {
        type: Number,
        default: 5
      },
      transactionsProcessedThisMonth: {
        type: Number,
        default: 0,
        min: 0
      },
      transactionsLimit: {
        type: Number,
        default: 200
      },
      aiChecksUsed: {
        type: Number,
        default: 0,
        min: 0
      },
      aiChecksLimit: {
        type: Number,
        default: 10
      },
      lastResetDate: {
        type: Date,
        default: Date.now
      }
    },
    history: [
      {
        action: {
          type: String,
          enum: ['created', 'upgraded', 'downgraded', 'renewed', 'cancelled', 'resumed', 'limit_reset'],
          required: true
        },
        fromPlan: String,
        toPlan: String,
        billingCycle: String,
        amount: Number,
        paymentId: String,
        note: String,
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Method to check and auto-reset monthly counters if period expired
SubscriptionSchema.methods.checkAndResetCycle = function () {
  const now = new Date();
  const resetInterval = this.billingCycle === 'yearly' ? 30 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  
  // Reset monthly usage counters if 30+ days have passed since lastResetDate
  if (this.usage.lastResetDate && (now.getTime() - new Date(this.usage.lastResetDate).getTime() >= resetInterval)) {
    this.usage.jobsUsedThisMonth = 0;
    this.usage.transactionsProcessedThisMonth = 0;
    this.usage.aiChecksUsed = 0;
    this.usage.lastResetDate = now;
    this.history.push({
      action: 'limit_reset',
      fromPlan: this.planId,
      toPlan: this.planId,
      billingCycle: this.billingCycle,
      note: 'Automatic monthly usage quota reset.',
      timestamp: now
    });
    return true;
  }
  return false;
};

module.exports = mongoose.model('Subscription', SubscriptionSchema);
