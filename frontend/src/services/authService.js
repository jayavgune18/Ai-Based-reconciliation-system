import axios from 'axios';

/**
 * API client for authentication
 * Handles all auth-related API calls
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add auth token
 */
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response interceptor to handle errors
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const authService = {
  /**
   * Register new user
   *
   * @param {object} userData - User registration data
   * @returns {Promise<object>} - Registration response
   */
  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.confirmPassword,
        phone: userData.phone,
        department: userData.department,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Login user
   *
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} - Login response
   */
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get current user profile
   *
   * @returns {Promise<object>} - User profile
   */
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user profile
   *
   * @param {object} updates - Profile updates
   * @returns {Promise<object>} - Updated user
   */
  updateProfile: async (updates) => {
    try {
      const response = await apiClient.put('/auth/profile', updates);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Change password
   *
   * @param {object} passwordData - Old and new passwords
   * @returns {Promise<object>} - Response
   */
  changePassword: async (passwordData) => {
    try {
      const response = await apiClient.post('/auth/change-password', passwordData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout user
   *
   * @returns {Promise<object>} - Logout response
   */
  logout: async () => {
    try {
      const response = await apiClient.post('/auth/logout');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Deactivate account
   *
   * @returns {Promise<object>} - Response
   */
  deactivateAccount: async () => {
    try {
      const response = await apiClient.delete('/auth/account');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all users (admin only)
   *
   * @param {object} params - Query parameters
   * @returns {Promise<object>} - Users list
   */
  getAllUsers: async (params = {}) => {
    try {
      const response = await apiClient.get('/auth/users', { params });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user by ID (admin only)
   *
   * @param {string} userId - User ID
   * @returns {Promise<object>} - User object
   */
  getUserById: async (userId) => {
    try {
      const response = await apiClient.get(`/auth/users/${userId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user role (admin only)
   *
   * @param {string} userId - User ID
   * @param {string} role - New role
   * @returns {Promise<object>} - Updated user
   */
  updateUserRole: async (userId, role) => {
    try {
      const response = await apiClient.put(`/auth/users/${userId}/role`, { role });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default authService;
