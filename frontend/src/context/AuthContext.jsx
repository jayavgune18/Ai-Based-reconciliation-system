import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import apiClient from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('recon_token'));
  const [loading, setLoading] = useState(true);
  const initialFetchDone = useRef(false);
  const isManualSet = useRef(false);

  // Setup default axios interceptor for headers when token changes
  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('recon_token', token);
      
      // Skip re-fetch if user was already set by login/register
      if (isManualSet.current) {
        isManualSet.current = false;
        initialFetchDone.current = true;
        setLoading(false);
        return;
      }
      
      // Only fetch /me on page refresh (initial load), not on login/register
      if (!initialFetchDone.current) {
        initialFetchDone.current = true;
        apiClient.get('/api/auth/me')
          .then(res => {
            if (res.data.success) {
              setUser(res.data.user);
            } else {
              logout();
            }
          })
          .catch(() => {
            logout();
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
      localStorage.removeItem('recon_token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/api/auth/login', { email, password });
      if (res.data.success) {
        isManualSet.current = true;
        setToken(res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed.' };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Login failed. Incorrect credentials.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/api/auth/register', { name, email, password, role });
      if (res.data.success) {
        isManualSet.current = true;
        setToken(res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Registration failed.' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed. Try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    isManualSet.current = true;
    setToken(null);
    setUser(null);
    localStorage.removeItem('recon_token');
    delete apiClient.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);