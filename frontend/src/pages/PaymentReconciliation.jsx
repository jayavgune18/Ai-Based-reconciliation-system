import React, { useState, useEffect, useRef } from 'react';
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
  ArrowUpRight,
  Camera,
  ScanLine,
  UploadCloud,
  X,
  Sparkles,
  Check,
  CheckCheck,
  FileCheck,
  CreditCard,
  Layers
} from 'lucide-react';
import {
  runGatewayReconciliation,
  getGatewayReconciliationReport,
  downloadReconciliationPdf,
  downloadReconciliationExcel,
  scanAndMatchReceipt,
  ingestScannedReceipt
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

  // Scanner state
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState('upload'); // 'upload' | 'camera'
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Camera cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        setCameraError('Camera access not supported on this device/browser.');
      }
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError('Camera access permission denied or camera unavailable. Please upload a receipt file instead.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureCameraFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);

    stopCamera();
    await processScan({ imageBase64: base64 });
  };

  const handleReceiptFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('receipt', file);
    await processScan(formData);
  };

  const processScan = async (payload) => {
    setIsScanning(true);
    setScanResult(null);
    setIngestSuccess(null);
    try {
      const res = await scanAndMatchReceipt(payload);
      if (res.success) {
        setScanResult(res);
      }
    } catch (err) {
      console.error('Scan error:', err);
      alert('Scanning failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsScanning(false);
    }
  };

  const handlePresetTest = async (type) => {
    const presets = {
      posSlip: {
        presetData: {
          receiptNumber: 'POS-TXN-884920',
          amount: 4500,
          paymentMethod: 'POS Card Swipe (ICICI)',
          issuer: 'ICICI Merchant POS'
        }
      },
      onlineSlip: {
        presetData: {
          receiptNumber: 'order_recon_sim_101',
          amount: 2499,
          paymentMethod: 'Razorpay Online Gateway',
          issuer: 'Razorpay Settlements'
        }
      },
      cashCounter: {
        presetData: {
          receiptNumber: 'CHALLAN-5519',
          amount: 8000,
          paymentMethod: 'Bank Counter Deposit Challan',
          issuer: 'State Bank of India'
        }
      }
    };
    await processScan(presets[type] || presets.posSlip);
  };

  const handleIngestScannedReceipt = async () => {
    if (!scanResult?.scannedData) return;
    setIngestLoading(true);
    try {
      const res = await ingestScannedReceipt({
        receiptNumber: scanResult.scannedData.receiptNumber,
        amount: scanResult.scannedData.amount,
        date: scanResult.scannedData.date,
        paymentMethod: scanResult.scannedData.paymentMethod,
        issuer: scanResult.scannedData.issuer,
        description: `Scanned Receipt - ${scanResult.scannedData.receiptNumber} (${scanResult.scannedData.issuer})`
      });

      if (res.success) {
        setIngestSuccess(res.message);
        // Refresh reconciliation data instantly
        await fetchReconciliationReport();
      }
    } catch (err) {
      alert('Failed to ingest receipt: ' + (err.response?.data?.message || err.message));
    } finally {
      setIngestLoading(false);
    }
  };

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
            id="btn-open-receipt-scanner"
            onClick={() => {
              setScannerModalOpen(true);
              setScanResult(null);
              setIngestSuccess(null);
            }}
            className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-500/25 transition-all flex items-center gap-2 group"
          >
            <Camera size={14} className="group-hover:scale-110 transition-transform" />
            <span>Scan Receipt / Slip</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/20 font-extrabold uppercase tracking-wider">AI</span>
          </button>

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

      {/* ── AI PAYMENT RECEIPT SCANNER & RECONCILIATION MATCHER MODAL ── */}
      {scannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <ScanLine size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold flex items-center gap-2">
                      Payment Slip &amp; Receipt Scanner
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/25 uppercase tracking-wider">
                        AI Matcher
                      </span>
                    </h3>
                    <p className="text-xs text-violet-200 mt-0.5">
                      Scan offline receipts or POS terminal slips to auto-reconcile with gateway settlements
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setScannerModalOpen(false);
                    stopCamera();
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Mode Selector Tabs */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setScannerMode('upload');
                    stopCamera();
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    scannerMode === 'upload'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <UploadCloud size={16} />
                  <span>Upload Receipt File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScannerMode('camera');
                    startCamera();
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    scannerMode === 'camera'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Camera size={16} />
                  <span>Live Camera Scanner</span>
                </button>
              </div>

              {/* Mode 1: File Upload */}
              {scannerMode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-violet-300 dark:border-violet-800/80 hover:border-violet-500 rounded-2xl p-6 text-center cursor-pointer bg-violet-50/30 dark:bg-slate-900/40 transition-all hover:bg-violet-50/60 dark:hover:bg-violet-950/20 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleReceiptFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center mx-auto mb-3 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform shadow-sm">
                    <FileText size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Drop payment slip / bank receipt image here
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports POS credit card slips, bank counter counterfoils, vendor receipts (.png, .jpg, .pdf up to 10MB)
                  </p>
                </div>
              )}

              {/* Mode 2: Live Camera Viewfinder */}
              {scannerMode === 'camera' && (
                <div className="space-y-3">
                  {cameraError ? (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
                      <p className="font-semibold mb-1">Camera Notice:</p>
                      <p>{cameraError}</p>
                      <button
                        type="button"
                        onClick={() => setScannerMode('upload')}
                        className="mt-2 text-xs font-bold text-violet-600 dark:text-violet-400 underline"
                      >
                        Switch to File Upload
                      </button>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video max-h-64 flex items-center justify-center border-2 border-violet-500 shadow-2xl">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Targeting overlay with moving laser sweep */}
                      <div className="absolute inset-5 border-2 border-dashed border-cyan-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                        <div className="flex justify-between items-center text-[10px] font-mono text-cyan-300 bg-slate-950/70 px-2 py-0.5 rounded backdrop-blur-sm self-start">
                          <span>[OCR CAMERA SCANNER ACTIVE]</span>
                        </div>
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse" />
                        <div className="text-[11px] text-center text-slate-200 bg-slate-950/70 px-3 py-1 rounded-lg backdrop-blur-sm self-center">
                          Hold receipt flat and align within the target box
                        </div>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                  )}

                  {cameraActive && !cameraError && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={captureCameraFrame}
                        disabled={isScanning}
                        className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md flex items-center justify-center gap-2 transition-all"
                      >
                        <Camera size={15} />
                        <span>Capture &amp; Cross-Reconcile</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="py-3 px-4 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                      >
                        Stop Camera
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sample Preset Buttons */}
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-violet-500" />
                  Instant Test Simulators (No camera needed):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePresetTest('posSlip')}
                    disabled={isScanning}
                    className="p-2.5 rounded-xl text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-violet-50 dark:hover:bg-violet-950/30 border border-slate-200 dark:border-slate-700 hover:border-violet-400 transition-all group"
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors">
                      POS Card Slip
                    </p>
                    <p className="text-[11px] text-slate-500">₹4,500 &bull; ICICI Merchant</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetTest('onlineSlip')}
                    disabled={isScanning}
                    className="p-2.5 rounded-xl text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-violet-50 dark:hover:bg-violet-950/30 border border-slate-200 dark:border-slate-700 hover:border-violet-400 transition-all group"
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors">
                      Razorpay Gateway
                    </p>
                    <p className="text-[11px] text-slate-500">₹2,499 &bull; Online Order</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetTest('cashCounter')}
                    disabled={isScanning}
                    className="p-2.5 rounded-xl text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-violet-50 dark:hover:bg-violet-950/30 border border-slate-200 dark:border-slate-700 hover:border-violet-400 transition-all group"
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors">
                      Bank Challan
                    </p>
                    <p className="text-[11px] text-slate-500">₹8,000 &bull; Offline Branch</p>
                  </button>
                </div>
              </div>

              {/* Scanning Active Feedback */}
              {isScanning && (
                <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-200 text-xs flex items-center gap-3 animate-pulse">
                  <RefreshCw size={18} className="animate-spin text-violet-600 shrink-0" />
                  <div>
                    <p className="font-bold">Neural OCR Extraction &amp; Reconciliation Engine running...</p>
                    <p className="text-[11px] text-violet-600 dark:text-violet-400">
                      Cross-referencing payment identifiers against Razorpay settlements &amp; internal ledgers...
                    </p>
                  </div>
                </div>
              )}

              {/* Scanned Results & Match Card */}
              {scanResult && !isScanning && (
                <div className="space-y-4 pt-2">
                  
                  {/* Extracted Slip Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FileCheck size={15} className="text-violet-600" />
                        Scanned Receipt Breakdown
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                        {scanResult.scannedData?.confidenceRate}% Accurate OCR
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans">Reference / Receipt #:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {scanResult.scannedData?.receiptNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans">Settlement Amount:</span>
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          ₹{scanResult.scannedData?.amount?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans">Provider / Issuer:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {scanResult.scannedData?.issuer}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans">Payment Method:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {scanResult.scannedData?.paymentMethod}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reconciliation Match Result */}
                  <div className={`p-4 rounded-2xl border ${
                    scanResult.reconciliationMatch?.status === 'EXACT_MATCH'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : scanResult.reconciliationMatch?.status === 'AMOUNT_MISMATCH'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                      : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800'
                  } space-y-3`}>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {scanResult.reconciliationMatch?.status === 'EXACT_MATCH' && (
                          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                            <CheckCircle2 size={18} />
                          </div>
                        )}
                        {scanResult.reconciliationMatch?.status === 'AMOUNT_MISMATCH' && (
                          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                            <AlertTriangle size={18} />
                          </div>
                        )}
                        {scanResult.reconciliationMatch?.status !== 'EXACT_MATCH' && scanResult.reconciliationMatch?.status !== 'AMOUNT_MISMATCH' && (
                          <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                            <ArrowRightLeft size={18} />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {scanResult.reconciliationMatch?.status === 'EXACT_MATCH' && 'Direct Match with Gateway Settlement'}
                            {scanResult.reconciliationMatch?.status === 'AMOUNT_MISMATCH' && 'Amount Mismatch Flagged'}
                            {scanResult.reconciliationMatch?.status === 'INTERNAL_MATCH' && 'Internal Ledger Record Matched'}
                            {scanResult.reconciliationMatch?.status === 'UNMATCHED_OFFLINE' && 'Offline Voucher — Ingest Available'}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            {scanResult.reconciliationMatch?.recommendation}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
                        {scanResult.reconciliationMatch?.matchConfidence}% Match
                      </span>
                    </div>

                    {/* Matched Details */}
                    {scanResult.reconciliationMatch?.matchedGateway && (
                      <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs font-mono grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-sans">Matched Order ID:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {scanResult.reconciliationMatch.matchedGateway.orderId}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-sans">Gateway Amount:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            ₹{scanResult.reconciliationMatch.matchedGateway.amount?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Success notification if ingested */}
                    {ingestSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                        <CheckCheck size={16} className="text-emerald-500" />
                        <span>{ingestSuccess}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleIngestScannedReceipt}
                        disabled={ingestLoading || !!ingestSuccess}
                        className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {ingestLoading ? (
                          <><RefreshCw size={14} className="animate-spin" /><span>Ingesting...</span></>
                        ) : ingestSuccess ? (
                          <><CheckCheck size={14} /><span>Reconciled in Ledger</span></>
                        ) : (
                          <><Layers size={14} /><span>Ingest into Ledger &amp; Reconcile</span></>
                        )}
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                OCR powered with multi-stage regex tokenization
              </span>
              <button
                type="button"
                onClick={() => {
                  setScannerModalOpen(false);
                  stopCamera();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                Close Scanner
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

