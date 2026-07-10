/**
 * Service to analyze transactions for fraudulent and suspicious behavior.
 * Implements Velocity Checks, Duplicate Debits, and Statistical Outlier (Z-Score) analysis.
 */
class FraudDetectorService {
  /**
   * Run full fraud analysis suite on a set of transactions
   * @param {Array} transactions - Array of transaction documents
   * @returns {Array} Alerts flagged
   */
  static analyze(transactions) {
    if (!transactions || transactions.length === 0) return [];

    const alerts = [];
    const duplicates = this.detectDuplicates(transactions);
    const velocitySpikes = this.detectVelocitySpikes(transactions);
    const outliers = this.detectOutliers(transactions);

    return [...duplicates, ...velocitySpikes, ...outliers];
  }

  /**
   * Detects duplicate transfers (identical amounts, descriptions, and day)
   */
  static detectDuplicates(transactions) {
    const alerts = [];
    const seen = new Map();

    for (const txn of transactions) {
      if (!txn.date || isNaN(new Date(txn.date).getTime())) continue; // Skip invalid dates
      const dateStr = new Date(txn.date).toISOString().split('T')[0]; // Compare just the date
      // Unique key: amount + normalized description + date
      const normalizedDesc = txn.description.toLowerCase().replace(/[^a-z0-9]/g, '');
      const key = `${Math.abs(txn.amount)}_${normalizedDesc}_${dateStr}`;

      if (seen.has(key)) {
        const primaryTxn = seen.get(key);
        alerts.push({
          type: 'duplicate_transfer',
          severity: 'high',
          message: `Suspicious identical transfer detected within 24 hours. Possibility of double debit.`,
          primaryTransaction: primaryTxn,
          flaggedTransaction: txn,
          details: {
            amount: txn.amount,
            description: txn.description,
            date: dateStr
          }
        });
      } else {
        seen.set(key, txn);
      }
    }

    return alerts;
  }

  /**
   * Detects velocity spikes (multiple identical transfers in short timeframe)
   */
  static detectVelocitySpikes(transactions) {
    const alerts = [];
    
    // Filter out transactions with invalid dates before sorting
    const valid = transactions.filter(t => t.date && !isNaN(new Date(t.date).getTime()));
    if (valid.length < 3) return [];
    
    // Sort transactions by date ascending
    const sorted = [...valid].sort((a, b) => new Date(a.date) - new Date(b.date));
    const WINDOW_MS = 60 * 60 * 1000; // 1-hour window

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const cluster = [current];

      for (let j = i + 1; j < sorted.length; j++) {
        const next = sorted[j];
        const timeDiff = new Date(next.date) - new Date(current.date);

        if (timeDiff > WINDOW_MS) break; // Beyond window limit

        // If descriptions are fuzzy matched and amounts are similar, add to cluster
        const normalizedA = current.description.toLowerCase().replace(/[^a-z]/g, '');
        const normalizedB = next.description.toLowerCase().replace(/[^a-z]/g, '');
        
        if (Math.abs(current.amount - next.amount) < 0.01 && normalizedA === normalizedB) {
          cluster.push(next);
        }
      }

      if (cluster.length >= 3) {
        alerts.push({
          type: 'velocity_spike',
          severity: 'critical',
          message: `High frequency velocity spike flagged. ${cluster.length} identical transactions occurred within 1 hour.`,
          details: {
            amount: current.amount,
            description: current.description,
            frequency: cluster.length,
            timeframe: '1 hour'
          },
          transactions: cluster
        });
        // Skip ahead to avoid duplicate alerts for the same cluster
        i += (cluster.length - 1);
      }
    }

    return alerts;
  }

  /**
   * Statistical Outliers detection using standard deviation (Z-Score > 2.5)
   */
  static detectOutliers(transactions) {
    const alerts = [];
    const amounts = transactions.map(t => Math.abs(t.amount));
    if (amounts.length < 5) return []; // Require minimum baseline size

    // Compute mean
    const total = amounts.reduce((sum, val) => sum + val, 0);
    const mean = total / amounts.length;

    // Compute standard deviation
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return [];

    for (const txn of transactions) {
      const amt = Math.abs(txn.amount);
      const zScore = (amt - mean) / stdDev;

      if (zScore > 2.5) { // 2.5 std deviations from mean (typically top 1% of transactions)
        alerts.push({
          type: 'unusual_amount',
          severity: 'medium',
          message: `Outlier transaction flagged. Amount of $${txn.amount} deviates significantly from job average ($${mean.toFixed(2)}).`,
          details: {
            amount: txn.amount,
            average: mean,
            zScore: zScore.toFixed(2)
          },
          primaryTransaction: txn
        });
      }
    }

    return alerts;
  }
}

module.exports = FraudDetectorService;
