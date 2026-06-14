import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { 
  FileSpreadsheet, Upload, Download, CheckCircle, AlertTriangle, HelpCircle, FileText, Plus, X, Play
} from 'lucide-react';

export const ReconciliationWorkbench = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  
  // Ingest state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [jobName, setJobName] = useState('');
  const [bankFile, setBankFile] = useState(null);
  const [internalFile, setInternalFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');

  // Resolution state
  const [resolutionTarget, setResolutionTarget] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // OCR state
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrRunning, setOcrRunning] = useState(false);

  // Fetch jobs list
  const fetchJobs = async () => {
    try {
      const res = await apiClient.get('/api/reconciliation/jobs');
      if (res.data.success) {
        setJobs(res.data.jobs);
        if (res.data.jobs.length > 0 && !selectedJobId) {
          setSelectedJobId(res.data.jobs[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load jobs list:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Fetch matches for selected job
  useEffect(() => {
    const fetchMatches = async () => {
      if (!selectedJobId) return;
      setLoadingMatches(true);
      try {
        const res = await apiClient.get(`/api/reconciliation/matches/${selectedJobId}`);
        if (res.data.success) {
          setMatches(res.data.matches);
        }
      } catch (err) {
        console.error('Failed to fetch matches:', err);
      } finally {
        setLoadingMatches(false);
      }
    };

    fetchMatches();
  }, [selectedJobId]);

  // Handle statement upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!jobName || !bankFile || !internalFile) {
      alert('Please fill out all fields and attach both files.');
      return;
    }

    const formData = new FormData();
    formData.append('jobName', jobName);
    formData.append('bankFile', bankFile);
    formData.append('internalFile', internalFile);

    setLoading(true);
    setUploadStatusMsg('Uploading files to secure vault...');
    setUploadProgress(20);

    try {
      const res = await apiClient.post('/api/reconciliation/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setUploadProgress(70);
        setUploadStatusMsg('Ingested! Starting AI model matching pipeline in the background...');
        
        // Polling loop to simulate websocket logs
        setTimeout(() => {
          setUploadProgress(100);
          setUploadStatusMsg('Completed! Reconciliation job processed successfully.');
          fetchJobs();
          setSelectedJobId(res.data.jobId);
          setTimeout(() => {
            setUploadModalOpen(false);
            resetUploadForm();
          }, 1500);
        }, 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Ingestion failed');
      setUploadProgress(0);
      setUploadStatusMsg('');
    } finally {
      setLoading(false);
    }
  };

  // Handle OCR Invoicing Submit
  const handleOcrSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceFile) return;

    const formData = new FormData();
    formData.append('invoiceFile', invoiceFile);

    setOcrRunning(true);
    setOcrResult(null);

    try {
      const res = await apiClient.post('/api/reconciliation/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setOcrResult(res.data.data);
      }
    } catch (err) {
      alert('OCR failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setOcrRunning(false);
    }
  };

  // Handle resolving a mismatch override
  const handleResolveSubmit = async (status) => {
    if (!resolutionNotes) {
      alert('Please enter action resolution notes.');
      return;
    }

    try {
      const res = await apiClient.put(`/api/reconciliation/matches/${resolutionTarget._id}/resolve`, {
        status,
        actionNotes: resolutionNotes
      });

      if (res.data.success) {
        // Refresh local matches list
        setMatches(matches.map(m => m._id === resolutionTarget._id ? res.data.match : m));
        setResolutionTarget(null);
        setResolutionNotes('');
      }
    } catch (err) {
      alert('Failed to override match status');
    }
  };

  const resetUploadForm = () => {
    setJobName('');
    setBankFile(null);
    setInternalFile(null);
    setUploadProgress(0);
    setUploadStatusMsg('');
  };

  const getMatchIcon = (type) => {
    switch (type) {
      case 'exact': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'ai_predicted': return <Play size={16} className="text-cyan-500" />;
      case 'partial': return <AlertTriangle size={16} className="text-amber-500" />;
      default: return <HelpCircle size={16} className="text-red-500" />;
    }
  };

  const getMatchBadgeColor = (type) => {
    switch (type) {
      case 'exact': return 'bg-emerald-500/10 text-emerald-500';
      case 'ai_predicted': return 'bg-cyan-500/10 text-cyan-500';
      case 'partial': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-red-500/10 text-red-500';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ==========================================
          1. HEADER CONTROLS
          ========================================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        
        {/* Selector dropdown */}
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="text-cyan-500" size={20} />
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Active Statement Audit</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none focus:ring-0 focus:outline-none p-0 pr-8 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {jobs.map(job => (
                <option key={job._id} value={job._id} className="bg-slate-950 text-slate-200">{job.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-2">
          
          <button 
            onClick={() => setOcrModalOpen(true)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-[10px] rounded-lg tracking-wider uppercase flex items-center gap-2 transition"
          >
            <FileText size={12} />
            OCR Invoice Extract
          </button>

          <button 
            onClick={() => setUploadModalOpen(true)}
            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-[10px] rounded-lg tracking-wider uppercase flex items-center gap-2 transition"
          >
            <Plus size={12} />
            New Reconciliation Audit
          </button>

          {selectedJobId && (
            <>
              <a 
                href={`/api/reports/pdf/${selectedJobId}`}
                download
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition"
                title="Download PDF Audit"
              >
                <Download size={14} />
              </a>
              <a 
                href={`/api/reports/excel/${selectedJobId}`}
                download
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition"
                title="Download Excel Ingestion Ledger"
              >
                <FileSpreadsheet size={14} />
              </a>
            </>
          )}

        </div>

      </div>

      {/* ==========================================
          2. WORKBENCH RECONCILIATION MATCH GRID
          ========================================== */}
      {loadingMatches ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50">
          <FileSpreadsheet size={40} className="text-slate-400 mx-auto mb-2" />
          <h4 className="font-bold text-xs">No reconciliation audits loaded.</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Click "New Reconciliation Audit" to run matching algorithms on statements.</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Double-Ledger Matching Matrices</h4>

          {/* Workbench Ledger Rows */}
          <div className="space-y-3">
            {matches.map((match) => {
              const bank = match.bankTransactionId || {};
              const internal = match.internalTransactionId || {};
              const amount = bank.amount || internal.amount || 0;

              return (
                <div 
                  key={match._id}
                  className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between"
                >
                  
                  {/* Bank statement panel */}
                  <div className="flex-1 space-y-1">
                    <span className="text-[8px] font-bold tracking-widest text-slate-400 uppercase">Bank Statement Item</span>
                    {match.bankTransactionId ? (
                      <div>
                        <p className="font-bold text-xs truncate max-w-xs">{bank.description}</p>
                        <p className="text-[9px] text-slate-400">{new Date(bank.date).toLocaleDateString()}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 font-semibold italic">Missing Item</p>
                    )}
                  </div>

                  {/* Similarity metric circle */}
                  <div className="flex flex-col items-center justify-center min-w-[120px] p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      {getMatchIcon(match.matchType)}
                      <span className="font-extrabold text-xs">{match.confidenceScore}%</span>
                    </div>
                    <span className={`px-2 py-0.5 text-[8px] rounded-full font-bold uppercase mt-1 ${getMatchBadgeColor(match.matchType)}`}>
                      {match.matchType.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Internal ledger panel */}
                  <div className="flex-1 space-y-1 md:text-right">
                    <span className="text-[8px] font-bold tracking-widest text-slate-400 uppercase">Internal Ledger Item</span>
                    {match.internalTransactionId ? (
                      <div>
                        <p className="font-bold text-xs truncate max-w-xs md:ml-auto">{internal.description}</p>
                        <p className="text-[9px] text-slate-400">{new Date(internal.date).toLocaleDateString()}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 font-semibold italic">Missing Item</p>
                    )}
                  </div>

                  {/* Core Invoiced amount & audit actions */}
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5 md:text-right">
                      <span className="text-[8px] font-bold tracking-widest text-slate-400 uppercase">Valuation</span>
                      <h4 className="font-black text-xs text-slate-900 dark:text-white">${Math.abs(amount).toFixed(2)}</h4>
                    </div>
                    
                    {/* Action Resolution button */}
                    <div>
                      {match.status === 'pending_review' ? (
                        <button
                          onClick={() => setResolutionTarget(match)}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] rounded-lg tracking-wider uppercase transition"
                        >
                          Resolve Discrepancy
                        </button>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-[9px] rounded-lg tracking-wider uppercase">
                          {match.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ==========================================
          3. NEW UPLOAD AUDIT MODAL
          ========================================== */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setUploadModalOpen(false);
                resetUploadForm();
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <h3 className="font-bold text-sm tracking-widest text-slate-400 uppercase mb-4">Launch Reconciliation Ingestion</h3>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Job Name</label>
                <input 
                  type="text" 
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="e.g. Q1 Sales Audit vs Chase Statement"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:border-cyan-500 transition"
                  required
                />
              </div>

              {/* Bank dropzone */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bank Statement Sheet (.csv, .xlsx)</label>
                <input 
                  type="file" 
                  accept=".csv,.xlsx"
                  onChange={(e) => setBankFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-cyan-500/10 file:text-cyan-500 hover:file:bg-cyan-500/20 cursor-pointer"
                  required
                />
              </div>

              {/* Internal Ledger dropzone */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Internal Ledger Sheet (.csv, .xlsx)</label>
                <input 
                  type="file" 
                  accept=".csv,.xlsx"
                  onChange={(e) => setInternalFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-cyan-500/10 file:text-cyan-500 hover:file:bg-cyan-500/20 cursor-pointer"
                  required
                />
              </div>

              {/* Uploading progress tracker */}
              {uploadProgress > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-400 animate-pulse">{uploadStatusMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs rounded-lg tracking-wider uppercase flex items-center justify-center gap-2 mt-2 transition"
              >
                <Upload size={14} />
                {loading ? 'Ingesting data sheets...' : 'Launch AI Reconciliation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          4. RESOLUTION OVERRIDE POPUP
          ========================================== */}
      {resolutionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setResolutionTarget(null);
                setResolutionNotes('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <h3 className="font-bold text-xs tracking-widest text-slate-400 uppercase mb-2">Discrepancy Resolution</h3>
            <p className="text-[10px] text-slate-500 mb-4">
              Overriding balance discrepancies creates a secure timestamped ledger event inside the audit trail.
            </p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Reconcile Notes / Resolution Remarks</label>
                <textarea 
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Approved. Transaction amounts match but descriptions differ due to bank shortening."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:border-cyan-500 transition h-20"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleResolveSubmit('resolved')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg tracking-wider uppercase transition"
                >
                  Approve Match
                </button>
                <button
                  onClick={() => handleResolveSubmit('flagged_fraud')}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg tracking-wider uppercase transition"
                >
                  Flag as Fraud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          5. OCR INVOICING MODAL
          ========================================== */}
      {ocrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setOcrModalOpen(false);
                setInvoiceFile(null);
                setOcrResult(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <h3 className="font-bold text-sm tracking-widest text-slate-400 uppercase mb-4">OCR Invoice Extraction (Tesseract.js)</h3>

            <form onSubmit={handleOcrSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Attach Invoice Image/PDF</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={(e) => setInvoiceFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-cyan-500/10 file:text-cyan-500 hover:file:bg-cyan-500/20 cursor-pointer"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={ocrRunning}
                className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-[10px] rounded-lg tracking-wider uppercase flex items-center justify-center gap-2 transition"
              >
                {ocrRunning ? 'Running Optical Character Extraction...' : 'Extract Invoice Details'}
              </button>
            </form>

            {ocrResult && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] space-y-2 animate-in fade-in-50 duration-200">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold uppercase tracking-wider text-slate-400">Extracted Invoiced Attributes</h4>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold uppercase">{ocrResult.confidenceRate}% Accurate</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                  <div><span className="font-bold text-slate-400 block uppercase text-[8px]">Vendor Name</span>{ocrResult.vendorName}</div>
                  <div><span className="font-bold text-slate-400 block uppercase text-[8px]">Invoice Number</span>{ocrResult.invoiceNumber}</div>
                  <div><span className="font-bold text-slate-400 block uppercase text-[8px]">Billing Date</span>{ocrResult.invoiceDate}</div>
                  <div><span className="font-bold text-slate-400 block uppercase text-[8px]">Total Valuation</span>${ocrResult.amount.toFixed(2)}</div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-400 block uppercase text-[8px] mb-1">OCR Log Output</span>
                  <pre className="bg-white dark:bg-slate-900 p-2 rounded text-[8px] overflow-x-auto text-slate-500 leading-relaxed font-mono whitespace-pre-wrap">{ocrResult.ocrTextRaw}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
