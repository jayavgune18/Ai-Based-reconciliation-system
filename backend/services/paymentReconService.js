const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');

class PaymentReconService {
  /**
   * Run automated financial reconciliation between Payment Gateway and Internal Records.
   * Compares Razorpay Payments with internal Transactions.
   *
   * @param {Object} options - Filtering options (startDate, endDate, jobId)
   * @returns {Object} Reconciliation results, statistics, and categorized items
   */
  static async runReconciliation(options = {}) {
    const { startDate, endDate } = options;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.transactionDate = {};
      if (startDate) dateFilter.transactionDate.$gte = new Date(startDate);
      if (endDate) dateFilter.transactionDate.$lte = new Date(endDate);
    }

    // 1. Fetch Gateway Payments (captured or attempted)
    const gatewayPayments = await Payment.find({
      status: { $in: ['captured', 'refunded', 'failed'] },
      ...(dateFilter.transactionDate ? { createdAt: dateFilter.transactionDate } : {})
    }).sort({ createdAt: -1 });

    // 2. Fetch Internal Ledger Records (source: internal or invoice)
    const internalRecords = await Transaction.find({
      source: { $in: ['internal', 'invoice'] },
      ...(dateFilter.transactionDate ? { date: dateFilter.transactionDate } : {})
    }).sort({ date: -1 });

    const matched = [];
    const amountMismatched = [];
    const duplicates = [];
    const unmatchedGateway = [];
    const unmatchedInternal = [];

    // Helper map to track internal usage and detect duplicate payments
    const internalUsageMap = new Map();
    const matchedInternalIds = new Set();
    const matchedPaymentIds = new Set();

    // 3. First Pass: Detect Duplicates & Matches by Order ID / Receipt / Transaction ID
    // Group gateway payments by their reference (receipt or orderId)
    const gatewayByRef = new Map();

    gatewayPayments.forEach(payment => {
      const refKey = payment.receipt || payment.orderId;
      if (refKey) {
        if (!gatewayByRef.has(refKey)) {
          gatewayByRef.set(refKey, []);
        }
        gatewayByRef.get(refKey).push(payment);
      }
    });

    // Check for duplicate gateway payments for the same reference
    for (const [refKey, payments] of gatewayByRef.entries()) {
      const capturedPayments = payments.filter(p => p.status === 'captured');
      if (capturedPayments.length > 1) {
        // Flag duplicates
        capturedPayments.forEach((p, idx) => {
          duplicates.push({
            id: `DUP-${p._id}`,
            gatewayPayment: p,
            duplicateCount: capturedPayments.length,
            referenceKey: refKey,
            description: `Duplicate captured gateway charge (#${idx + 1} of ${capturedPayments.length}) for reference ${refKey}`,
            severity: 'HIGH',
            status: 'DUPLICATE'
          });
          matchedPaymentIds.add(p._id.toString());
        });
      }
    }

