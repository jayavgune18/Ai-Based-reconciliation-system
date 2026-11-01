import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  ArrowRight,
  Download,
  Calendar,
  Sparkles,
  TrendingUp,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
  ChevronDown,
  Printer,
  X,
  QrCode,
  Smartphone,
  Copy,
  CheckCheck,
  Timer,
  IndianRupee,
  Wallet,
  Camera,
  ScanLine,
  UploadCloud,
  Check,
  Image as ImageIcon,
  Sparkle
} from 'lucide-react';
import {
  loadRazorpayScript,
  fetchSubscriptionPlans,
  fetchCurrentSubscription,
  createCheckoutSession,
  verifySubscriptionPayment,
  cancelSubscription,
  resumeSubscription,
  fetchBillingHistory,
  downloadInvoicePdf,
  confirmUpiPayment,
  scanPaymentReceipt
} from '../services/subscriptionService';

export const SubscriptionDashboard = () => {
  const { user } = useAuth();

  // State
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Billing History State
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Too expensive for current volume');

  // Payment Method Selection Modal State
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState(null);

  // UPI QR Modal State
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiPlanData, setUpiPlanData] = useState(null); // { planId, planName, amount, orderId }
  const [utrInput, setUtrInput] = useState('');
  const [upiLoading, setUpiLoading] = useState(false);
  const [upiInitLoading, setUpiInitLoading] = useState(false);
  const [upiTimer, setUpiTimer] = useState(900); // 15 min countdown in seconds
  const [upiCopied, setUpiCopied] = useState(false);
  const upiTimerRef = useRef(null);

  // Scanner state in UPI modal
  const [upiScannerOpen, setUpiScannerOpen] = useState(false);
  const [upiScannerMode, setUpiScannerMode] = useState('upload'); // 'upload' | 'camera'
  const [upiScanning, setUpiScanning] = useState(false);
  const [upiScanResult, setUpiScanResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // UPI Merchant Details (customizable)
  const UPI_VPA = 'reconcileai@upi'; // Replace with actual UPI VPA
  const UPI_MERCHANT_NAME = 'AI Reconciliation System';

  // Load plans & current subscription
  useEffect(() => {
    loadDashboardData();
    loadInvoices();
  }, []);

  // Cleanup UPI timer & camera on unmount
  useEffect(() => {
    return () => { 
      if (upiTimerRef.current) clearInterval(upiTimerRef.current);
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
      console.warn('Camera access denied or failed:', err);
      setCameraError('Camera access permission denied or unavailable. You can upload a payment screenshot instead.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
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
    await processReceiptScan({ imageBase64: base64, expectedAmount: upiPlanData?.amount });
  };

  const handleReceiptFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('receipt', file);
    if (upiPlanData?.amount) {
      formData.append('expectedAmount', upiPlanData.amount);
    }
    await processReceiptScan(formData);
  };

  const processReceiptScan = async (payload) => {
    setUpiScanning(true);
    setUpiScanResult(null);
    try {
      const res = await scanPaymentReceipt(payload);
      if (res.success && res.data) {
        setUpiScanResult(res.data);
        if (res.data.utrNumber) {
          setUtrInput(res.data.utrNumber);
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
      alert('Scanning error: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpiScanning(false);
    }
  };

  const handleTestPresetScan = async (presetApp) => {
    const dummyPresets = {
      PhonePe: {
        rawText: `PhonePe Transaction Successful. Paid to: AI Reconciliation System (reconcileai@upi). UTR No: 428${Math.floor(100000000 + Math.random() * 900000000)}. Amount: Rs. ${upiPlanData?.amount || 2499}. Bank Ref: 428317293841`,
        expectedAmount: upiPlanData?.amount || 2499
      },
      GPay: {
        rawText: `Google Pay Payment completed. Recipient: reconcileai@upi. UPI transaction ID: 502${Math.floor(100000000 + Math.random() * 900000000)}. Google transaction ID: CICAgICQ5-G7FA. Amount: INR ${upiPlanData?.amount || 2499}`,
        expectedAmount: upiPlanData?.amount || 2499
      },
      Paytm: {
        rawText: `Paytm Payments Bank. Money sent successfully to AI Reconciliation System. UPI Ref No (UTR): 312${Math.floor(100000000 + Math.random() * 900000000)}. Amount: Rs ${upiPlanData?.amount || 2499}`,
        expectedAmount: upiPlanData?.amount || 2499
      }
    };

    const chosen = dummyPresets[presetApp] || dummyPresets.PhonePe;
    await processReceiptScan(chosen);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes] = await Promise.all([
        fetchSubscriptionPlans(),
        fetchCurrentSubscription()
      ]);

      if (plansRes.success) {
        setPlans(plansRes.plans);
      }
      if (subRes.success) {
        setCurrentSub(subRes.subscription);
        if (subRes.subscription.billingCycle) {
          setBillingCycle(subRes.subscription.billingCycle);
        }
      }
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      setStatusMessage({
        type: 'error',
        text: 'Failed to fetch subscription details. Please check your connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const res = await fetchBillingHistory({ status: statusFilter });
      if (res.success) {
        setInvoices(res.invoices || []);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  /**
   * Plan Selection - Show payment method picker
   */
  const handleSelectPlan = (planId) => {
    if (planId === 'free') {
      if (window.confirm('Downgrading to Free tier will cancel your recurring plan at the end of the billing period. Proceed?')) {
        handleCancelSubscription('Downgraded to Free Starter');
      }
      return;
    }

    if (currentSub?.planId === planId && currentSub?.billingCycle === billingCycle && currentSub?.status === 'active') {
      alert('You are already subscribed to this plan.');
      return;
    }

    setPendingPlanId(planId);
    setShowPaymentMethodModal(true);
  };

  /**
   * Razorpay Checkout Handler
   */
  const handleRazorpayCheckout = async (planId) => {
    setShowPaymentMethodModal(false);
    setActionLoading(true);
    setStatusMessage({ type: 'info', text: 'Initializing secure Razorpay Checkout session...' });

    try {
      // Step 1: Load Razorpay script
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        throw new Error('Razorpay SDK failed to load. Please verify your internet connection.');
      }

      // Step 2: Create Checkout Session on backend
      const session = await createCheckoutSession({
        planId,
        cycle: billingCycle,
        customerDetails: {
          name: user?.name,
          email: user?.email,
          contact: '9876543210'
        }
      });

      if (!session.success && !session.orderId) {
        throw new Error(session.message || 'Failed to initialize payment order on server.');
      }

      // Step 3: Configure Razorpay Checkout modal
      const options = {
        key: session.keyId,
        amount: session.amountInPaise,
        currency: session.currency || 'INR',
        name: 'AI Reconciliation System',
        description: `${session.planName} (${session.cycle.toUpperCase()}) Subscription`,
        image: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png',
        order_id: session.orderId,
        prefill: {
          name: session.customerDetails?.name || user?.name || '',
          email: session.customerDetails?.email || user?.email || '',
          contact: session.customerDetails?.contact || '9876543210'
        },
        theme: {
          color: '#06b6d4' // Cyan-500 matching app theme
        },
        modal: {
          ondismiss: function () {
            setActionLoading(false);
            setStatusMessage({
              type: 'error',
              text: 'Checkout was cancelled by user. No funds were debited.'
            });
          }
        },
        handler: async function (response) {
          // Step 4: Cryptographic signature verification on backend
          setStatusMessage({
            type: 'info',
            text: 'Verifying payment signature and activating plan limits...'
          });

          try {
            const verifyRes = await verifySubscriptionPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId,
              cycle: billingCycle,
              method: 'upi',
              customerDetails: {
                name: user?.name,
                email: user?.email
              }
            });

            if (verifyRes.success) {
              setStatusMessage({
                type: 'success',
                text: verifyRes.message || 'Subscription activated successfully!'
              });
              await loadDashboardData();
              await loadInvoices();
            } else {
              throw new Error(verifyRes.message || 'Verification failed on server.');
            }
          } catch (verErr) {
            console.error('Verification error:', verErr);
            setStatusMessage({
              type: 'error',
              text: verErr.response?.data?.message || verErr.message || 'Failed to verify payment signature.'
            });
          } finally {
            setActionLoading(false);
          }
        }
      };

      // Handle Sandbox simulation fallback if in test mode without live keys
      if (session.orderId?.startsWith('order_sub_sim_') || !window.Razorpay) {
        console.log('🧪 Simulating local test checkout...');
        setTimeout(async () => {
          const mockPaymentId = `pay_sim_${Date.now()}`;
          const mockSignature = `mock_sig_${Date.now()}`;

          try {
            const verifyRes = await verifySubscriptionPayment({
              razorpay_order_id: session.orderId,
              razorpay_payment_id: mockPaymentId,
              razorpay_signature: mockSignature,
              planId,
              cycle: billingCycle,
              method: 'card',
              customerDetails: {
                name: user?.name,
                email: user?.email
              }
            });

            if (verifyRes.success) {
              setStatusMessage({
                type: 'success',
                text: `🎉 Sandbox Activated! ${session.planName} has been activated with new usage limits updated instantly.`
              });
              await loadDashboardData();
              await loadInvoices();
            }
          } catch (simErr) {
            setStatusMessage({
              type: 'error',
              text: simErr.response?.data?.message || 'Sandbox activation error.'
            });
          } finally {
            setActionLoading(false);
          }
        }, 1200);
        return;
      }

      // Launch official Razorpay Checkout modal
      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();

    } catch (err) {
      console.error('Checkout error:', err);
      setActionLoading(false);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to initialize payment gateway.'
      });
    }
  };

  /**
   * UPI QR Code Checkout Handler
   */
  const handleUpiCheckout = async (planId) => {
    setShowPaymentMethodModal(false);
    setUpiInitLoading(true);
    setStatusMessage({ type: 'info', text: 'Generating UPI payment order...' });

    try {
      const session = await createCheckoutSession({
        planId,
        cycle: billingCycle,
        customerDetails: {
          name: user?.name,
          email: user?.email,
          contact: '9876543210'
        }
      });

      const selectedPlan = plans.find(p => p.id === planId);
      const price = billingCycle === 'yearly' ? selectedPlan?.yearlyPrice : selectedPlan?.monthlyPrice;

      setUpiPlanData({
        planId,
        planName: session.planName || selectedPlan?.name,
        amount: price || session.amountInPaise / 100,
        orderId: session.orderId
      });

      // Start 15-minute countdown timer
      setUpiTimer(900);
      if (upiTimerRef.current) clearInterval(upiTimerRef.current);
      upiTimerRef.current = setInterval(() => {
        setUpiTimer(prev => {
          if (prev <= 1) {
            clearInterval(upiTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setUtrInput('');
      setShowUpiModal(true);
      setStatusMessage(null);
    } catch (err) {
      console.error('UPI init error:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to generate UPI payment order.'
      });
    } finally {
      setUpiInitLoading(false);
    }
  };

  /**
   * Confirm UPI Payment with UTR
   */
  const handleConfirmUpiPayment = async () => {
    const trimmedUtr = utrInput.trim();
    if (!trimmedUtr || trimmedUtr.length < 10) {
      alert('Please enter a valid UTR / UPI Reference number (minimum 10 characters).');
      return;
    }

    setUpiLoading(true);
    try {
      const res = await confirmUpiPayment({
        orderId: upiPlanData.orderId,
        planId: upiPlanData.planId,
        cycle: billingCycle,
        utrNumber: trimmedUtr,
        amount: upiPlanData.amount,
        customerDetails: { name: user?.name, email: user?.email }
      });

      if (res.success) {
        clearInterval(upiTimerRef.current);
        setShowUpiModal(false);
        setUpiPlanData(null);
        setStatusMessage({
          type: 'success',
          text: res.message || '✅ UPI payment submitted! Your plan will activate after verification (typically within 30 minutes).'
        });
        await loadDashboardData();
        await loadInvoices();
      } else {
        throw new Error(res.message || 'UPI confirmation failed.');
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to confirm UPI payment.'
      });
    } finally {
      setUpiLoading(false);
    }
  };

  const formatUpiTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getUpiQrUrl = () => {
    if (!upiPlanData) return '';
    const upiLink = `upi://pay?pa=${UPI_VPA}&pn=${encodeURIComponent(UPI_MERCHANT_NAME)}&am=${upiPlanData.amount}&cu=INR&tn=${encodeURIComponent(`${upiPlanData.planName} Subscription - ${upiPlanData.orderId}`)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}&color=0f172a&bgcolor=ffffff&qzone=2&format=png`;
  };

  /**
   * Cancel Subscription
   */
  const handleCancelSubscription = async (reason) => {
    setActionLoading(true);
    try {
      const res = await cancelSubscription(reason || cancelReason);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message
        });
        setShowCancelModal(false);
        await loadDashboardData();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to cancel subscription.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Resume Subscription
   */
  const handleResumeSubscription = async () => {
    setActionLoading(true);
    try {
      const res = await resumeSubscription();
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message
        });
        await loadDashboardData();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to resume subscription.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Download Invoice PDF
   */
  const handleDownloadPdf = async (invoice) => {
    try {
      setDownloadingId(invoice._id);
      await downloadInvoicePdf(invoice.invoiceNumber || invoice._id, invoice.invoiceNumber);
    } catch (err) {
      console.error('Download error:', err);
      alert('Could not download invoice PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ── HEADER & BREADCRUMBS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 font-semibold mb-1">
            <Zap size={16} />
            <span>Billing & Subscriptions Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Subscription Plans & Quotas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Seamlessly upgrade your AI reconciliation capacity, track usage limits in real-time, and download verified tax invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const el = document.getElementById('billing-history-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2 shadow-sm"
          >
            <FileText size={16} />
            <span>Billing History ({invoices.length})</span>
          </button>
        </div>
      </div>

      {/* ── ALERT / STATUS BANNER ── */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-start justify-between gap-3 shadow-md animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMessage.type === 'success' && <CheckCircle2 className="shrink-0 text-emerald-500" size={20} />}
            {statusMessage.type === 'error' && <XCircle className="shrink-0 text-rose-500" size={20} />}
            {statusMessage.type === 'info' && <RefreshCw className="shrink-0 text-cyan-500 animate-spin" size={20} />}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── 1. ACTIVE SUBSCRIPTION & LIVE QUOTAS SUMMARY ── */}
      {currentSub && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Plan Card */}
          <div className="lg:col-span-1 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-6 shadow-xl border border-slate-700/60 relative overflow-hidden flex flex-col justify-between">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {currentSub.planId.toUpperCase()} TIER
                </span>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-semibold ${
                    currentSub.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : currentSub.status === 'cancelled'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {currentSub.cancelAtPeriodEnd ? 'Cancels at Period End' : currentSub.status.toUpperCase()}
                </span>
              </div>

              <h3 className="text-2xl font-bold tracking-tight text-white">{currentSub.planName}</h3>
              <p className="text-xs text-slate-300 mt-1">
                {currentSub.price === 0
                  ? 'Free tier for personal testing & small statement batches.'
                  : `Billed ${currentSub.billingCycle} with automated recurring renewal.`}
              </p>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-cyan-400">
                  Rs. {currentSub.price.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-400">
                  / {currentSub.billingCycle}
                </span>
              </div>

              {/* Renewal info */}
              <div className="mt-5 space-y-2 text-xs text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Next Billing Date:</span>
                  <span className="font-semibold text-white">
                    {new Date(currentSub.currentPeriodEnd).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Days Remaining:</span>
                  <span className="font-semibold text-cyan-300">{currentSub.daysRemaining} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Auto-Renewal:</span>
                  <span className={`font-semibold ${currentSub.autoRenew ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {currentSub.autoRenew ? 'Enabled (Active)' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions on active plan */}
            <div className="mt-6 pt-4 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
              {currentSub.planId !== 'free' && (
                <>
                  {currentSub.cancelAtPeriodEnd ? (
                    <button
                      onClick={handleResumeSubscription}
                      disabled={actionLoading}
                      className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />
                      <span>Re-activate Auto-Renewal</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={actionLoading}
                      className="w-full py-2 px-3 text-xs font-medium rounded-lg border border-slate-700 hover:border-rose-500/60 text-slate-300 hover:text-rose-300 transition-colors"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Real-time Quota Meters Card */}
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-cyan-600 dark:text-cyan-400" size={20} />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Live Monthly Usage Quotas
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  <Clock size={13} />
                  <span>Resets in {currentSub.daysRemaining} days</span>
                </div>
              </div>

              <div className="space-y-6 mt-4">
                {/* Meter 1: Reconciliation Jobs */}
                <div>
                  <div className="flex justify-between items-center text-sm mb-1.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Layers size={16} className="text-cyan-500" />
                      Reconciliation Jobs This Month
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {currentSub.usage.jobsUsedThisMonth} / {currentSub.usage.jobsLimit >= 999999 ? 'Unlimited' : currentSub.usage.jobsLimit} jobs
                      <span className="text-slate-400 ml-1.5">({currentSub.usage.jobsPercentage}%)</span>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        currentSub.usage.jobsPercentage > 90
                          ? 'bg-rose-500'
                          : currentSub.usage.jobsPercentage > 75
                          ? 'bg-amber-500'
                          : 'bg-cyan-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(4, currentSub.usage.jobsPercentage))}%` }}
                    />
                  </div>
                </div>

                {/* Meter 2: Transactions Processed */}
                <div>
                  <div className="flex justify-between items-center text-sm mb-1.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <CreditCard size={16} className="text-emerald-500" />
                      Statement Transactions Volume
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {currentSub.usage.transactionsProcessedThisMonth.toLocaleString('en-IN')} / {currentSub.usage.transactionsLimit >= 999999 ? 'Unlimited' : `${currentSub.usage.transactionsLimit.toLocaleString('en-IN')} / batch`}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(4, currentSub.usage.transactionsPercentage || 8))}%` }}
                    />
                  </div>
                </div>

                {/* Meter 3: AI Precision Checks */}
                <div>
                  <div className="flex justify-between items-center text-sm mb-1.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-500" />
                      AI High-Confidence Fuzzy Matching Checks
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {currentSub.usage.aiChecksUsed} / {currentSub.usage.aiChecksLimit >= 999999 ? 'Unlimited' : currentSub.usage.aiChecksLimit} runs
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(4, Math.round((currentSub.usage.aiChecksUsed / (currentSub.usage.aiChecksLimit || 10)) * 100))
                        )}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Instant upgrade encouragement banner */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-cyan-500 shrink-0" />
                <span>Need more job capacity? Upgrading activates instant higher limits.</span>
              </span>
              <button
                onClick={() => {
                  const el = document.getElementById('pricing-plans-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>View All Tiers</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. PRICING PLANS & BILLING CYCLE SELECTOR ── */}
      <div id="pricing-plans-section" className="space-y-6 pt-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Select Your Subscription Plan
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Choose the tier that matches your ledger audit volume. Switch between monthly or yearly billing anytime.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-6 inline-flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Yearly Billing</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-400 text-slate-950">
                SAVE ~17%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {plans.map((plan) => {
            const isCurrent = currentSub?.planId === plan.id;
            const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 relative ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-white to-cyan-50/40 dark:from-slate-900 dark:to-slate-900/90 border-2 border-cyan-500 shadow-xl shadow-cyan-500/10'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                } ${isCurrent ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-950' : ''}`}
              >
                {/* Popular / Current Badge */}
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase shadow-md">
                    MOST POPULAR
                  </div>
                )}
                {isCurrent && !plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-0.5 rounded-full text-xs font-bold uppercase shadow-sm">
                    ACTIVE PLAN
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">{plan.name}</h4>
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {plan.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[36px]">{plan.description}</p>

                  {/* Price */}
                  <div className="mt-5 mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                        Rs. {price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        / {billingCycle}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && price > 0 && (
                      <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mt-1">
                        ~Rs. {monthlyEquivalent.toLocaleString('en-IN')}/mo (2 Months Free!)
                      </p>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Features & Quotas:</p>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle2 size={15} className="text-cyan-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action CTA Button */}
                <div className="mt-8 pt-4">
                  {isCurrent && currentSub?.billingCycle === billingCycle ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 cursor-default flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      <span>Current Active Plan</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={actionLoading}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                        plan.highlight
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                      }`}
                    >
                      {actionLoading || upiInitLoading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard size={14} />
                          <span>
                            {isCurrent
                              ? `Switch to ${billingCycle.toUpperCase()}`
                              : plan.id === 'free'
                              ? 'Downgrade to Free'
                              : `Upgrade to ${plan.name}`}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. BILLING HISTORY & VERIFIED INVOICES ── */}
      <div id="billing-history-section" className="space-y-4 pt-8 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="text-cyan-500" size={22} />
              Billing History & Verified Invoices
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Download official GST tax invoices for accounting, business expenses, and audit compliance.
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-1.5 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">All Invoices</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {invoicesLoading ? (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw className="animate-spin mx-auto mb-2 text-cyan-500" size={24} />
              <span className="text-xs">Loading billing records...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-10 text-center text-slate-500 dark:text-slate-400">
              <FileText className="mx-auto mb-2 text-slate-300 dark:text-slate-700" size={32} />
              <p className="text-sm font-semibold">No invoices recorded yet.</p>
              <p className="text-xs mt-1">Invoices will be automatically generated upon your first subscription activation.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Plan & Cycle</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(inv.paidAt || inv.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white">{inv.planName}</span>
                        <span className="text-slate-400 ml-1.5 uppercase text-[10px]">({inv.billingCycle})</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        Rs. {Number(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-500 uppercase">
                        {inv.method || 'UPI/Card'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            inv.status === 'paid'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          <CheckCircle2 size={12} />
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(inv)}
                            disabled={downloadingId === inv._id}
                            className="px-2.5 py-1 text-xs rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            {downloadingId === inv._id ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Download size={12} />
                            )}
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. CANCEL SUBSCRIPTION MODAL ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Cancel Active Subscription?
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Your subscription will remain active until{' '}
              <strong className="text-slate-900 dark:text-white">
                {new Date(currentSub.currentPeriodEnd).toLocaleDateString('en-IN')}
              </strong>
              . You won't be charged again, and you will revert to the Free Starter tier after this period.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Help us improve: Why are you cancelling?
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-2.5 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="Too expensive for current volume">Too expensive for current volume</option>
                <option value="Temporary audit project finished">Temporary audit project finished</option>
                <option value="Switching to another accounting tool">Switching to another accounting tool</option>
                <option value="Missing a specific bank format or feature">Missing a specific bank format or feature</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                Keep My Plan
              </button>
              <button
                onClick={() => handleCancelSubscription(cancelReason)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw size={12} className="animate-spin" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. VIEW INVOICE RECEIPT MODAL ── */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="text-cyan-500" size={20} />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Invoice {selectedInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div>
                  <span className="text-slate-400 block">Issue Date</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {new Date(selectedInvoice.paidAt || selectedInvoice.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Status</span>
                  <span className="font-semibold text-emerald-500 uppercase">
                    {selectedInvoice.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Method</span>
                  <span className="font-semibold text-slate-900 dark:text-white uppercase">
                    {selectedInvoice.method}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Razorpay Ref</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block">
                    {selectedInvoice.razorpayPaymentId || 'pay_verified'}
                  </span>
                </div>
              </div>

              {/* Line Item */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                <div className="flex justify-between font-semibold text-slate-900 dark:text-white mb-1">
                  <span>{selectedInvoice.planName} Subscription</span>
                  <span>Rs. {Number(selectedInvoice.subtotal || selectedInvoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Billing cycle: {selectedInvoice.billingCycle?.toUpperCase()}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span>Rs. {Number(selectedInvoice.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1">
                    <span>Total Paid:</span>
                    <span className="text-cyan-600 dark:text-cyan-400">
                      Rs. {Number(selectedInvoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadPdf(selectedInvoice)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm flex items-center gap-1.5"
              >
                <Download size={14} />
                <span>Download Official PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* ── PAYMENT METHOD SELECTOR MODAL ── */}
      {showPaymentMethodModal && pendingPlanId && (() => {
        const selPlan = plans.find(p => p.id === pendingPlanId);
        const price = billingCycle === 'yearly' ? selPlan?.yearlyPrice : selPlan?.monthlyPrice;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Choose Payment Method</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selPlan?.name} &mdash; Rs.&nbsp;{price?.toLocaleString('en-IN')} / {billingCycle}
                  </p>
                </div>
                <button
                  onClick={() => { setShowPaymentMethodModal(false); setPendingPlanId(null); }}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {/* Razorpay Option */}
                <button
                  id="btn-razorpay-checkout"
                  onClick={() => handleRazorpayCheckout(pendingPlanId)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-500 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 transition-all group text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-cyan-100 dark:bg-cyan-950/60 flex items-center justify-center shrink-0 group-hover:bg-cyan-200 dark:group-hover:bg-cyan-900/60 transition-colors">
                    <CreditCard className="text-cyan-600 dark:text-cyan-400" size={22} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Razorpay Secure Checkout</p>
                    <p className="text-xs text-slate-500 mt-0.5">Cards, Net Banking, Wallets, UPI — instant activation</p>
                  </div>
                  <ArrowRight size={18} className="text-slate-400 group-hover:text-cyan-500 transition-colors" />
                </button>

                {/* UPI QR Option */}
                <button
                  id="btn-upi-qr-checkout"
                  onClick={() => handleUpiCheckout(pendingPlanId)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 transition-all group text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center shrink-0 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/60 transition-colors">
                    <QrCode className="text-violet-600 dark:text-violet-400" size={22} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Pay via UPI QR Code</p>
                    <p className="text-xs text-slate-500 mt-0.5">Scan QR with any UPI app — GPay, PhonePe, Paytm</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                      MANUAL
                    </span>
                    <ArrowRight size={18} className="text-slate-400 group-hover:text-violet-500 transition-colors" />
                  </div>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-4 text-center">
                <ShieldCheck size={11} className="inline mr-1 text-emerald-500" />
                All transactions are secured with 256-bit SSL encryption.
              </p>
            </div>
          </div>
        );
      })()}

      {/* ── UPI QR CODE PAYMENT MODAL ── */}
      {showUpiModal && upiPlanData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

            {/* Header gradient bar */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <QrCode size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg leading-tight">UPI QR Payment</h3>
                    <p className="text-xs text-violet-200">{upiPlanData.planName} &mdash; {billingCycle}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowUpiModal(false); clearInterval(upiTimerRef.current); }}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Amount + Timer row */}
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-violet-200 mb-0.5">Amount to Pay</p>
                  <div className="flex items-baseline gap-1">
                    <IndianRupee size={18} className="text-white" />
                    <span className="text-3xl font-extrabold">{upiPlanData.amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                  upiTimer < 120 ? 'bg-rose-500/30 border border-rose-400/40' : 'bg-white/15 border border-white/20'
                }`}>
                  <Timer size={16} className={upiTimer < 120 ? 'text-rose-200 animate-pulse' : 'text-violet-200'} />
                  <div className="text-right">
                    <p className="text-[10px] text-violet-200">Expires in</p>
                    <p className={`font-mono font-bold text-sm ${
                      upiTimer < 120 ? 'text-rose-200' : 'text-white'
                    }`}>{formatUpiTimer(upiTimer)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* QR Code + Instructions */}
              <div className="flex flex-col sm:flex-row gap-5 items-center">
                {/* QR Code */}
                <div className="flex-shrink-0">
                  <div className="w-[180px] h-[180px] bg-white rounded-2xl border-4 border-violet-100 dark:border-violet-900/60 shadow-lg flex items-center justify-center overflow-hidden p-2">
                    {upiTimer > 0 ? (
                      <img
                        src={getUpiQrUrl()}
                        alt="UPI Payment QR Code"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentNode.innerHTML = '<div class="flex flex-col items-center justify-center gap-2 text-slate-400"><svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\'><rect width=\'5\' height=\'5\' x=\'3\' y=\'3\' rx=\'1\'/><rect width=\'5\' height=\'5\' x=\'16\' y=\'3\' rx=\'1\'/><rect width=\'5\' height=\'5\' x=\'3\' y=\'16\' rx=\'1\'/><path d=\'M21 16h-3a2 2 0 0 0-2 2v3\'/><path d=\'M21 21v.01\'/><path d=\'M12 7v3a2 2 0 0 1-2 2H7\'/><path d=\'M3 12h.01\'/><path d=\'M12 3h.01\'/><path d=\'M12 16v.01\'/><path d=\'M16 12h1\'/><path d=\'M21 12v.01\'/><path d=\'M12 21v-1\'/></svg><p class=\'text-xs text-center px-2\'>Scan with any UPI app</p></div>';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <XCircle size={36} className="text-rose-400" />
                        <p className="text-xs text-center text-rose-500 font-semibold">QR Expired</p>
                      </div>
                    )}
                  </div>
                  <p className="text-center text-[11px] text-slate-500 mt-2">Scan with any UPI App</p>
                </div>

                {/* App logos + Steps */}
                <div className="flex-1 space-y-3 w-full">
                  {/* Accepted apps */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                      <span key={app} className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{app}</span>
                    ))}
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                      <span>Open your UPI app and tap <strong>Scan QR</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                      <span>Scan the QR code and pay <strong>Rs.&nbsp;{upiPlanData.amount.toLocaleString('en-IN')}</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                      <span>Copy the <strong>UTR / Reference number</strong> from your app</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
                      <span>Paste it below and click <strong>Confirm Payment</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* UPI VPA display */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Pay to UPI ID</p>
                    <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{UPI_VPA}</p>
                    <p className="text-[11px] text-slate-500">{UPI_MERCHANT_NAME}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(UPI_VPA);
                      setUpiCopied(true);
                      setTimeout(() => setUpiCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                  >
                    {upiCopied ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {upiCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Order Ref:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate ml-2">{upiPlanData.orderId}</span>
                </div>
              </div>

              {/* ── AI PAYMENT SCANNER (Screenshot OCR & Live Camera) ── */}
              <div className="rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center">
                      <ScanLine size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        AI Payment Scanner
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white uppercase tracking-wider">
                          Auto-Fill UTR
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Scan payment screenshot or receipt without manual typing</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUpiScannerOpen(prev => !prev);
                      if (cameraActive) stopCamera();
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/50 transition-colors"
                  >
                    {upiScannerOpen ? 'Hide Scanner' : 'Open Scanner'}
                  </button>
                </div>

                {upiScannerOpen && (
                  <div className="pt-2 border-t border-violet-200/60 dark:border-violet-900/40 space-y-3">
                    {/* Mode Tabs */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUpiScannerMode('upload');
                          if (cameraActive) stopCamera();
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                          upiScannerMode === 'upload'
                            ? 'bg-violet-600 text-white font-bold shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <UploadCloud size={14} />
                        <span>Upload Screenshot</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUpiScannerMode('camera');
                          startCamera();
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                          upiScannerMode === 'camera'
                            ? 'bg-violet-600 text-white font-bold shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Camera size={14} />
                        <span>Camera Scanner</span>
                      </button>
                    </div>

                    {/* Mode 1: File Upload */}
                    {upiScannerMode === 'upload' && (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-violet-300 dark:border-violet-800/80 hover:border-violet-500 rounded-xl p-4 text-center cursor-pointer bg-white/60 dark:bg-slate-900/60 transition-all hover:bg-violet-50 dark:hover:bg-violet-950/30 group"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleReceiptFileChange}
                          className="hidden"
                        />
                        <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center mx-auto mb-2 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                          <ImageIcon size={20} />
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Click or drag payment screenshot here
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Supports GPay, PhonePe, Paytm, BHIM, Bank SMS screenshot (.jpg, .png, .pdf)
                        </p>
                      </div>
                    )}

                    {/* Mode 2: Camera Scanner */}
                    {upiScannerMode === 'camera' && (
                      <div className="space-y-2">
                        {cameraError ? (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
                            <p>{cameraError}</p>
                            <button
                              type="button"
                              onClick={() => setUpiScannerMode('upload')}
                              className="mt-2 text-xs font-bold text-amber-800 dark:text-amber-200 underline"
                            >
                              Switch to File Upload
                            </button>
                          </div>
                        ) : (
                          <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video max-h-52 flex items-center justify-center border-2 border-violet-500/50 shadow-inner">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                            />
                            {/* Scanner Reticle Overlay */}
                            <div className="absolute inset-4 border-2 border-dashed border-cyan-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                              <div className="flex justify-between text-[10px] font-mono text-cyan-300 bg-slate-950/60 px-1.5 py-0.5 rounded self-start">
                                [SCANNING RECEIPT]
                              </div>
                              {/* Laser sweep animation line */}
                              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-pulse" />
                              <div className="text-[10px] text-center text-slate-200 bg-slate-950/70 px-2 py-0.5 rounded self-center backdrop-blur-sm">
                                Align UTR / Reference number inside frame
                              </div>
                            </div>
                            <canvas ref={canvasRef} className="hidden" />
                          </div>
                        )}

                        {cameraActive && !cameraError && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={captureCameraFrame}
                              disabled={upiScanning}
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-md flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Camera size={14} />
                              <span>Capture &amp; Auto-Extract</span>
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                            >
                              Stop
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Test Preset Buttons */}
                    <div className="pt-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1">
                        <Sparkles size={11} className="text-violet-500" />
                        Quick Test Simulators (1-Click Test):
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['PhonePe', 'GPay', 'Paytm'].map((app) => (
                          <button
                            key={app}
                            type="button"
                            onClick={() => handleTestPresetScan(app)}
                            disabled={upiScanning}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-violet-500 hover:text-violet-600 transition-all flex items-center gap-1"
                          >
                            <span>Test {app} Slip</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scanning Spinner */}
                    {upiScanning && (
                      <div className="p-3 rounded-xl bg-violet-100/80 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-800 text-violet-800 dark:text-violet-200 text-xs flex items-center gap-2.5 animate-pulse">
                        <RefreshCw size={15} className="animate-spin text-violet-600 dark:text-violet-400 shrink-0" />
                        <span>AI OCR Engine analyzing payment receipt &amp; identifying 12-digit UTR...</span>
                      </div>
                    )}

                    {/* Extraction Result Badge */}
                    {upiScanResult && !upiScanning && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 size={15} className="text-emerald-500" />
                            UTR Extracted Successfully!
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                            {upiScanResult.confidenceRate}% Confidence
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans">Detected UTR:</span>
                            <span className="font-extrabold text-slate-900 dark:text-white bg-white/70 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 inline-block">
                              {upiScanResult.utrNumber}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans">Detected App:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {upiScanResult.appName}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 pt-0.5">
                          ✓ Auto-populated into UTR field below. Ready to confirm!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* UTR Input */}
              <div>
                <label htmlFor="utr-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  UTR / UPI Reference Number *
                </label>
                <div className="relative">
                  <input
                    id="utr-input"
                    type="text"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    placeholder="e.g. 428317293456 or UPI123456789"
                    maxLength={30}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 placeholder-slate-400 transition-colors pr-10"
                  />
                  {utrInput && utrInput.length >= 10 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 flex items-center">
                      <CheckCircle2 size={18} />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Find your UTR in your UPI app under payment history or use the scanner above to auto-detect.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowUpiModal(false); clearInterval(upiTimerRef.current); }}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-upi"
                  onClick={handleConfirmUpiPayment}
                  disabled={upiLoading || !utrInput.trim() || upiTimer === 0}
                  className="flex-1 py-2.5 px-4 text-xs font-bold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {upiLoading ? (
                    <><RefreshCw size={14} className="animate-spin" /><span>Verifying...</span></>
                  ) : (
                    <><Wallet size={14} /><span>Confirm Payment</span></>
                  )}
                </button>
              </div>

              {upiTimer === 0 && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>QR code has expired. Please close and try again to generate a new payment order.</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 text-center">
                <ShieldCheck size={11} className="inline mr-1 text-emerald-500" />
                Your plan activates after our team verifies the UTR (typically within 30 minutes).
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
