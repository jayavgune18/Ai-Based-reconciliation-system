import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import {
  User,
  Save,
  Camera,
  Shield,
  Key,
  Smartphone,
  Trash2,
  Power,
  LogOut,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  ChevronRight,
  FileText,
  Database,
  Activity,
  Monitor,
  Globe,
  Clock,
} from 'lucide-react';

// ─── Tab Configuration ───────────────────────────────────────────────────────
const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'password', label: 'Password', icon: Key },
  { id: 'sessions', label: 'Devices & Sessions', icon: Smartphone },
  { id: 'account', label: 'Account Options', icon: Shield },
];

// ─── Toast Notification Component ───────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-amber-500';
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? X : AlertTriangle;

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-base font-medium animate-in slide-in-from-right-5 duration-300 ${bgColor}`}>
      <Icon size={20} />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X size={18} />
      </button>
    </div>
  );
};

// ─── Avatar Upload Component ────────────────────────────────────────────────
const AvatarUpload = ({ currentAvatar, userName, onUpload }) => {
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    onUpload(file);
  };

  return (
    <label className="relative cursor-pointer group">
      <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-cyan-500/30 group-hover:ring-cyan-500 transition-all duration-200">
        {preview || currentAvatar ? (
          <img src={preview || currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-white text-2xl">
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Camera size={20} className="text-white" />
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </label>
  );
};

// ─── Section Wrapper ────────────────────────────────────────────────────────
  const SectionCard = ({ title, description, children }) => (
  <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
    <div className="mb-6">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      {description && <p className="text-base text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
    </div>
    {children}
  </div>
);

// ─── Input Field ────────────────────────────────────────────────────────────
  const FormInput = ({ label, id, type = 'text', value, onChange, placeholder, error, disabled, icon: Icon, rightElement }) => (
  <div className="space-y-2">
    {label && (
      <label htmlFor={id} className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon size={18} className="text-slate-400" />
        </div>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3 text-base rounded-lg border bg-slate-50 dark:bg-slate-800/50 
          ${error ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:ring-cyan-500/20'} 
          focus:outline-none focus:ring-2 focus:border-cyan-500 dark:focus:border-cyan-500
          text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500
          disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
      />
      {rightElement && (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
          {rightElement}
        </div>
      )}
    </div>
    {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
  </div>
);

// ─── Confirm Modal ──────────────────────────────────────────────────────────
const ConfirmModal = ({ isOpen, title, message, confirmLabel, confirmVariant = 'danger', onConfirm, onCancel, children }) => {
  if (!isOpen) return null;

  const confirmColors = confirmVariant === 'danger'
    ? 'bg-red-500 hover:bg-red-600'
    : confirmVariant === 'warning'
    ? 'bg-amber-500 hover:bg-amber-600'
    : 'bg-cyan-500 hover:bg-cyan-600';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50 duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${confirmVariant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
            <AlertTriangle size={18} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{message}</p>
        {children}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-lg transition-all duration-200 ${confirmColors}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Settings Page ─────────────────────────────────────────────────────
export const Settings = () => {
  const { user, logout, token } = useAuth();

  // ── State: Active Tab ──
  const [activeTab, setActiveTab] = useState('profile');

  // ── State: Toast ──
  const [toast, setToast] = useState(null);

  // ── State: Loading ──
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // ── State: Profile ──
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    avatar: null,
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);

  // ── State: Storage ──
  const [storageStats, setStorageStats] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // ── State: Password ──
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ── State: Sessions ──
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokeSessionId, setRevokeSessionId] = useState(null);
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  // ── State: Account Actions ──
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState(false);

  // ── Show Toast ──
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // ── Initialize Profile from User ──
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || null,
      });
    }
    const timer = setTimeout(() => setPageLoading(false), 300);
    return () => clearTimeout(timer);
  }, [user]);

  // ── Error Helper ──
  const getErrorMessage = (err) => {
    return err.response?.data?.message || err.message || 'An unexpected error occurred.';
  };

  // ═════════════════════════════════════════════════════════════════════════
  // SECTION 1 — PROFILE
  // ═════════════════════════════════════════════════════════════════════════
  const validateProfile = () => {
    const errors = {};
    if (!profile.name.trim()) errors.name = 'Name is required.';
    if (!profile.email.trim()) errors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(profile.email)) errors.email = 'Invalid email format.';
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', profile.name);
      formData.append('email', profile.email);
      if (avatarFile) formData.append('avatar', avatarFile);

      const res = await apiClient.put('/api/settings/profile', {
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
      });

      if (res.data.success) {
        showToast('Profile updated successfully!');
        setProfileErrors({});
        setAvatarFile(null);
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (file) => {
    setAvatarFile(file);
    // Convert file to base64 data URL for permanent storage (survives restart)
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfile((prev) => ({ ...prev, avatar: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // ═════════════════════════════════════════════════════════════════════════
  // SECTION 2 — STORAGE STATS
  // ═════════════════════════════════════════════════════════════════════════
  const fetchStorageStats = useCallback(async () => {
    setStorageLoading(true);
    try {
      const res = await apiClient.get('/api/settings/storage');
      if (res.data.success) {
        setStorageStats(res.data.storage);
      }
    } catch (err) {
      console.error('Failed to load storage stats:', err);
    } finally {
      setStorageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'storage') {
      fetchStorageStats();
    }
  }, [activeTab, fetchStorageStats]);

  // ═════════════════════════════════════════════════════════════════════════
  // SECTION 3 — CHANGE PASSWORD
  // ═════════════════════════════════════════════════════════════════════════
  const validatePassword = () => {
    const errors = {};
    if (!passwordForm.currentPassword) errors.currentPassword = 'Current password is required.';
    if (!passwordForm.newPassword) errors.newPassword = 'New password is required.';
    else if (passwordForm.newPassword.length < 6) errors.newPassword = 'Minimum 6 characters.';
    if (!passwordForm.confirmNewPassword) errors.confirmNewPassword = 'Please confirm your new password.';
    else if (passwordForm.newPassword !== passwordForm.confirmNewPassword) errors.confirmNewPassword = 'Passwords do not match.';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setPasswordLoading(true);
    try {
      const res = await apiClient.put('/api/settings/change-password', passwordForm);
      if (res.data.success) {
        showToast('Password changed successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        setPasswordErrors({});
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // SECTION 4 — SESSIONS / DEVICES
  // ═════════════════════════════════════════════════════════════════════════
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await apiClient.get('/api/settings/sessions');
      if (res.data.success) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab, fetchSessions]);

  const handleRevokeSession = async (sessionId) => {
    try {
      const res = await apiClient.delete(`/api/settings/sessions/${sessionId}`);
      if (res.data.success) {
        showToast('Device session revoked successfully.');
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setRevokeSessionId(null);
    }
  };

  const handleLogoutAllDevices = async () => {
    setLogoutAllLoading(true);
    try {
      const res = await apiClient.post('/api/settings/logout-all');
      if (res.data.success) {
        showToast(res.data.message || 'Logged out from all other devices.');
        setSessions((prev) => prev.filter((s) => s.isCurrentSession));
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLogoutAllLoading(false);
      setShowLogoutAllModal(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // SECTION 5 — ACCOUNT OPTIONS
  // ═════════════════════════════════════════════════════════════════════════
  const handleDisableAccount = async () => {
    setAccountActionLoading(true);
    try {
      const res = await apiClient.post('/api/settings/disable-account', { password: accountPassword });
      if (res.data.success) {
        showToast('Account has been disabled.');
        setTimeout(() => logout(), 1500);
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setAccountActionLoading(false);
      setShowDisableModal(false);
      setAccountPassword('');
    }
  };

  const handleDeleteAccount = async () => {
    setAccountActionLoading(true);
    try {
      const res = await apiClient.delete('/api/settings/delete-account', {
        data: { password: accountPassword, confirmation: deleteConfirmText },
      });
      if (res.data.success) {
        showToast('Account permanently deleted.');
        setTimeout(() => logout(), 1500);
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setAccountActionLoading(false);
      setShowDeleteModal(false);
      setAccountPassword('');
      setDeleteConfirmText('');
    }
  };

  // ── Device Icon Helper ──
  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return Monitor;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return Smartphone;
    if (ua.includes('tablet') || ua.includes('ipad')) return Monitor;
    return Monitor;
  };

  const getDeviceName = (session) => {
    if (session.deviceName) return session.deviceName;
    const ua = session.userAgent?.toLowerCase() || '';
    if (ua.includes('mobile')) return 'Mobile Device';
    if (ua.includes('tablet') || ua.includes('ipad')) return 'Tablet';
    if (ua.includes('chrome')) return 'Chrome Browser';
    if (ua.includes('firefox')) return 'Firefox Browser';
    if (ua.includes('safari')) return 'Safari Browser';
    if (ua.includes('edge')) return 'Edge Browser';
    return 'Unknown Device';
  };

  const formatLastActive = (date) => {
    if (!date) return 'Unknown';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // ── Loading State ──
  if (pageLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
          Manage your account, security, and preferences
        </p>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-0.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3.5 text-base font-semibold rounded-t-lg transition-all duration-200 
                ${isActive
                  ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
            >
              <Icon size={20} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="animate-in fade-in-50 duration-200">
        {activeTab === 'profile' && (
          <div className="max-w-2xl space-y-6">
            {/* Profile Form */}
            <SectionCard title="Personal Information" description="Update your name, email, and profile picture.">
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                {/* Avatar Upload */}
                <div className="flex items-center gap-5">
                  <AvatarUpload
                    currentAvatar={profile.avatar}
                    userName={profile.name}
                    onUpload={handleAvatarUpload}
                  />
                  <div className="text-base text-slate-400">
                    <p className="font-medium text-slate-500 dark:text-slate-400">Profile Photo</p>
                    <p>JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>

                <FormInput
                  label="Full Name"
                  id="name"
                  icon={User}
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  error={profileErrors.name}
                  placeholder="Enter your full name"
                />

                <FormInput
                  label="Email Address"
                  id="email"
                  type="email"
                  icon={Globe}
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  error={profileErrors.email}
                  placeholder="Enter your email"
                />

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 text-base font-bold text-white bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 rounded-lg shadow-lg shadow-cyan-500/20 transition-all duration-200"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </SectionCard>

            {/* Role & Account Info */}
            <SectionCard title="Account Information" description="Your current account details.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Role</p>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-1 capitalize">{user?.role || 'User'}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Verification Status</p>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                    {user?.isVerified ? (
                      <>
                        <CheckCircle size={18} className="text-emerald-500" />
                        <span className="text-emerald-500">Verified</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={18} className="text-amber-500" />
                        <span className="text-amber-500">Unverified</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="max-w-2xl space-y-6">
            <SectionCard title="Storage Overview" description="Track your data usage across the system.">
              {storageLoading && !storageStats ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-cyan-500" />
                </div>
              ) : storageStats ? (
                <div className="space-y-6">
                  {/* Storage Meter */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-bold text-slate-700 dark:text-slate-300">
                        {storageStats.used.kb.toFixed(2)} KB used
                      </span>
                      <span className="text-sm text-slate-400">
                        {storageStats.total.mb} MB total
                      </span>
                    </div>
                    <div className="w-full h-4 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                        style={{ width: `${Math.min(storageStats.usagePercent, 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-400 mt-1.5">
                      {storageStats.usagePercent.toFixed(1)}% of quota used
                    </p>
                  </div>

                  {/* Detailed Counts */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Total Transactions', value: storageStats.details.transactions, icon: FileText, color: 'text-cyan-500 bg-cyan-500/10' },
                      { label: 'Bank Records', value: storageStats.details.bankRecords, icon: Database, color: 'text-blue-500 bg-blue-500/10' },
                      { label: 'Internal Records', value: storageStats.details.internalRecords, icon: Database, color: 'text-indigo-500 bg-indigo-500/10' },
                      { label: 'Recon Jobs', value: storageStats.details.reconciliationJobs, icon: RefreshCw, color: 'text-emerald-500 bg-emerald-500/10' },
                      { label: 'Matches', value: storageStats.details.matches, icon: CheckCircle, color: 'text-teal-500 bg-teal-500/10' },
                      { label: 'Audit Logs', value: storageStats.details.auditLogs, icon: Activity, color: 'text-amber-500 bg-amber-500/10' },
                    ].map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <div key={idx} className="p-5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded ${item.color}`}>
                              <Icon size={18} />
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{item.label}</span>
                          </div>
                          <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">{item.value}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-slate-400">Unable to load storage data.</div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="max-w-2xl space-y-6">
            <SectionCard title="Change Password" description="Update your account password regularly for security.">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <FormInput
                  label="Current Password"
                  id="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  icon={Key}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  error={passwordErrors.currentPassword}
                  placeholder="Enter current password"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPasswords.current ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />

                <FormInput
                  label="New Password"
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  icon={Key}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  error={passwordErrors.newPassword}
                  placeholder="At least 6 characters"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPasswords.new ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />

                <FormInput
                  label="Confirm New Password"
                  id="confirmNewPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  icon={Key}
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmNewPassword: e.target.value }))}
                  error={passwordErrors.confirmNewPassword}
                  placeholder="Re-enter new password"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPasswords.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex items-center gap-2 px-6 py-3 text-base font-bold text-white bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 rounded-lg shadow-lg shadow-cyan-500/20 transition-all duration-200"
                  >
                    {passwordLoading ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </SectionCard>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="max-w-2xl space-y-6">
            <SectionCard
              title="Active Sessions"
              description="Manage devices and sessions logged into your account."
            >
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-cyan-500" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No active sessions found.</div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => {
                    const DeviceIcon = getDeviceIcon(session.userAgent);
                    const isCurrent = session.isCurrentSession;
                    return (
                      <div
                        key={session._id}
                        className={`flex items-center justify-between p-6 rounded-lg border transition-all duration-200
                          ${isCurrent
                            ? 'bg-cyan-500/5 dark:bg-cyan-500/5 border-cyan-500/20 dark:border-cyan-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'
                          }`}
                      >
                        <div className="flex items-center gap-5 min-w-0">
                          <div className={`p-3 rounded-full ${isCurrent ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                            <DeviceIcon size={22} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <p className="text-base font-bold text-slate-700 dark:text-slate-300 truncate">
                                {getDeviceName(session)}
                              </p>
                              {isCurrent && (
                                <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-5 mt-1 text-sm text-slate-400">
                              <span className="flex items-center gap-1.5">
                                <Globe size={14} />
                                {session.ip || 'Unknown IP'}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock size={14} />
                                {formatLastActive(session.lastActivity)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isCurrent && (
                          <button
                            onClick={() => setRevokeSessionId(session._id)}
                            disabled={revokeSessionId === session._id}
                            className="flex-shrink-0 p-2.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            title="Revoke session"
                          >
                            {revokeSessionId === session._id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <X size={18} />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Revoke confirmation inline */}
              {revokeSessionId && (
                <div className="mt-4 p-5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <span className="text-base font-medium text-amber-600 dark:text-amber-400">
                    Revoke this session? The device will be logged out immediately.
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setRevokeSessionId(null)}
                      className="px-5 py-2 text-sm font-semibold rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRevokeSession(revokeSessionId)}
                      className="px-5 py-2 text-sm font-bold text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              )}

              {/* Logout All Devices Button */}
              {sessions.length > 1 && (
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setShowLogoutAllModal(true)}
                    className="flex items-center gap-2 px-5 py-3 text-base font-semibold text-red-500 hover:bg-red-500/5 rounded-lg transition-colors"
                  >
                    <LogOut size={18} />
                    Logout from all other devices
                  </button>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="max-w-2xl space-y-6">
            {/* Logout */}
            <SectionCard title="Logout" description="Sign out from this device only.">
              <button
                onClick={() => logout()}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut size={14} />
                Logout
              </button>
            </SectionCard>

            {/* Disable Account */}
            <SectionCard
              title="Disable Account"
              description="Temporarily disable your account. You can reactivate by contacting support or logging back in."
            >
              <button
                onClick={() => setShowDisableModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-500 bg-amber-500/5 hover:bg-amber-500/10 rounded-lg transition-colors"
              >
                <Power size={14} />
                Disable My Account
              </button>
            </SectionCard>

            {/* Delete Account */}
            <SectionCard
              title="Delete Account"
              description="Permanently delete your account and all associated data. This action cannot be undone."
            >
              <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-red-600 dark:text-red-400">
                    Deleting your account will permanently remove all your personal data, audit logs, and session information. Reconciliation jobs and transaction records will be anonymized for data integrity.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-lg shadow-red-500/20 transition-all duration-200"
              >
                <Trash2 size={14} />
                Delete My Account
              </button>
            </SectionCard>
          </div>
        )}
      </div>

      {/* ── Disable Account Modal ── */}
      <ConfirmModal
        isOpen={showDisableModal}
        title="Disable Account"
        message="Are you sure you want to disable your account? You won't be able to access the system until you reactivate."
        confirmLabel={accountActionLoading ? 'Disabling...' : 'Disable Account'}
        confirmVariant="warning"
        onConfirm={handleDisableAccount}
        onCancel={() => { setShowDisableModal(false); setAccountPassword(''); }}
      >
        <FormInput
          label="Confirm your password"
          id="disable-password"
          type="password"
          value={accountPassword}
          onChange={(e) => setAccountPassword(e.target.value)}
          placeholder="Enter your password to confirm"
        />
      </ConfirmModal>

      {/* ── Delete Account Modal ── */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Account"
        message="This action is permanent and cannot be undone. Please confirm below."
        confirmLabel={accountActionLoading ? 'Deleting...' : 'Permanently Delete'}
        confirmVariant="danger"
        onConfirm={handleDeleteAccount}
        onCancel={() => { setShowDeleteModal(false); setAccountPassword(''); setDeleteConfirmText(''); }}
      >
        <div className="space-y-3">
          <FormInput
            label="Confirm your password"
            id="delete-password"
            type="password"
            value={accountPassword}
            onChange={(e) => setAccountPassword(e.target.value)}
            placeholder="Enter your password"
          />
          <FormInput
            label='Type "CONFIRM_DELETE" to confirm'
            id="delete-confirm"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="CONFIRM_DELETE"
          />
        </div>
      </ConfirmModal>

      {/* ── Logout All Devices Modal ── */}
      <ConfirmModal
        isOpen={showLogoutAllModal}
        title="Logout All Devices"
        message="This will sign you out from all other devices and sessions. Your current session will remain active."
        confirmLabel={logoutAllLoading ? 'Logging out...' : 'Logout All'}
        confirmVariant="warning"
        onConfirm={handleLogoutAllDevices}
        onCancel={() => setShowLogoutAllModal(false)}
      />
    </div>
  );
};