    // 4. Match Gateway Payments against Internal Records
    for (const payment of gatewayPayments) {
      if (matchedPaymentIds.has(payment._id.toString())) {
        continue; // Handled in duplicates
      }

      // Find matching internal record
      // Match strategy:
      // A: Direct reference match (payment.receipt === txn.transactionId OR payment.orderId === txn.transactionId)
      // B: Exact amount match within ±3 days window with similar customer or description
      let internalMatch = internalRecords.find(intTxn => {
        if (matchedInternalIds.has(intTxn._id.toString())) return false;
        
        const isRefMatch = (
          (payment.receipt && intTxn.transactionId && intTxn.transactionId.toLowerCase() === payment.receipt.toLowerCase()) ||
          (payment.orderId && intTxn.transactionId && intTxn.transactionId.toLowerCase() === payment.orderId.toLowerCase()) ||
          (payment.paymentId && intTxn.transactionId && intTxn.transactionId.toLowerCase() === payment.paymentId.toLowerCase())
        );

        return isRefMatch;
      });

      // Fallback Strategy B: Heuristic Match on Exact Amount & Proximity if not matched by reference
      if (!internalMatch && payment.status === 'captured') {
        internalMatch = internalRecords.find(intTxn => {
          if (matchedInternalIds.has(intTxn._id.toString())) return false;
          
          const amountDiff = Math.abs(Math.abs(intTxn.amount) - payment.amount);
          if (amountDiff > 0.01) return false;

          // Check date window (within 3 days)
          const pDate = new Date(payment.transactionDate || payment.createdAt);
          const iDate = new Date(intTxn.date);
          const diffDays = Math.abs(pDate - iDate) / (1000 * 60 * 60 * 24);

          return diffDays <= 3;
        });
      }

      if (internalMatch) {
        matchedInternalIds.add(internalMatch._id.toString());
        matchedPaymentIds.add(payment._id.toString());

        const internalAmount = Math.abs(internalMatch.amount);
        const gatewayAmount = payment.amount;
        const delta = Number((gatewayAmount - internalAmount).toFixed(2));

        if (Math.abs(delta) > 0.01) {
          // Amount Mismatch Discrepancy
          amountMismatched.push({
            id: `MIS-${payment._id}`,
            gatewayPayment: payment,
            internalRecord: internalMatch,
            gatewayAmount,
            internalAmount,
            discrepancyDelta: delta,
            matchType: 'AMOUNT_MISMATCH',
            explanation: `Amount discrepancy: Razorpay Gateway captured ₹${gatewayAmount.toFixed(2)}, but internal ledger expected ₹${internalAmount.toFixed(2)} (Difference: ₹${delta.toFixed(2)}).`,
            confidenceScore: 75,
            status: 'mismatched'
          });

          // Update MongoDB Payment status
          await Payment.findByIdAndUpdate(payment._id, {
            reconciliationStatus: 'mismatched',
            reconciledWith: internalMatch._id,
            reconciledAt: new Date(),
            reconciliationNotes: `Amount mismatch: ₹${gatewayAmount} vs ₹${internalAmount}`
          });
        } else {
          // Exact Match
          matched.push({
            id: `MAT-${payment._id}`,
            gatewayPayment: payment,
            internalRecord: internalMatch,
            amount: gatewayAmount,
            matchType: 'EXACT',
            confidenceScore: 100,
            explanation: `Verified Match: Razorpay payment ${payment.paymentId || payment.orderId} matched internal record ${internalMatch.transactionId || internalMatch.description}.`,
            status: 'matched'
          });

          // Update MongoDB Payment status
          await Payment.findByIdAndUpdate(payment._id, {
            reconciliationStatus: 'matched',
            reconciledWith: internalMatch._id,
            reconciledAt: new Date(),
            reconciliationNotes: 'Exact reconciliation verified with internal record'
          });
        }
      } else {
        // Unmatched Gateway Payment (Orphan charge)
        unmatchedGateway.push({
          id: `UGW-${payment._id}`,
          gatewayPayment: payment,
          amount: payment.amount,
          status: payment.status,
          matchType: 'UNMATCHED_GATEWAY',
          explanation: `Payment of ₹${payment.amount} collected on Razorpay (${payment.paymentId || payment.orderId}) without corresponding internal order record.`,
          confidenceScore: 0
        });

        await Payment.findByIdAndUpdate(payment._id, {
          reconciliationStatus: 'unmatched',
          reconciliationNotes: 'Orphan gateway payment - no matching internal record found'
        });
      }
    }

    // 5. Detect Unmatched Internal Records (Ledger entries with no gateway payment)
    for (const internalTxn of internalRecords) {
      if (!matchedInternalIds.has(internalTxn._id.toString())) {
        unmatchedInternal.push({
          id: `UINT-${internalTxn._id}`,
          internalRecord: internalTxn,
          amount: Math.abs(internalTxn.amount),
          date: internalTxn.date,
          matchType: 'UNMATCHED_INTERNAL',
          explanation: `Internal record for ₹${Math.abs(internalTxn.amount)} (${internalTxn.transactionId || internalTxn.description}) was not received on Razorpay gateway.`,
          confidenceScore: 0
        });
      }
    }

