import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { 
  Users, Search, Shield, ShieldAlert, 
  Trash2, ToggleLeft, ToggleRight, 
  AlertCircle, CheckCircle, X, 
  ChevronLeft, ChevronRight, User as UserIcon,
  Mail, Calendar, Activity
} from 'lucide-react';

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchUsers = async (pageNum = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/api/admin/users?page=${pageNum}&limit=20`);
      if (res.data.success) {
        setUsers(res.data.users);
        setTotalPages(res.data.totalPages);
        setTotal(res.data.total);
        setPage(res.data.page);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/api/admin/stats');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      // Stats are non-critical
    }
  };

  useEffect(() => {
    fetchUsers(page);
    fetchStats();
  }, []);

  const handleToggleStatus = async (userId) => {
    try {
      const res = await apiClient.put(`/api/admin/users/${userId}/status`);
      if (res.data.success) {
        setSuccess(res.data.message);
        setUsers(users.map(u => u._id === userId ? { ...u, isActive: res.data.user.isActive } : u));
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const res = await apiClient.put(`/api/admin/users/${userId}/role`, { role: newRole });
      if (res.data.success) {
        setSuccess(res.data.message);
        setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user role.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const res = await apiClient.delete(`/api/admin/users/${userId}`);
      if (res.data.success) {
        setSuccess(res.data.message);
        setUsers(users.filter(u => u._id !== userId));
        setConfirmDelete(null);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user.');
      setConfirmDelete(null);
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <ShieldAlert size={32} className="text-cyan-500" />
            User Management
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mt-1">
            Manage system users, roles, and account status
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-base flex items-center gap-2">
          <CheckCircle size={20} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-base flex items-center gap-2">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-base font-medium mb-1">
              <Users size={18} />
              Total Users
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalUsers}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-base font-medium mb-1">
              <Activity size={18} />
              Active Users
            </div>
            <p className="text-3xl font-bold text-emerald-500">{stats.activeUsers}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-base font-medium mb-1">
              <Shield size={18} />
              Admins
            </div>
            <p className="text-3xl font-bold text-cyan-500">{stats.adminCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-base font-medium mb-1">
              <Calendar size={18} />
              Verified
            </div>
            <p className="text-3xl font-bold text-blue-500">{stats.verifiedUsers}</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search size={22} />
        </div>
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-5 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition dark:text-white placeholder-slate-400"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-400 text-base">User</th>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-400 text-base">Email</th>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-400 text-base">Role</th>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-400 text-base">Status</th>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-400 text-base">Joined</th>
                <th className="text-right px-5 py-4 font-semibold text-slate-600 dark:text-slate-400 text-base">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500 text-base">
                    <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500 text-base">
                    <Users size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p>No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base shadow-md ${
                          u.role === 'admin' 
                            ? 'bg-gradient-to-br from-cyan-400 to-blue-600' 
                            : 'bg-gradient-to-br from-slate-400 to-slate-600'
                        }`}>
                          {u.name?.charAt(0).toUpperCase() || 'O'}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white truncate max-w-[180px] text-base">
                          {u.name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400 text-base">
                      <div className="flex items-center gap-1.5">
                        <Mail size={16} />
                        <span className="truncate max-w-[220px]">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                        u.role === 'admin'
                          ? 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {u.role === 'admin' ? <Shield size={14} /> : <UserIcon size={14} />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-base ${
                        u.isActive ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          u.isActive ? 'bg-emerald-500' : 'bg-red-500'
                        }`} />
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-base">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle Active Status */}
                        <button
                          onClick={() => handleToggleStatus(u._id)}
                          disabled={u._id === currentUser?.id}
                          title={u._id === currentUser?.id ? "Cannot modify your own status" : u.isActive ? "Deactivate user" : "Activate user"}
                          className={`p-2 rounded-lg transition-colors ${
                            u._id === currentUser?.id
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {u.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>

                        {/* Role Toggle */}
                        <button
                          onClick={() => handleUpdateRole(u._id, u.role === 'admin' ? 'user' : 'admin')}
                          disabled={u._id === currentUser?.id}
                          title={u._id === currentUser?.id ? "Cannot change your own role" : `Switch to ${u.role === 'admin' ? 'user' : 'admin'}`}
                          className={`p-2 rounded-lg transition-colors ${
                            u._id === currentUser?.id
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Shield size={20} />
                        </button>

                        {/* Delete User */}
                        {confirmDelete === u._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteUser(u._id)}
                              className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                              title="Confirm delete"
                            >
                              <CheckCircle size={20} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title="Cancel"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(u._id)}
                            disabled={u._id === currentUser?.id}
                            title={u._id === currentUser?.id ? "Cannot delete your own account" : "Delete user"}
                            className={`p-2 rounded-lg transition-colors ${
                              u._id === currentUser?.id
                                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                : 'text-slate-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500'
                            }`}
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <p className="text-base text-slate-500">
              Page {page} of {totalPages} ({total} total users)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchUsers(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => fetchUsers(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};