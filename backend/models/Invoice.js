const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      index: true
    },
    planId: {
      type: String,
      required: true,
      index: true
    },
    planName: {
      type: String,
      required: true
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    amountInPaise: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    taxRatePercentage: {
      type: Number,
      default: 18 // 18% GST standard in India
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true
    },
    status: {
      type: String,
      enum: ['paid', 'pending', 'failed', 'refunded'],
      default: 'paid',
      index: true
    },
    razorpayPaymentId: {
      type: String,
      index: true,
      sparse: true,
      trim: true
    },
    razorpayOrderId: {
      type: String,
      index: true,
      sparse: true,
      trim: true
    },
    razorpaySubscriptionId: {
      type: String,
      sparse: true,
      trim: true
    },
    method: {
      type: String,
      default: 'card',
      trim: true
    },
    customerDetails: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      contact: { type: String, trim: true },
      company: { type: String, trim: true },
      gstin: { type: String, trim: true }
    },
    billingPeriod: {
      start: { type: Date, default: Date.now },
      end: { type: Date }
    },
    paidAt: {
      type: Date,
      default: Date.now
    },
    receiptUrl: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast history querying
InvoiceSchema.index({ user: 1, createdAt: -1 });
InvoiceSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', InvoiceSchema);
