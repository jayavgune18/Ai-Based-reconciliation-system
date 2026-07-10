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
      <div className="min-h-[50vh] flex items-center justify-center p-10 border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
        <div className="text-center max-w-lg">
          <ShieldAlert className="text-red-500 mx-auto mb-4" size={56} />
          <h4 className="font-bold text-2xl text-red-500 uppercase tracking-widest">Unauthorized Access Restricted</h4>
          <p className="text-xl text-slate-500 mt-3">
            Access to analytical risk engines and duplicate velocity scans is reserved exclusively for the Lead Audit Architect role.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      
      {/* Risk Banner */}
      <div className="p-10 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-6 items-start animate-in fade-in-50 duration-200">
        <div className="p-5 bg-red-500 rounded-xl text-white shadow-lg shadow-red-500/20">
          <ShieldAlert size={36} />
        </div>
        <div className="space-y-3">
          <h3 className="font-extrabold text-3xl text-red-500 uppercase tracking-wider">Risk Control Center</h3>
          <p className="text-xl text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
            Statistical anomaly detection sweeps are active. Duplicate debit alerts highlight where the bank has cleared the same amount/narration twice within a 24-hour window.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="py-24 text-center border border-dashed border-red-300 dark:border-red-800 rounded-2xl bg-red-50 dark:bg-red-500/5">
          <AlertCircle size={56} className="text-red-400 mx-auto mb-4" />
          <h4 className="font-bold text-2xl text-red-600 dark:text-red-400">Analysis Engine Error</h4>
          <p className="text-xl text-red-500/70 mt-2 max-w-xl mx-auto leading-relaxed">{error}</p>
          <button 
            onClick={() => { setLoading(true); setError(null); setAlerts([]); fetchAlerts(); }}
            className="mt-8 px-8 py-3 text-xl font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Retry Scan
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-32 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50">
          <Info size={56} className="text-slate-400 mx-auto mb-4" />
          <h4 className="font-bold text-2xl">Security sweeps completed. No anomalies found.</h4>
          <p className="text-xl text-slate-500 mt-2">Transactions processed match standard velocity profiles.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <h4 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Active Audit Warning Log ({alerts.length})</h4>

          <div className="space-y-6">
            {alerts.map((alert, idx) => {
              const Icon = alert.type === 'velocity_spike' ? Clock : (alert.type === 'duplicate_transfer' ? AlertCircle : AlertTriangle);
              const borderTheme = alert.severity === 'critical' ? 'border-red-500 dark:border-red-500' : 'border-amber-500 dark:border-amber-500';
              const textTheme = alert.severity === 'critical' ? 'text-red-500 bg-red-500/10' : 'text-amber-500 bg-amber-500/10';

              return (
                <div 
                  key={idx}
                  className={`p-8 bg-white dark:bg-slate-900 border-l-4 ${borderTheme} dark:border-y dark:border-r dark:border-slate-800/80 rounded-r-xl shadow-sm flex flex-col sm:flex-row justify-between gap-6`}
                >
                  <div className="flex gap-6 items-start">
                    <div className={`p-4 rounded-lg ${textTheme}`}>
                      <Icon size={28} />
                    </div>
                    <div className="space-y-2">
                      <span className="text-base font-bold text-slate-400 uppercase tracking-widest">{alert.type.replace('_', ' ')}</span>
                      <h4 className="font-bold text-xl text-slate-800 dark:text-slate-200 leading-relaxed">{alert.message}</h4>
                      <p className="text-lg text-slate-500">
                        Target Item: <span className="font-mono text-slate-400">"{alert.details.description}"</span> valued at <span className="font-bold font-mono">${Math.abs(alert.details.amount).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col justify-between sm:justify-center items-end min-w-[150px] pt-5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <span className="text-base font-bold text-slate-400 uppercase tracking-widest">Risk Severity</span>
                    <span className={`px-4 py-1.5 text-base font-extrabold rounded-full uppercase mt-2 ${alert.severity === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
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