    // 6. Aggregate Summary Statistics
    const totalGatewayAmount = gatewayPayments.reduce((acc, p) => acc + (p.status === 'captured' ? p.amount : 0), 0);
    const totalInternalAmount = internalRecords.reduce((acc, i) => acc + Math.abs(i.amount), 0);
    const matchedAmount = matched.reduce((acc, m) => acc + m.amount, 0);

    const totalRecords = gatewayPayments.length + internalRecords.length;
    const matchRate = totalRecords > 0 
      ? Number(((matched.length * 2 / totalRecords) * 100).toFixed(1)) 
      : 100;

    const stats = {
      totalGatewayTransactions: gatewayPayments.length,
      totalInternalTransactions: internalRecords.length,
      matchedCount: matched.length,
      amountMismatchCount: amountMismatched.length,
      duplicateCount: duplicates.length,
      unmatchedGatewayCount: unmatchedGateway.length,
      unmatchedInternalCount: unmatchedInternal.length,
      totalGatewayAmount: Number(totalGatewayAmount.toFixed(2)),
      totalInternalAmount: Number(totalInternalAmount.toFixed(2)),
      matchedAmount: Number(matchedAmount.toFixed(2)),
      matchRate: Math.min(100, matchRate),
      reconciledAt: new Date().toISOString()
    };

