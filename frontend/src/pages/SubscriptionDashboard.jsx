import React, { useState, useEffect } from 'react';
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
  X
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
  downloadInvoicePdf
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

  // Load plans & current subscription
  useEffect(() => {
    loadDashboardData();
    loadInvoices();
  }, []);

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
   * Razorpay Checkout Handler
   */
  const handleSelectPlan = async (planId) => {
    if (planId === 'free') {
      // Downgrading to free tier
      if (window.confirm('Downgrading to Free tier will cancel your recurring plan at the end of the billing period. Proceed?')) {
        handleCancelSubscription('Downgraded to Free Starter');
      }
      return;
    }

    if (currentSub?.planId === planId && currentSub?.billingCycle === billingCycle && currentSub?.status === 'active') {
      alert('You are already subscribed to this plan.');
      return;
    }

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
                      {actionLoading ? (
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
  );
};
