import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { ShieldAlert, AlertTriangle, Info, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const FraudAlerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = async () => {
    if (user?.role !== 'admin') {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const res = await apiClient.get('/api/dashboard/fraud-alerts');
      if (res.data.success) {
        setAlerts(res.data.alerts);
      } else {
        setError(res.data.message || 'Failed to load fraud alerts.');
      }
    } catch (err) {
      console.error('Failed to load fraud alerts:', err);
      setError(
        err.response?.data?.message || 
        'Failed to load fraud alerts. The analysis engine may be unavailable.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8 border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
        <div className="text-center max-w-lg">
          <ShieldAlert className="text-red-500 mx-auto mb-4" size={48} />
          <h4 className="font-bold text-lg text-red-500 uppercase tracking-widest">Unauthorized Access Restricted</h4>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Access to analytical risk engines and duplicate velocity scans is reserved exclusively for the Lead Audit Architect role.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Risk Banner */}
      <div className="p-4 sm:p-5 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 sm:gap-4 items-start">
        <div className="p-2.5 sm:p-3 bg-red-500 rounded-lg text-white shadow-lg shadow-red-500/20 shrink-0">
          <ShieldAlert size={22} />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-base sm:text-lg text-red-500 uppercase tracking-wider">Risk Control Center</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Statistical anomaly detection sweeps are active. Duplicate debit alerts highlight where the bank has cleared the same amount/narration twice within a 24-hour window.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="py-12 text-center border border-dashed border-red-300 dark:border-red-800 rounded-2xl bg-red-50 dark:bg-red-500/5">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
          <h4 className="font-bold text-base text-red-600 dark:text-red-400">Analysis Engine Error</h4>
          <p className="text-xs text-red-500/70 mt-2 max-w-lg mx-auto leading-relaxed">{error}</p>
          <button 
            onClick={() => { setLoading(true); setError(null); setAlerts([]); fetchAlerts(); }}
            className="mt-5 px-5 py-2 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Retry Scan
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50">
          <Info size={36} className="text-slate-400 mx-auto mb-2" />
          <h4 className="font-semibold text-sm">Security sweeps completed. No anomalies found.</h4>
          <p className="text-xs text-slate-500 mt-1">Transactions processed match standard velocity profiles.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Audit Warning Log ({alerts.length})</h4>

          <div className="space-y-3">
            {alerts.map((alert, idx) => {
              const Icon = alert.type === 'velocity_spike' ? Clock : (alert.type === 'duplicate_transfer' ? AlertCircle : AlertTriangle);
              const borderTheme = alert.severity === 'critical' ? 'border-red-500 dark:border-red-500' : 'border-amber-500 dark:border-amber-500';
              const textTheme = alert.severity === 'critical' ? 'text-red-500 bg-red-500/10' : 'text-amber-500 bg-amber-500/10';

              return (
                <div 
                  key={idx}
                  className={`p-4 sm:p-5 bg-white dark:bg-slate-900 border-l-4 ${borderTheme} dark:border-y dark:border-r dark:border-slate-800/80 rounded-r-xl shadow-sm flex flex-col sm:flex-row justify-between gap-3`}
                >
                  <div className="flex gap-3 items-start">
                    <div className={`p-2.5 rounded-lg ${textTheme} shrink-0`}>
                      <Icon size={20} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{alert.type.replace('_', ' ')}</span>
                      <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">{alert.message}</h4>
                      <p className="text-xs text-slate-500">
                        Target Item: <span className="font-mono text-slate-400">"{alert.details.description}"</span> valued at <span className="font-bold font-mono">${Math.abs(alert.details.amount).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col justify-between sm:justify-center items-end min-w-[120px] pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Risk Severity</span>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase mt-1 ${alert.severity === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {alert.severity}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};