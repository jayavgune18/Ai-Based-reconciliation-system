import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { 
  FileSpreadsheet, Upload, Download, CheckCircle, AlertTriangle, HelpCircle, FileText, Plus, X, Play,
  Sparkles, CheckCheck, Check, Brain, ShieldAlert, ArrowRightLeft
} from 'lucide-react';

export const ReconciliationWorkbench = () => {
  const navigate = useNavigate();
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

  // AI Executive Summary state
  const [aiSummaryModalOpen, setAiSummaryModalOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);

  // AI Deep-dive Explain state
  const [aiExplainModalOpen, setAiExplainModalOpen] = useState(false);
  const [aiExplainResult, setAiExplainResult] = useState(null);
  const [loadingAiExplain, setLoadingAiExplain] = useState(false);
  const [activeExplainMatch, setActiveExplainMatch] = useState(null);

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
      if (err.response?.data?.quotaExceeded) {
        if (window.confirm(`${err.response.data.message}\n\nWould you like to upgrade your subscription plan now to increase your quota?`)) {
          setUploadModalOpen(false);
          navigate('/subscriptions');
        }
      } else {
        alert(err.response?.data?.message || 'Ingestion failed');
      }
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
        setMatches(matches.map(m => m._id === resolutionTarget._id ? res.data.match : m));
        setResolutionTarget(null);
        setResolutionNotes('');
      }
    } catch (err) {
      alert('Failed to override match status');
    }
  };

  // Fetch AI Executive Summary for the selected audit job
  const handleFetchAiSummary = async () => {
    if (!selectedJobId) return;
    setLoadingAiSummary(true);
    setAiSummary(null);
    setAiSummaryModalOpen(true);
    try {
      const res = await apiClient.get(`/api/reconciliation/ai-summary/${selectedJobId}`);
      if (res.data.success) {
        setAiSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to load AI summary:', err);
      alert('Failed to generate AI executive briefing: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingAiSummary(false);
    }
  };

  // Open AI deep-dive comparison on a specific match
  const handleOpenAiExplain = async (match) => {
    setActiveExplainMatch(match);
    setAiExplainResult(null);
    setAiExplainModalOpen(true);
    setLoadingAiExplain(true);
    try {
      const res = await apiClient.post('/api/reconciliation/ai-match', {
        bankTxn: match.bankTransactionId,
        internalTxn: match.internalTransactionId
      });
      if (res.data.success) {
        setAiExplainResult(res.data.comparison);
      }
    } catch (err) {
      console.error('Failed to explain match with AI:', err);
    } finally {
      setLoadingAiExplain(false);
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
      case 'exact': return <CheckCircle size={18} className="text-emerald-500" />;
      case 'ai_predicted': return <Play size={18} className="text-cyan-500" />;
      case 'partial': return <AlertTriangle size={18} className="text-amber-500" />;
      default: return <HelpCircle size={18} className="text-red-500" />;
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
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="text-cyan-500 shrink-0" size={20} />
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Active Statement Audit</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="text-sm font-semibold bg-transparent border-none focus:ring-0 focus:outline-none p-0 pr-6 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {jobs.map(job => (
                <option key={job._id} value={job._id} className="bg-slate-950 text-slate-200">{job.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          
          <button 
            onClick={handleFetchAiSummary}
            disabled={loadingAiSummary || !selectedJobId}
            className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg tracking-wider uppercase flex items-center gap-1.5 shadow-md shadow-violet-500/20 transition disabled:opacity-50"
          >
            <Sparkles size={14} className={loadingAiSummary ? 'animate-spin' : ''} />
            <span>{loadingAiSummary ? 'Generating AI Briefing...' : 'AI Executive Briefing'}</span>
          </button>

          <button 
            onClick={() => setOcrModalOpen(true)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-lg tracking-wider uppercase flex items-center gap-1.5 transition"
          >
            <FileText size={14} />
            OCR Invoice Extract
          </button>

          <button 
            onClick={() => setUploadModalOpen(true)}
            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs rounded-lg tracking-wider uppercase flex items-center gap-1.5 transition"
          >
            <Plus size={14} />
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
                <Download size={16} />
              </a>
              <a 
                href={`/api/reports/excel/${selectedJobId}`}
                download
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition"
                title="Download Excel Ingestion Ledger"
              >
                <FileSpreadsheet size={16} />
              </a>
            </>
          )}

        </div>

      </div>

      {/* Workbench Reconciliation Match Grid */}
      {loadingMatches ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50">
          <FileSpreadsheet size={40} className="text-slate-400 mx-auto mb-3" />
          <h4 className="font-bold text-base">No reconciliation audits loaded.</h4>
          <p className="text-sm text-slate-500 mt-1">Click "New Reconciliation Audit" to run matching algorithms on statements.</p>
        </div>
      ) : (
        <div className="space-y-5">
          
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Double-Ledger Matching Matrices</h4>

          <div className="space-y-3">
            {matches.map((match) => {
              const bank = match.bankTransactionId || {};
              const internal = match.internalTransactionId || {};
              const amount = bank.amount || internal.amount || 0;

              return (
                <div 
                  key={match._id}
                  className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between"
                >
                  
                  <div className="flex-1 space-y-1">
                    <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Bank Statement Item</span>
                    {match.bankTransactionId ? (
                      <div>
                        <p className="font-bold text-sm truncate max-w-xs">{bank.description}</p>
                        <p className="text-xs text-slate-400">{new Date(bank.date).toLocaleDateString()}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-500 font-semibold italic">Missing Item</p>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center min-w-[120px] p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-2">
                      {getMatchIcon(match.matchType)}
                      <span className="font-extrabold text-sm">{match.confidenceScore}%</span>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-bold uppercase mt-1 ${getMatchBadgeColor(match.matchType)}`}>
                      {match.matchType.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1 md:text-right">
                    <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Internal Ledger Item</span>
                    {match.internalTransactionId ? (
                      <div>
                        <p className="font-bold text-sm truncate max-w-xs md:ml-auto">{internal.description}</p>
                        <p className="text-xs text-slate-400">{new Date(internal.date).toLocaleDateString()}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-500 font-semibold italic">Missing Item</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="space-y-1 md:text-right">
                      <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Valuation</span>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">${Math.abs(amount).toFixed(2)}</h4>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenAiExplain(match)}
                        className="px-2.5 py-1.5 rounded-lg border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-xs font-bold transition flex items-center gap-1 group shadow-sm"
                        title="AI Forensic Match Breakdown"
                      >
                        <Sparkles size={13} className="text-violet-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px]">AI Explain</span>
                      </button>

                      {match.status === 'pending_review' ? (
                        <button
                          onClick={() => setResolutionTarget(match)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg tracking-wider uppercase transition"
                        >
                          Resolve Discrepancy
                        </button>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-xs rounded-lg tracking-wider uppercase">
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

      {/* New Upload Audit Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative">
            <button 
              onClick={() => {
                setUploadModalOpen(false);
                resetUploadForm();
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <h3 className="font-bold text-base tracking-widest text-slate-400 uppercase mb-5">Launch Reconciliation Ingestion</h3>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Job Name</label>
                <input 
                  type="text" 
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="e.g. Q1 Sales Audit vs Chase Statement"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-cyan-500 transition"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Bank Statement Sheet (.csv, .xlsx)</label>
                <input 
                  type="file" 
                  accept=".csv,.xlsx"
                  onChange={(e) => setBankFile(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:bg-cyan-500/10 file:text-cyan-500 hover:file:bg-cyan-500/20 cursor-pointer"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Internal Ledger Sheet (.csv, .xlsx)</label>
                <input 
                  type="file" 
                  accept=".csv,.xlsx"
                  onChange={(e) => setInternalFile(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:bg-cyan-500/10 file:text-cyan-500 hover:file:bg-cyan-500/20 cursor-pointer"
                  required
                />
              </div>

              {uploadProgress > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 animate-pulse">{uploadStatusMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-sm rounded-lg tracking-wider uppercase flex items-center justify-center gap-2 mt-1 transition"
              >
                <Upload size={16} />
                {loading ? 'Ingesting data sheets...' : 'Launch AI Reconciliation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Executive Summary Modal */}
      {aiSummaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold flex items-center gap-2">
                    AI Reconciliation Briefing
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/25 uppercase tracking-wider">
                      Executive Report
                    </span>
                  </h3>
                  <p className="text-xs text-violet-200 mt-0.5">
                    Forensic summary generated by Neural LLM Reconciliation Engine
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAiSummaryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {loadingAiSummary ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Brain size={36} className="animate-pulse text-violet-500" />
                  <p className="text-xs font-bold uppercase tracking-wider">Synthesizing Transaction Intelligence...</p>
                </div>
              ) : aiSummary ? (
                <div className="space-y-5">
                  {/* Key KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Accuracy Rate</span>
                      <span className="text-2xl font-black text-violet-600 dark:text-violet-400">{aiSummary.accuracyRate}%</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Matched Pairs</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{aiSummary.matchedPairs}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Discrepancies</span>
                      <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{aiSummary.discrepancyCount}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Risk Signals</span>
                      <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{aiSummary.fraudAlertsCount}</span>
                    </div>
                  </div>

                  {/* Narrative Summary */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Brain size={14} className="text-violet-500" />
                      Executive Narrative
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {aiSummary.narrativeSummary}
                    </p>
                  </div>

                  {/* Key Audit Findings */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Audit Findings</h4>
                    <div className="space-y-1.5">
                      {aiSummary.keyFindings?.map((finding, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={15} />
                          <span>{finding}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CFO Recommendations */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recommended Next Steps</h4>
                    <div className="space-y-1.5">
                      {aiSummary.recommendations?.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-900/40 text-xs text-violet-900 dark:text-violet-200">
                          <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{idx + 1}</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Audited under Dual-Ledger AI Protocol</span>
              <button 
                onClick={() => setAiSummaryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                Close Briefing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Forensic Explain Deep-Dive Modal */}
      {aiExplainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Brain size={20} />
                <h3 className="font-extrabold text-base">AI Forensic Match Reasoning</h3>
              </div>
              <button 
                onClick={() => setAiExplainModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {loadingAiExplain ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Sparkles size={28} className="animate-spin text-violet-500" />
                  <span>Evaluating semantic distance and timing vectors...</span>
                </div>
              ) : aiExplainResult ? (
                <div className="space-y-4">
                  {/* Score & Action Row */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Match Confidence</span>
                      <span className="text-2xl font-black text-violet-600 dark:text-violet-400">{aiExplainResult.confidenceScore}%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">AI Recommendation</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        aiExplainResult.recommendedAction === 'APPROVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' :
                        aiExplainResult.recommendedAction === 'REVIEW_REQUIRED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' :
                        'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}>
                        {aiExplainResult.recommendedAction}
                      </span>
                    </div>
                  </div>

                  {/* Item Comparison */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Bank Feed Item</span>
                      <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{activeExplainMatch?.bankTransactionId?.description || 'N/A'}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">₹{activeExplainMatch?.bankTransactionId?.amount?.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Company Ledger</span>
                      <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{activeExplainMatch?.internalTransactionId?.description || 'N/A'}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">₹{activeExplainMatch?.internalTransactionId?.amount?.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* AI Reasoning */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Forensic Auditor Rationale</span>
                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{aiExplainResult.reasoning}</p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button 
                onClick={() => setAiExplainModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                Close
              </button>
              {activeExplainMatch?.status === 'pending_review' && (
                <button
                  onClick={() => {
                    setAiExplainModalOpen(false);
                    setResolutionTarget(activeExplainMatch);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Approve Match</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {resolutionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative">
            <button 
              onClick={() => {
                setResolutionTarget(null);
                setResolutionNotes('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <h3 className="font-bold text-base tracking-widest text-slate-400 uppercase mb-2">Discrepancy Resolution</h3>
            <p className="text-sm text-slate-500 mb-4">
              Overriding balance discrepancies creates a secure timestamped ledger event inside the audit trail.
            </p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Reconcile Notes / Resolution Remarks</label>
                <textarea 
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Approved. Transaction amounts match but descriptions differ due to bank shortening."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-cyan-500 transition h-20"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleResolveSubmit('resolved')}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg tracking-wider uppercase transition"
                >
                  Approve Match
                </button>
                <button
                  onClick={() => handleResolveSubmit('flagged_fraud')}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg tracking-wider uppercase transition"
                >
                  Flag as Fraud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OCR Invoicing Modal */}
      {ocrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative">
            <button 
              onClick={() => {
                setOcrModalOpen(false);
                setInvoiceFile(null);
                setOcrResult(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <h3 className="font-bold text-base tracking-widest text-slate-400 uppercase mb-5">OCR Invoice Extraction (Tesseract.js)</h3>

            <form onSubmit={handleOcrSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Attach Invoice Image/PDF</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={(e) => setInvoiceFile(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:bg-cyan-500/10 file:text-cyan-500 hover:file:bg-cyan-500/20 cursor-pointer"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={ocrRunning}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-sm rounded-lg tracking-wider uppercase flex items-center justify-center gap-2 transition"
              >
                {ocrRunning ? 'Running Optical Character Extraction...' : 'Extract Invoice Details'}
              </button>
            </form>

            {ocrResult && (
              <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold uppercase tracking-wider text-slate-400">Extracted Invoiced Attributes</h4>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold uppercase text-xs">{ocrResult.confidenceRate}% Accurate</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                  <div><span className="font-bold text-slate-400 block uppercase text-xs">Vendor Name</span>{ocrResult.vendorName}</div>
                  <div><span className="font-bold text-slate-400 block uppercase text-xs">Invoice Number</span>{ocrResult.invoiceNumber}</div>
                  <div><span className="font-bold text-slate-400 block uppercase text-xs">Billing Date</span>{ocrResult.invoiceDate}</div>
                  <div><span className="font-bold text-slate-400 block uppercase text-xs">Total Valuation</span>${ocrResult.amount.toFixed(2)}</div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-400 block uppercase text-xs mb-1">OCR Log Output</span>
                  <pre className="bg-white dark:bg-slate-900 p-2 rounded text-xs overflow-x-auto text-slate-500 leading-relaxed font-mono whitespace-pre-wrap">{ocrResult.ocrTextRaw}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};