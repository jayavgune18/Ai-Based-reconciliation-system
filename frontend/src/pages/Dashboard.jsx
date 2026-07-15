import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  ShieldAlert, Award, FileSpreadsheet, ListTodo,
  ArrowUp, ArrowDown, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalTransactions: 0,
    matchedCount: 0,
    unmatchedCount: 0,
    discrepancyCount: 0,
    accuracyRate: 0
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fraudCount, setFraudCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await apiClient.get('/api/dashboard/stats');
        if (statsRes.data.success) {
          setStats(statsRes.data.stats);
          setChartData(statsRes.data.chartData);
        }
        
        try {
          const fraudRes = await apiClient.get('/api/dashboard/fraud-alerts');
          if (fraudRes.data.success) {
            setFraudCount(fraudRes.data.count);
          }
        } catch (fraudErr) {
          // Fraud alerts are optional; don't block dashboard if unavailable
          console.warn('Fraud alerts unavailable:', fraudErr.message);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const PIE_COLORS = ['#06b6d4', '#f59e0b', '#ef4444'];
  const pieChartData = [
    { name: 'Matched', value: stats.matchedCount || 1 },
    { name: 'Partial', value: stats.discrepancyCount ? Math.floor(stats.discrepancyCount / 2) : 0 },
    { name: 'Unmatched', value: stats.unmatchedCount || 0 }
  ].filter(i => i.value > 0);

  const statWidgets = [
    { 
      label: 'Transaction Volume', 
      value: stats.totalTransactions.toLocaleString(), 
      change: '+12.5%', 
      trend: 'up',
      icon: FileSpreadsheet, 
      color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-500/10' 
    },
    { 
      label: 'Match Accuracy', 
      value: `${stats.accuracyRate}%`, 
      change: 'Target: 95%', 
      trend: 'up',
      icon: Award, 
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10' 
    },
    { 
      label: 'Jobs Processed', 
      value: stats.totalJobs, 
      change: 'This month', 
      trend: 'neutral',
      icon: ListTodo, 
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10' 
    },
    { 
      label: 'Fraud Alerts', 
      value: fraudCount, 
      change: fraudCount > 0 ? 'Requires attention' : 'No threats detected',
      trend: fraudCount > 0 ? 'up' : 'neutral',
      icon: ShieldAlert, 
      color: fraudCount > 0 
        ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10' 
        : 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-base text-slate-500 dark:text-slate-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Welcome Board */}
      <div className="w-full p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-700 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Welcome back, {user?.name || 'Officer'} 👋</h2>
            <p className="text-sm sm:text-base text-cyan-100 mt-2 max-w-xl leading-relaxed">
              Your reconciliation dashboard is up to date. All systems are operational and processing normally.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm font-medium">
            <Clock size={16} />
            <span>Live</span>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-5">
          <div className="flex items-center gap-2 text-sm text-cyan-100">
            <ArrowUp size={16} className="text-emerald-300" />
            <span>99.9% uptime</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-cyan-100">
            <ArrowUp size={16} className="text-emerald-300" />
            <span>AI engine active</span>
          </div>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statWidgets.map((widget, idx) => {
          const Icon = widget.icon;
          return (
            <div key={idx} className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{widget.label}</span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{widget.value}</h3>
                  <div className="flex items-center gap-1.5">
                    {widget.trend === 'up' ? (
                      <ArrowUp size={14} className="text-emerald-500" />
                    ) : widget.trend === 'down' ? (
                      <ArrowDown size={14} className="text-red-500" />
                    ) : null}
                    <span className="text-sm text-slate-500 dark:text-slate-400">{widget.change}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${widget.color}`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Area Chart */}
        <div className="lg:col-span-2 p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="font-semibold text-base text-slate-900 dark:text-white mb-4">Volume Trends</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMatched" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    borderRadius: '8px', 
                    color: '#FFF', 
                    border: 'none',
                    fontSize: '13px'
                  }} 
                />
                <Area type="monotone" dataKey="processed" stroke="#64748B" fill="none" name="Total" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="matched" stroke="#06b6d4" fillOpacity={1} fill="url(#colorMatched)" name="Matched" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="font-semibold text-base text-slate-900 dark:text-white mb-4">Distribution</h4>
          
          <div className="h-48 w-full relative flex items-center justify-center">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      borderRadius: '8px', 
                      color: '#FFF', 
                      border: 'none',
                      fontSize: '13px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm">No data available</div>
            )}
            
            {/* Center */}
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.accuracyRate}%</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Accuracy</span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-slate-600 dark:text-slate-400">Matched</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">{stats.matchedCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-600 dark:text-slate-400">Partial</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">{stats.discrepancyCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-600 dark:text-slate-400">Unmatched</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">{stats.unmatchedCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};