import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { LandingPage } from './pages/LandingPage';
import { ReconciliationWorkbench } from './pages/ReconciliationWorkbench';
import { FraudAlerts } from './pages/FraudAlerts';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { UserManagement } from './pages/UserManagement';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }
  
  return token ? <DashboardLayout>{children}</DashboardLayout> : <Navigate to="/" replace />;
};

// Admin-Only Route Guard
const AdminRoute = ({ children }) => {
  const { token, user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }
  
  if (!token) return <Navigate to="/" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  
  return <DashboardLayout>{children}</DashboardLayout>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/workbench" 
              element={
                <ProtectedRoute>
                  <ReconciliationWorkbench />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/fraud" 
              element={
                <ProtectedRoute>
                  <FraudAlerts />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/audit" 
              element={
                <ProtectedRoute>
                  <AuditLogs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              } 
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
