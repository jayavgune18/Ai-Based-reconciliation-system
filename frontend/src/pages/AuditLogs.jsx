import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { History, Shield, Eye, Calendar, HardDrive } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (user?.role !== 'admin') {
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get('/api/dashboard/audit-logs');
        if (res.data.success) {
          setLogs(res.data.logs);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6 border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
        <div className="text-center max-w-sm">
          <Shield className="text-red-500 mx-auto mb-2" size={32} />
          <h4 className="font-bold text-xs text-red-500 uppercase tracking-widest">Access Restricted</h4>
          <p className="text-[10px] text-slate-500 mt-1">
            Access to immutable system audit trails and administrative change tracking is restricted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center gap-3">
        <div className="p-2.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-lg">
          <History size={18} />
        </div>
        <div>
          <h3 className="font-extrabold text-sm uppercase tracking-wider">Immutable System Audit Trails</h3>
          <p className="text-[10px] text-slate-500">Security ledger listing administrative override actions and data uploads.</p>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Network Context</th>
                <th className="py-3 px-4 text-right">Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[9px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={10} />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div>
                      <p className="font-bold text-[10px]">{log.userId?.name || 'Automated Engine'}</p>
                      <p className="text-[9px] text-slate-400 capitalize">{log.userId?.role || 'System'}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      log.action === 'STATEMENT_INGESTION' ? 'bg-cyan-500/10 text-cyan-500' :
                      log.action === 'MATCH_RESOLUTION' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                    }`}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[9px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <HardDrive size={10} />
                      {log.ipAddress || '127.0.0.1'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800/80 text-slate-500 px-2 py-1 rounded font-mono break-all inline-block max-w-[200px] truncate" title={JSON.stringify(log.details)}>
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
