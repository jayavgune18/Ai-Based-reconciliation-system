const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    paymentId: {
      type: String,
      index: true,
      sparse: true,
      trim: true
    },
    signature: {
      type: String,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      index: true
    },
    amountInPaise: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['created', 'attempted', 'captured', 'failed', 'refunded'],
      default: 'created',
      index: true
    },
    method: {
      type: String,
      default: 'unknown',
      trim: true
    },
    description: {
      type: String,
      default: 'Financial Reconciliation Service Payment',
      trim: true
    },
    receipt: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true
    },
    customerDetails: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      contact: { type: String, trim: true }
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    errorDetails: {
      code: { type: String },
      description: { type: String },
      source: { type: String },
      step: { type: String },
      reason: { type: String }
    },
    refundDetails: {
      refundId: { type: String },
      amount: { type: Number },
      status: { type: String },
      createdAt: { type: Date }
    },
    reconciliationStatus: {
      type: String,
      enum: ['unreconciled', 'matched', 'mismatched', 'duplicate', 'unmatched'],
      default: 'unreconciled',
      index: true
    },
    reconciliationNotes: {
      type: String,
      trim: true
    },
    reconciledWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    reconciledAt: {
      type: Date
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying payments by status and date range
PaymentSchema.index({ status: 1, transactionDate: -1 });
PaymentSchema.index({ reconciliationStatus: 1, transactionDate: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);
