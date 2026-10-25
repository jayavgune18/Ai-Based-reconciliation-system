import apiClient from './api';

/**
 * Dynamically loads the Razorpay checkout script
 * @returns {Promise<boolean>}
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

/**
 * Fetch all available subscription plans with pricing & limits
 */
export const fetchSubscriptionPlans = async () => {
  const response = await apiClient.get('/api/subscriptions/plans');
  return response.data;
};

/**
 * Fetch current user's active subscription, usage quota, and limits
 */
export const fetchCurrentSubscription = async () => {
  const response = await apiClient.get('/api/subscriptions/current');
  return response.data;
};

/**
 * Create a checkout session on the backend for Razorpay
 */
export const createCheckoutSession = async ({ planId, cycle, customerDetails }) => {
  const response = await apiClient.post('/api/subscriptions/checkout', {
    planId,
    cycle,
    customerDetails
  });
  return response.data;
};

/**
 * Verify payment signature on backend and activate plan
 */
export const verifySubscriptionPayment = async (verificationPayload) => {
  const response = await apiClient.post('/api/subscriptions/verify', verificationPayload);
  return response.data;
};

/**
 * Upgrade or Downgrade subscription
 */
export const upgradeOrDowngradePlan = async ({ newPlanId, newCycle }) => {
  const response = await apiClient.post('/api/subscriptions/upgrade-downgrade', {
    newPlanId,
    newCycle
  });
  return response.data;
};

/**
 * Cancel active subscription (soft cancel retaining period)
 */
export const cancelSubscription = async (reason) => {
  const response = await apiClient.post('/api/subscriptions/cancel', { reason });
  return response.data;
};

/**
 * Re-activate subscription auto-renewal before period end
 */
export const resumeSubscription = async () => {
  const response = await apiClient.post('/api/subscriptions/resume');
  return response.data;
};

/**
 * Fetch billing history and invoices
 */
export const fetchBillingHistory = async (params = {}) => {
  const response = await apiClient.get('/api/subscriptions/invoices', { params });
  return response.data;
};

/**
 * Download official Tax Invoice PDF via Axios blob
 */
export const downloadInvoicePdf = async (invoiceId, invoiceNumber) => {
  const token = localStorage.getItem('recon_token');
  const response = await apiClient.get(`/api/subscriptions/invoices/${invoiceId}/pdf`, {
    responseType: 'blob',
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Invoice-${invoiceNumber || invoiceId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};