    return {
      success: true,
      stats,
      matched,
      amountMismatched,
      duplicates,
      unmatchedGateway,
      unmatchedInternal
    };
  }

  /**
   * Generates a comprehensive Multi-Sheet Excel Reconciliation Report
   *
   * @param {Object} reconData - Output from runReconciliation
   * @returns {Buffer} Excel Workbook buffer
   */
  static generateExcelReport(reconData) {
    const workbook = xlsx.utils.book_new();
    const { stats, matched, amountMismatched, duplicates, unmatchedGateway, unmatchedInternal } = reconData;

    // Sheet 1: Executive Summary
    const summaryData = [
      { Metric: 'Report Title', Value: 'Payment Gateway Financial Reconciliation Audit' },
      { Metric: 'Generated Date', Value: new Date().toLocaleString() },
      { Metric: 'Reconciliation Match Rate', Value: `${stats.matchRate}%` },
      { Metric: 'Total Gateway Transactions', Value: stats.totalGatewayTransactions },
      { Metric: 'Total Internal Ledger Records', Value: stats.totalInternalTransactions },
      { Metric: 'Total Gateway Volume (INR)', Value: `₹${stats.totalGatewayAmount}` },
      { Metric: 'Total Internal Expected Volume (INR)', Value: `₹${stats.totalInternalAmount}` },
      { Metric: 'Reconciled Amount (INR)', Value: `₹${stats.matchedAmount}` },
      { Metric: 'Exact Matched Transactions', Value: stats.matchedCount },
      { Metric: 'Amount Mismatch Discrepancies', Value: stats.amountMismatchCount },
      { Metric: 'Duplicate Gateway Charges', Value: stats.duplicateCount },
      { Metric: 'Unmatched Gateway (Orphan)', Value: stats.unmatchedGatewayCount },
      { Metric: 'Unmatched Internal (Pending)', Value: stats.unmatchedInternalCount }
    ];
    const summarySheet = xlsx.utils.json_to_sheet(summaryData);
    xlsx.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

    // Sheet 2: Matched Transactions
    const matchedRows = matched.map((m, idx) => ({
      Index: idx + 1,
      'Payment ID': m.gatewayPayment.paymentId || 'N/A',
      'Order ID': m.gatewayPayment.orderId,
      'Internal Ref ID': m.internalRecord.transactionId || 'N/A',
      'Customer Name': m.gatewayPayment.customerDetails?.name || 'N/A',
      'Amount (INR)': m.amount,
      'Payment Method': m.gatewayPayment.method?.toUpperCase() || 'ONLINE',
      'Gateway Date': new Date(m.gatewayPayment.transactionDate || m.gatewayPayment.createdAt).toLocaleDateString(),
      'Internal Date': new Date(m.internalRecord.date).toLocaleDateString(),
      'Status': 'RECONCILED',
      'Confidence': `${m.confidenceScore}%`,
      'Audit Notes': m.explanation
    }));
    const matchedSheet = xlsx.utils.json_to_sheet(matchedRows.length ? matchedRows : [{ Message: 'No matched records' }]);
    xlsx.utils.book_append_sheet(workbook, matchedSheet, 'Matched Records');

    // Sheet 3: Amount Mismatches
    const mismatchRows = amountMismatched.map((m, idx) => ({
      Index: idx + 1,
      'Payment ID': m.gatewayPayment.paymentId || 'N/A',
      'Order ID': m.gatewayPayment.orderId,
      'Internal Ref ID': m.internalRecord.transactionId || 'N/A',
      'Gateway Amount': m.gatewayAmount,
      'Internal Amount': m.internalAmount,
      'Discrepancy Delta (INR)': m.discrepancyDelta,
      'Severity': Math.abs(m.discrepancyDelta) > 500 ? 'HIGH' : 'MEDIUM',
      'Gateway Date': new Date(m.gatewayPayment.transactionDate || m.gatewayPayment.createdAt).toLocaleDateString(),
      'Explanation': m.explanation
    }));
    const mismatchSheet = xlsx.utils.json_to_sheet(mismatchRows.length ? mismatchRows : [{ Message: 'No amount mismatches detected' }]);
    xlsx.utils.book_append_sheet(workbook, mismatchSheet, 'Amount Mismatches');

    // Sheet 4: Duplicate Charges
    const duplicateRows = duplicates.map((d, idx) => ({
      Index: idx + 1,
      'Payment ID': d.gatewayPayment.paymentId || 'N/A',
      'Order ID': d.gatewayPayment.orderId,
      'Reference Key': d.referenceKey,
      'Amount (INR)': d.gatewayPayment.amount,
      'Severity': d.severity,
      'Description': d.description,
      'Date': new Date(d.gatewayPayment.transactionDate || d.gatewayPayment.createdAt).toLocaleDateString()
    }));
    const duplicateSheet = xlsx.utils.json_to_sheet(duplicateRows.length ? duplicateRows : [{ Message: 'No duplicate payments found' }]);
    xlsx.utils.book_append_sheet(workbook, duplicateSheet, 'Duplicate Charges');

    // Sheet 5: Unmatched Gateway
    const unmatchedGwRows = unmatchedGateway.map((u, idx) => ({
      Index: idx + 1,
      'Payment ID': u.gatewayPayment.paymentId || 'N/A',
      'Order ID': u.gatewayPayment.orderId,
      'Amount (INR)': u.amount,
      'Gateway Status': u.status.toUpperCase(),
      'Customer Email': u.gatewayPayment.customerDetails?.email || 'N/A',
      'Date': new Date(u.gatewayPayment.transactionDate || u.gatewayPayment.createdAt).toLocaleDateString(),
      'Explanation': u.explanation
    }));
    const unmatchedGwSheet = xlsx.utils.json_to_sheet(unmatchedGwRows.length ? unmatchedGwRows : [{ Message: 'No unmatched gateway payments' }]);
    xlsx.utils.book_append_sheet(workbook, unmatchedGwSheet, 'Unmatched Gateway');

    // Sheet 6: Unmatched Internal
    const unmatchedIntRows = unmatchedInternal.map((u, idx) => ({
      Index: idx + 1,
      'Internal Txn ID': u.internalRecord.transactionId || 'N/A',
      'Description': u.internalRecord.description,
      'Expected Amount (INR)': u.amount,
      'Recorded Date': new Date(u.date).toLocaleDateString(),
      'Category': u.internalRecord.category || 'General',
      'Explanation': u.explanation
    }));
    const unmatchedIntSheet = xlsx.utils.json_to_sheet(unmatchedIntRows.length ? unmatchedIntRows : [{ Message: 'No unmatched internal records' }]);
    xlsx.utils.book_append_sheet(workbook, unmatchedIntSheet, 'Unmatched Internal');

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Generates a beautifully formatted PDF Audit Report using PDFKit
   *
   * @param {Object} reconData - Output from runReconciliation
   * @param {WritableStream} res - Express response stream
   */
  static generatePdfReport(reconData, res) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    const { stats, matched, amountMismatched, duplicates, unmatchedGateway, unmatchedInternal } = reconData;

    // 1. Header Banner
    doc.rect(40, 40, 515, 60).fill('#0F172A'); // Slate-900
    doc.fillColor('#FFFFFF').fontSize(18).text('FINANCIAL RECONCILIATION AUDIT REPORT', 55, 52);
    doc.fillColor('#38BDF8').fontSize(9).text('Payment Gateway (Razorpay) vs Internal Financial Ledger', 55, 75);
    doc.fillColor('#94A3B8').fontSize(8).text(`Generated: ${new Date().toLocaleString()}`, 390, 75);

    // 2. Executive KPI Summary Cards
    let y = 115;
    doc.fillColor('#0F172A').fontSize(12).text('1. Executive Reconciliation Summary', 40, y);
    y += 18;

    // Draw 4 Metric Box Containers
    const boxWidth = 120;
    const boxHeight = 50;
    const gap = 12;

    const kpis = [
      { label: 'Match Rate', val: `${stats.matchRate}%`, color: stats.matchRate >= 90 ? '#10B981' : '#F59E0B' },
      { label: 'Gateway Volume', val: `₹${stats.totalGatewayAmount}`, color: '#0284C7' },
      { label: 'Matched Records', val: `${stats.matchedCount}`, color: '#10B981' },
      { label: 'Discrepancies', val: `${stats.amountMismatchCount + stats.duplicateCount}`, color: '#EF4444' }
    ];

    kpis.forEach((kpi, i) => {
      const bx = 40 + i * (boxWidth + gap);
      doc.rect(bx, y, boxWidth, boxHeight).fill('#F8FAFC');
      doc.rect(bx, y, boxWidth, boxHeight).strokeColor('#E2E8F0').stroke();
      doc.fillColor('#64748B').fontSize(8).text(kpi.label, bx + 10, y + 8);
      doc.fillColor(kpi.color).fontSize(14).text(kpi.val, bx + 10, y + 24);
    });

    y += boxHeight + 20;

    // 3. Discrepancy Breakdown Table (Amount Mismatches & Duplicates)
    doc.fillColor('#0F172A').fontSize(12).text('2. Discrepancy & Flagged Exceptions', 40, y);
    y += 18;

    // Header row
    doc.rect(40, y, 515, 20).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(8);
    doc.text('Issue Type', 45, y + 6, { width: 90 });
    doc.text('Reference / Order ID', 140, y + 6, { width: 130 });
    doc.text('Gateway ₹', 280, y + 6, { width: 65 });
    doc.text('Internal ₹', 350, y + 6, { width: 65 });
    doc.text('Discrepancy / Action', 420, y + 6, { width: 130 });
    y += 20;

    const discrepancyList = [
      ...amountMismatched.map(m => ({
        type: 'AMOUNT MISMATCH',
        ref: m.gatewayPayment.orderId || m.gatewayPayment.receipt || 'N/A',
        gw: `₹${m.gatewayAmount}`,
        int: `₹${m.internalAmount}`,
        detail: `Delta: ₹${m.discrepancyDelta}`,
        color: '#DC2626'
      })),
      ...duplicates.map(d => ({
        type: 'DUPLICATE CHARGE',
        ref: d.referenceKey,
        gw: `₹${d.gatewayPayment.amount}`,
        int: 'Multiple',
        detail: 'Charge repeated on gateway',
        color: '#EA580C'
      }))
    ];

    if (discrepancyList.length === 0) {
      doc.rect(40, y, 515, 22).fill('#F0FDF4');
      doc.fillColor('#166534').fontSize(8).text('✅ No discrepancies or duplicate payments detected! All reconciled transactions balance accurately.', 50, y + 7);
      y += 25;
    } else {
      discrepancyList.slice(0, 10).forEach(item => {
        if (y > 720) {
          doc.addPage();
          y = 40;
        }
        doc.rect(40, y, 515, 18).fill('#FFF5F5');
        doc.fillColor(item.color).fontSize(7).text(item.type, 45, y + 5, { width: 90 });
        doc.fillColor('#334155').fontSize(7).text(item.ref, 140, y + 5, { width: 130, truncate: true });
        doc.text(item.gw, 280, y + 5);
        doc.text(item.int, 350, y + 5);
        doc.fillColor(item.color).text(item.detail, 420, y + 5, { width: 130, truncate: true });
        doc.moveTo(40, y + 18).lineTo(555, y + 18).strokeColor('#FEE2E2').stroke();
        y += 18;
      });
    }

    y += 15;

    // 4. Matched Transactions Table
    if (y > 640) {
      doc.addPage();
      y = 40;
    }

    doc.fillColor('#0F172A').fontSize(12).text('3. Verified Matched Transactions Sample', 40, y);
    y += 18;

    doc.rect(40, y, 515, 20).fill('#0F172A');
    doc.fillColor('#FFFFFF').fontSize(8);
    doc.text('Payment ID', 45, y + 6, { width: 110 });
    doc.text('Order ID', 160, y + 6, { width: 110 });
    doc.text('Customer', 275, y + 6, { width: 100 });
    doc.text('Method', 380, y + 6, { width: 50 });
    doc.text('Amount (INR)', 440, y + 6, { width: 65 });
    doc.text('Status', 510, y + 6, { width: 40 });
    y += 20;

    if (matched.length === 0) {
      doc.rect(40, y, 515, 22).fill('#F8FAFC');
      doc.fillColor('#64748B').fontSize(8).text('No matched records yet. Process payments to view reconciliation matches.', 50, y + 7);
      y += 25;
    } else {
      matched.slice(0, 12).forEach((m, idx) => {
        if (y > 740) {
          doc.addPage();
          y = 40;
        }
        const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, y, 515, 18).fill(bg);
        doc.fillColor('#334155').fontSize(7);
        doc.text(m.gatewayPayment.paymentId || 'N/A', 45, y + 5, { width: 110, truncate: true });
        doc.text(m.gatewayPayment.orderId, 160, y + 5, { width: 110, truncate: true });
        doc.text(m.gatewayPayment.customerDetails?.name || 'Customer', 275, y + 5, { width: 100, truncate: true });
        doc.text((m.gatewayPayment.method || 'online').toUpperCase(), 380, y + 5, { width: 50 });
        doc.text(`₹${m.amount.toFixed(2)}`, 440, y + 5, { width: 65 });
        doc.fillColor('#15803D').text('MATCHED', 510, y + 5);
        doc.moveTo(40, y + 18).lineTo(555, y + 18).strokeColor('#F1F5F9').stroke();
        y += 18;
      });

      if (matched.length > 12) {
        doc.fillColor('#64748B').fontSize(7).text(`... plus ${matched.length - 12} additional matched transactions recorded in database.`, 45, y + 6);
        y += 15;
      }
    }

    // Footer
    doc.fillColor('#94A3B8').fontSize(7).text(
      'Confidential Audit Document • AI-Based Financial Reconciliation System • Cryptographically Verified',
      40,
      800,
      { align: 'center', width: 515 }
    );

    doc.end();
  }
}

module.exports = PaymentReconService;
