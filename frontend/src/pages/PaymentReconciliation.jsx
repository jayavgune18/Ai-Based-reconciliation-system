import React, { useState, useEffect } from 'react';
import {
  Scale,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Copy,
  HelpCircle,
  TrendingUp,
  ArrowRightLeft,
  Calendar,
  Filter,
  Download,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import {
  runGatewayReconciliation,
  getGatewayReconciliationReport,
  downloadReconciliationPdf,
  downloadReconciliationExcel
} from '../services/paymentService';

export const PaymentReconciliation = () => {
  const [loading, setLoading] = useState(true);
  const [runningRecon, setRunningRecon] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const [reconData, setReconData] = useState({
    stats: {
      totalGatewayTransactions: 0,
      totalInternalTransactions: 0,
      matchedCount: 0,
      amountMismatchCount: 0,
      duplicateCount: 0,
      unmatchedGatewayCount: 0,
      unmatchedInternalCount: 0,
      totalGatewayAmount: 0,
      totalInternalAmount: 0,
      matchedAmount: 0,
      matchRate: 100,
      reconciledAt: null
    },
    matched: [],
    amountMismatched: [],
    duplicates: [],
    unmatchedGateway: [],
    unmatchedInternal: []
  });

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'matched' | 'mismatched' | 'duplicates' | 'unmatched_gw' | 'unmatched_int'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReconciliationReport();
  }, []);

  const fetchReconciliationReport = async () => {
    try {
      setLoading(true);
      const data = await getGatewayReconciliationReport();
      if (data.success) {
        setReconData(data);
      }
    } catch (err) {
      console.error('Failed to load gateway reconciliation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunReconciliation = async () => {
    try {
      setRunningRecon(true);
      const res = await runGatewayReconciliation();
      if (res.success) {
        setReconData(res);
      }
    } catch (err) {
      console.error('Reconciliation execution failed:', err);
      alert('Failed to run reconciliation: ' + (err.response?.data?.message || err.message));
    } finally {
      setRunningRecon(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await downloadReconciliationPdf();
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to download PDF report.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      await downloadReconciliationExcel();
    } catch (err) {
      console.error('Excel download error:', err);
      alert('Failed to download Excel report.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const { stats, matched, amountMismatched, duplicates, unmatchedGateway, unmatchedInternal } = reconData;

  // Filter items based on activeTab and searchQuery
  const getVisibleItems = () => {
    let items = [];

    if (activeTab === 'all') {
      items = [
        ...amountMismatched.map(i => ({ ...i, category: 'AMOUNT_MISMATCH' })),
        ...duplicates.map(i => ({ ...i, category: 'DUPLICATE' })),
        ...unmatchedGateway.map(i => ({ ...i, category: 'UNMATCHED_GATEWAY' })),
        ...unmatchedInternal.map(i => ({ ...i, category: 'UNMATCHED_INTERNAL' })),
        ...matched.map(i => ({ ...i, category: 'MATCHED' }))
      ];
    } else if (activeTab === 'matched') {
      items = matched.map(i => ({ ...i, category: 'MATCHED' }));
    } else if (activeTab === 'mismatched') {
      items = amountMismatched.map(i => ({ ...i, category: 'AMOUNT_MISMATCH' }));
    } else if (activeTab === 'duplicates') {
      items = duplicates.map(i => ({ ...i, category: 'DUPLICATE' }));
    } else if (activeTab === 'unmatched_gw') {
      items = unmatchedGateway.map(i => ({ ...i, category: 'UNMATCHED_GATEWAY' }));
    } else if (activeTab === 'unmatched_int') {
      items = unmatchedInternal.map(i => ({ ...i, category: 'UNMATCHED_INTERNAL' }));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item => {
        const gwOrder = item.gatewayPayment?.orderId?.toLowerCase() || '';
        const gwPay = item.gatewayPayment?.paymentId?.toLowerCase() || '';
        const intTxn = item.internalRecord?.transactionId?.toLowerCase() || '';
        const desc = (item.explanation || item.description || '').toLowerCase();
        return gwOrder.includes(q) || gwPay.includes(q) || intTxn.includes(q) || desc.includes(q);
      });
    }

    return items;
  };

  const visibleItems = getVisibleItems();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 text-white border border-slate-700/60 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
              <Scale size={13} /> Razorpay Gateway Reconciliation Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live Audit Sync
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Financial Reconciliation Dashboard
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Real-time reconciliation comparing Razorpay gateway settlements against company internal ledgers. Automatically flags amount discrepancies, duplicate charges, and orphan gateway entries.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          <button
            onClick={handleRunReconciliation}
            disabled={runningRecon}
            className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-cyan-500 hover:bg-cyan-600 text-white shadow-md shadow-cyan-500/20 transition-all flex items-center gap-2"
          >
            <RefreshCw size={14} className={runningRecon ? 'animate-spin' : ''} />
            <span>{runningRecon ? 'Reconciling...' : 'Run Reconciliation'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all flex items-center gap-1.5"
          >
            <FileText size={14} className="text-red-400" />
            <span>{downloadingPdf ? 'Exporting...' : 'PDF Report'}</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            className="px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" />
            <span>{downloadingExcel ? 'Exporting...' : 'Excel Report'}</span>
          </button>
        </div>
      </div>

      {/* Metric KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Metric 1: Match Rate */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Reconciliation Rate
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.matchRate}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {stats.matchedCount} of {stats.totalGatewayTransactions + stats.totalInternalTransactions} records matched
            </div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Metric 2: Gateway Volume */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Gateway Settlement
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              ₹{stats.totalGatewayAmount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {stats.totalGatewayTransactions} total online transactions
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ArrowRightLeft size={22} />
          </div>
        </div>

        {/* Metric 3: Amount Mismatches */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Amount Discrepancies
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {stats.amountMismatchCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Value delta between gateway & ledger
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Metric 4: Duplicate & Risk Alerts */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Duplicate Charges
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400">
              {stats.duplicateCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Multiple gateway charges per order
            </div>
          </div>
          <div className="p-3 rounded-xl bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">
            <Copy size={22} />
          </div>
        </div>

      </div>

      {/* Main Reconciliation Results & Analysis Section */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        
        {/* Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Items', count: matched.length + amountMismatched.length + duplicates.length + unmatchedGateway.length + unmatchedInternal.length },
              { id: 'matched', label: 'Matched', count: matched.length, color: 'text-emerald-500' },
              { id: 'mismatched', label: 'Amount Mismatch', count: amountMismatched.length, color: 'text-amber-500' },
              { id: 'duplicates', label: 'Duplicates', count: duplicates.length, color: 'text-red-500' },
              { id: 'unmatched_gw', label: 'Orphan Gateway', count: unmatchedGateway.length },
              { id: 'unmatched_int', label: 'Missing Payment', count: unmatchedInternal.length }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5
                    ${isActive
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}
                  `}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, ID..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 pointer-events-none text-xs">
              🔍
            </span>
          </div>

        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-xs">
              <RefreshCw size={24} className="animate-spin text-cyan-500 mb-2" />
              Loading financial reconciliation ledger...
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500/60" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No records found for this category.</p>
              <p className="text-slate-500">All matching criteria are satisfied or no items match your search filter.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Gateway Reference</th>
                  <th className="py-3 px-4">Internal Reference</th>
                  <th className="py-3 px-4">Gateway Amount</th>
                  <th className="py-3 px-4">Internal Amount</th>
                  <th className="py-3 px-4">Variance / Delta</th>
                  <th className="py-3 px-4">Audit Analysis</th>
                  <th className="py-3 px-4 text-center">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {visibleItems.map((item, idx) => {
                  const cat = item.category;
                  const isMatch = cat === 'MATCHED';
                  const isMismatch = cat === 'AMOUNT_MISMATCH';
                  const isDup = cat === 'DUPLICATE';
                  const isUnmatchedGw = cat === 'UNMATCHED_GATEWAY';
                  const isUnmatchedInt = cat === 'UNMATCHED_INTERNAL';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Classification Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          isMatch ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' :
                          isMismatch ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' :
                          isDup ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20' :
                          isUnmatchedGw ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                        }`}>
                          {isMatch && <CheckCircle2 size={11} />}
                          {isMismatch && <AlertTriangle size={11} />}
                          {isDup && <Copy size={11} />}
                          {isUnmatchedGw && <ArrowUpRight size={11} />}
                          {isUnmatchedInt && <HelpCircle size={11} />}
                          {cat.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Gateway Reference */}
                      <td className="py-3.5 px-4 font-mono text-slate-800 dark:text-slate-200">
                        {item.gatewayPayment ? (
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{item.gatewayPayment.paymentId || 'Pending'}</div>
                            <div className="text-[10px] text-slate-400">{item.gatewayPayment.orderId}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None (Missing on gateway)</span>
                        )}
                      </td>

                      {/* Internal Reference */}
                      <td className="py-3.5 px-4 font-mono text-slate-800 dark:text-slate-200">
                        {item.internalRecord ? (
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{item.internalRecord.transactionId || 'General Ledger'}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{item.internalRecord.description}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None (Orphan gateway entry)</span>
                        )}
                      </td>

                      {/* Gateway Amount */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {item.gatewayPayment || item.gatewayAmount ? (
                          `₹${(item.gatewayAmount || item.gatewayPayment?.amount || 0).toLocaleString()}`
                        ) : '—'}
                      </td>

                      {/* Internal Amount */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {item.internalRecord || item.internalAmount ? (
                          `₹${(item.internalAmount || Math.abs(item.internalRecord?.amount || 0)).toLocaleString()}`
                        ) : '—'}
                      </td>

                      {/* Variance / Delta */}
                      <td className="py-3.5 px-4">
                        {item.discrepancyDelta !== undefined ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                            {item.discrepancyDelta > 0 ? `+₹${item.discrepancyDelta}` : `-₹${Math.abs(item.discrepancyDelta)}`}
                          </span>
                        ) : isMatch ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹0.00</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Explanation */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px] max-w-xs leading-relaxed">
                        {item.explanation || item.description}
                      </td>

                      {/* Confidence Score */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          (item.confidenceScore || 0) >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                          (item.confidenceScore || 0) >= 60 ? 'text-amber-600 dark:text-amber-400' :
                          'text-slate-400'
                        }`}>
                          {item.confidenceScore !== undefined ? `${item.confidenceScore}%` : '—'}
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div>
            Showing {visibleItems.length} reconciliation entries. Cryptographic signature and webhook events synced automatically.
          </div>
          <div>
            Last reconciled: {stats.reconciledAt ? new Date(stats.reconciledAt).toLocaleTimeString() : 'Just now'}
          </div>
        </div>

      </div>

    </div>
  );
};
