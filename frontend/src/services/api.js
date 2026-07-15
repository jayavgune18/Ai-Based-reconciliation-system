import axios from 'axios';

// Create axios instance
// In development, requests go through Vite proxy (/api -> localhost:5000)
// In production, VITE_API_BASE_URL should be set to the actual backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable credentials for cross-origin requests (cookies)
  withCredentials: true,
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('recon_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log API calls in development only - VITE_ENV should be set in .env files
    if (import.meta.env.DEV || import.meta.env.VITE_ENV === 'development') {
      console.log(`🚀 API ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - clear token and redirect
    if (error.response?.status === 401) {
      localStorage.removeItem('recon_token');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    
    // Log API errors in development only
    if (import.meta.env.DEV || import.meta.env.VITE_ENV === 'development') {
      console.error(`❌ API Error [${error.response?.status}]:`, error.response?.data?.message || error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;