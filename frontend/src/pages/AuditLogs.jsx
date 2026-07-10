import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { History, Shield, Calendar, HardDrive, AlertTriangle, Inbox } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setError(null);
        const res = await apiClient.get('/api/dashboard/audit-logs');
        if (res.data.success) {
          setLogs(res.data.logs || []);
        } else {
          setError(res.data.message || 'Failed to fetch audit logs.');
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
        const status = err.response?.status;
        if (status === 403) {
          setError('Access denied. Admin privileges required to view audit logs.');
        } else if (status === 401) {
          setError('Session expired. Please log in again.');
        } else {
          setError(err.response?.data?.message || err.message || 'Network error. Could not load audit logs.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user]);

  return (
    <div className="space-y-8">
      
      {/* Top Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center gap-4">
        <div className="p-3 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-lg">
          <History size={24} />
        </div>
        <div>
          <h3 className="font-extrabold text-lg uppercase tracking-wider">Immutable System Audit Trails</h3>
          <p className="text-base text-slate-500">Security ledger listing administrative override actions and data uploads.</p>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="min-h-[30vh] flex items-center justify-center p-8 border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
          <div className="text-center max-w-md">
            <AlertTriangle className="text-red-500 mx-auto mb-3" size={36} />
            <h4 className="font-bold text-lg text-red-500 uppercase tracking-widest">Error Loading Audit Logs</h4>
            <p className="text-base text-slate-500 mt-1">{error}</p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="min-h-[30vh] flex items-center justify-center p-8 border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl">
          <div className="text-center max-w-md">
            <Inbox className="text-slate-400 mx-auto mb-3" size={36} />
            <h4 className="font-bold text-lg text-slate-400 uppercase tracking-widest">No Audit Logs Found</h4>
            <p className="text-base text-slate-500 mt-1">
              No system audit trails have been recorded yet. Run the database seeder or perform admin actions to generate logs.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          
          <table className="w-full text-left border-collapse text-base">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-5">Timestamp</th>
                <th className="py-4 px-5">Operator</th>
                <th className="py-4 px-5">Action Event</th>
                <th className="py-4 px-5">Network Context</th>
                <th className="py-4 px-5 text-right">Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="py-4 px-5 font-mono text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div>
                      <p className="font-bold text-base">{log.userId?.name || 'Automated Engine'}</p>
                      <p className="text-sm text-slate-400 capitalize">{log.userId?.role || 'System'}</p>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className={`px-3 py-1 rounded text-sm font-bold uppercase ${
                      log.action === 'STATEMENT_INGESTION' ? 'bg-cyan-500/10 text-cyan-500' :
                      log.action === 'MATCH_RESOLUTION' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                    }`}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-5 font-mono text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <HardDrive size={14} />
                      {log.ipAddress || '127.0.0.1'}
                    </div>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <span className="text-sm bg-slate-100 dark:bg-slate-800/80 text-slate-500 px-3 py-1.5 rounded font-mono break-all inline-block max-w-[250px] truncate" title={JSON.stringify(log.details)}>
                      {JSON.stringify(log.details)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      )}

    </div>
  );
};