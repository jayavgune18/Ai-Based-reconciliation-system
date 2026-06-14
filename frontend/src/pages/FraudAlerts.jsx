import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { ShieldAlert, AlertTriangle, Info, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const FraudAlerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (user?.role !== 'admin') {
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get('/api/dashboard/fraud-alerts');
        if (res.data.success) {
          setAlerts(res.data.alerts);
        }
      } catch (err) {
        console.error('Failed to load fraud alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6 border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
        <div className="text-center max-w-sm">
          <ShieldAlert className="text-red-500 mx-auto mb-2" size={32} />
          <h4 className="font-bold text-xs text-red-500 uppercase tracking-widest">Unauthorized Access Restricted</h4>
          <p className="text-[10px] text-slate-500 mt-1">
            Access to analytical risk engines and duplicate velocity scans is reserved exclusively for the Lead Audit Architect role.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Risk Banner */}
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-4 items-start animate-in fade-in-50 duration-200">
        <div className="p-3 bg-red-500 rounded-xl text-white shadow-lg shadow-red-500/20">
          <ShieldAlert size={20} />
        </div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-sm text-red-500 uppercase tracking-wider">Risk Control Center</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xl">
            Statistical anomaly detection sweeps are active. Duplicate debit alerts highlight where the bank has cleared the same amount/narration twice within a 24-hour window.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50">
          <Info size={32} className="text-slate-400 mx-auto mb-2" />
          <h4 className="font-bold text-xs">Security sweeps completed. No anomalies found.</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Transactions processed match standard velocity profiles.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Audit Warning Log ({alerts.length})</h4>

          <div className="space-y-3">
            {alerts.map((alert, idx) => {
              const Icon = alert.type === 'velocity_spike' ? Clock : (alert.type === 'duplicate_transfer' ? AlertCircle : AlertTriangle);
              const borderTheme = alert.severity === 'critical' ? 'border-red-500 dark:border-red-500' : 'border-amber-500 dark:border-amber-500';
              const textTheme = alert.severity === 'critical' ? 'text-red-500 bg-red-500/10' : 'text-amber-500 bg-amber-500/10';

              return (
                <div 
                  key={idx}
                  className={`p-5 bg-white dark:bg-slate-900 border-l-4 ${borderTheme} dark:border-y dark:border-r dark:border-slate-800/80 rounded-r-xl shadow-sm flex flex-col sm:flex-row justify-between gap-4`}
                >
                  <div className="flex gap-4 items-start">
                    <div className={`p-2.5 rounded-lg ${textTheme}`}>
                      <Icon size={18} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{alert.type.replace('_', ' ')}</span>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{alert.message}</h4>
                      <p className="text-[10px] text-slate-500">
                        Target Item: <span className="font-mono text-slate-400">"{alert.details.description}"</span> valued at <span className="font-bold font-mono">${Math.abs(alert.details.amount).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col justify-between sm:justify-center items-end min-w-[120px] pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Risk Severity</span>
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full uppercase mt-1 ${alert.severity === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
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
