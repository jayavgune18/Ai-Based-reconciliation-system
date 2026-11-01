const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  source: { 
    type: String, 
    enum: ['bank', 'internal', 'gateway', 'invoice'], 
    required: true, 
    index: true 
  },
  transactionId: { 
    type: String, 
    index: true,
    trim: true
  }, // External reference ID (e.g. Bank Ref No., UPI Ref, Gateway Txn ID)
  date: { 
    type: Date, 
    required: true, 
    index: true 
  },
  amount: { 
    type: Number, 
    required: true, 
    index: true 
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  category: { 
    type: String,
    default: 'General'
  },
  uploadJobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ReconciliationJob', 
    required: false,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['debit', 'credit'],
    default: 'debit'
  },
  status: { 
    type: String, 
    enum: ['unreconciled', 'reconciled', 'discrepancy'], 
    default: 'unreconciled',
    index: true
  }
}, { timestamps: true });

// Compiling index for compound query optimizations (amount + date search window)
TransactionSchema.index({ amount: 1, date: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
