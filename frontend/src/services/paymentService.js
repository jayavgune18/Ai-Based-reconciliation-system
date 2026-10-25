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
 * Fetch public payment configuration (Razorpay key_id)
 */
export const getPaymentConfig = async () => {
  const response = await apiClient.get('/api/payment/config');
  return response.data;
};

/**
 * Create a new payment order securely from the backend
 */
export const createPaymentOrder = async (orderData) => {
  const response = await apiClient.post('/api/payment/create-order', orderData);
  return response.data;
};

/**
 * Verify payment signature on the backend
 */
export const verifyPaymentSignature = async (verificationData) => {
  const response = await apiClient.post('/api/payment/verify', verificationData);
  return response.data;
};

/**
 * Fetch payment transaction history
 */
export const getPaymentHistory = async (params = {}) => {
  const response = await apiClient.get('/api/payment/history', { params });
  return response.data;
};

/**
 * Fetch single payment details
 */
export const getPaymentDetails = async (id) => {
  const response = await apiClient.get(`/api/payment/${id}`);
  return response.data;
};

/**
 * Run automated financial reconciliation between Gateway & Internal Records
 */
export const runGatewayReconciliation = async (options = {}) => {
  const response = await apiClient.post('/api/payment/reconcile', options);
  return response.data;
};

/**
 * Get latest gateway reconciliation report
 */
export const getGatewayReconciliationReport = async () => {
  const response = await apiClient.get('/api/payment/reconcile/report');
  return response.data;
};

/**
 * Download Reconciliation PDF Report via Axios Blob
 */
export const downloadReconciliationPdf = async () => {
  const token = localStorage.getItem('recon_token');
  const response = await apiClient.get('/api/payment/reconcile/download-pdf', {
    responseType: 'blob',
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `GatewayReconReport-${Date.now()}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Download Reconciliation Excel Report via Axios Blob
 */
export const downloadReconciliationExcel = async () => {
  const token = localStorage.getItem('recon_token');
  const response = await apiClient.get('/api/payment/reconcile/download-excel', {
    responseType: 'blob',
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `GatewayReconLedger-${Date.now()}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};
