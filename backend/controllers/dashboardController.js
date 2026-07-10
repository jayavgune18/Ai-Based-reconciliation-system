const Transaction = require('../models/Transaction');
const ReconciliationMatch = require('../models/ReconciliationMatch');
const ReconciliationJob = require('../models/ReconciliationJob');
const AuditLog = require('../models/AuditLog');
const FraudDetectorService = require('../services/fraudDetector');

/**
 * Fetch general statistics for the dashboard UI
 */
const getStats = async (req, res, next) => {
  try {
    const totalJobs = await ReconciliationJob.countDocuments({});
    
    // Aggregated stats
    const totalTransactions = await Transaction.countDocuments({});
    const matchedCount = await Transaction.countDocuments({ status: 'reconciled' });
    const unmatchedCount = await Transaction.countDocuments({ status: 'unreconciled' });
    const discrepancyCount = await Transaction.countDocuments({ status: 'discrepancy' });

    // Accuracy Rate (Matched / Total * 100)
    const accuracy = totalTransactions > 0 ? Math.round((matchedCount / totalTransactions) * 100) : 0;

    // Monthly volume breakdown mock (for beautiful chart renders)
    const chartData = [
      { month: 'Jan', processed: 4200, matched: 3900, discrepancies: 300 },
      { month: 'Feb', processed: 5100, matched: 4800, discrepancies: 300 },
      { month: 'Mar', processed: 6300, matched: 5900, discrepancies: 400 },
      { month: 'Apr', processed: 8200, matched: 7900, discrepancies: 300 },
      { month: 'May', processed: totalTransactions || 10, matched: matchedCount || 8, discrepancies: discrepancyCount || 2 }
    ];

    res.json({
      success: true,
      stats: {
        totalJobs,
        totalTransactions,
        matchedCount,
        unmatchedCount,
        discrepancyCount,
        accuracyRate: accuracy
      },
      chartData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Real-time analytical scan to fetch all Fraud Warnings
 */
const getFraudAlerts = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({});
    // Run full risk heuristics
    let alerts = [];
    try {
      alerts = FraudDetectorService.analyze(transactions);
    } catch (analysisError) {
      console.error('Fraud analysis engine error:', analysisError.message);
      return res.status(500).json({
        success: false,
        message: 'Fraud analysis engine encountered an error. Please check transaction data integrity.',
        error: process.env.NODE_ENV === 'development' ? analysisError.message : undefined
      });
    }

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch system audit trails
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({})
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getFraudAlerts,
  getAuditLogs
};
