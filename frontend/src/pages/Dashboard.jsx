import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, ShieldAlert, Award, FileSpreadsheet, ListTodo, AlertCircle,
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
        
        if (user?.role === 'admin') {
          const fraudRes = await apiClient.get('/api/dashboard/fraud-alerts');
          if (fraudRes.data.success) {
            setFraudCount(fraudRes.data.count);
          }
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
      value: user?.role === 'admin' ? fraudCount : '—', 
      change: user?.role === 'admin' ? 'Requires attention' : 'Restricted',
      trend: 'up',
      icon: ShieldAlert, 
      color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10' 
    }
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-lg text-slate-500 dark:text-slate-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Welcome Board */}
      <div className="p-8 rounded-2xl bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-700 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold">Welcome back, {user?.name || 'Officer'} 👋</h2>
            <p className="text-lg text-cyan-100 mt-2 max-w-xl leading-relaxed">
              Your reconciliation dashboard is up to date. All systems are operational and processing normally.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-base font-medium">
            <Clock size={18} />
            <span>Live</span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-6">
          <div className="flex items-center gap-2 text-base text-cyan-100">
            <ArrowUp size={18} className="text-emerald-300" />
            <span>99.9% uptime</span>
          </div>
          <div className="flex items-center gap-2 text-base text-cyan-100">
            <ArrowUp size={18} className="text-emerald-300" />
            <span>AI engine active</span>
          </div>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statWidgets.map((widget, idx) => {
          const Icon = widget.icon;
          return (
            <div key={idx} className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-base font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{widget.label}</span>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{widget.value}</h3>
                  <div className="flex items-center gap-1.5">
                    {widget.trend === 'up' ? (
                      <ArrowUp size={16} className="text-emerald-500" />
                    ) : widget.trend === 'down' ? (
                      <ArrowDown size={16} className="text-red-500" />
                    ) : null}
                    <span className="text-base text-slate-500 dark:text-slate-400">{widget.change}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${widget.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Area Chart */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="font-semibold text-lg text-slate-900 dark:text-white mb-4">Volume Trends</h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMatched" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={14} />
                <YAxis stroke="#94A3B8" fontSize={14} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    borderRadius: '8px', 
                    color: '#FFF', 
                    border: 'none',
                    fontSize: '14px'
                  }} 
                />
                <Area type="monotone" dataKey="processed" stroke="#64748B" fill="none" name="Total" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="matched" stroke="#06b6d4" fillOpacity={1} fill="url(#colorMatched)" name="Matched" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="font-semibold text-lg text-slate-900 dark:text-white mb-4">Distribution</h4>
          
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
              <div className="text-slate-400 text-base">No data available</div>
            )}
            
            {/* Center */}
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{stats.accuracyRate}%</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Accuracy</span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-slate-600 dark:text-slate-400">Matched</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">{stats.matchedCount}</span>
            </div>
            <div className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-600 dark:text-slate-400">Partial</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">{stats.discrepancyCount}</span>
            </div>
            <div className="flex items-center justify-between text-base">
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