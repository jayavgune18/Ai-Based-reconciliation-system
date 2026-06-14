import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, ShieldAlert, Award, FileSpreadsheet, ListTodo, AlertCircle
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
        
        // Fetch fraud alerts if user is admin
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

  // Color schemes for charts
  const PIE_COLORS = ['#06b6d4', '#f59e0b', '#ef4444'];
  const pieChartData = [
    { name: 'Matched', value: stats.matchedCount || 1 },
    { name: 'Partial', value: stats.discrepancyCount ? Math.floor(stats.discrepancyCount / 2) : 0 },
    { name: 'Unmatched', value: stats.unmatchedCount || 0 }
  ].filter(i => i.value > 0);

  const statWidgets = [
    { label: 'Reconciled volume', value: stats.totalTransactions, change: 'All sources', icon: FileSpreadsheet, color: 'text-cyan-500 bg-cyan-500/10' },
    { label: 'Audit Accuracy', value: `${stats.accuracyRate}%`, change: 'Optimal Target > 95%', icon: Award, color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Ingested Jobs', value: stats.totalJobs, change: 'Cleared ledgers', icon: ListTodo, color: 'text-indigo-500 bg-indigo-500/10' },
    { label: 'Fraud Flags', value: user?.role === 'admin' ? fraudCount : 'Restricted', change: 'Velocity alerts', icon: ShieldAlert, color: 'text-red-500 bg-red-500/10' }
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500">Compiling financial metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ==========================================
          1. WELCOME BOARD
          ========================================== */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 text-white border border-slate-800 glow-cyan">
        <h2 className="text-xl font-bold">Welcome Back, {user?.name || 'Recon Officer'}</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          The hybrid AI matching engine has completed structural sweeps on the database. Reconciliations are synced and cleared.
        </p>
      </div>

      {/* ==========================================
          2. METRIC TILES
          ========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statWidgets.map((widget, idx) => {
          const Icon = widget.icon;
          return (
            <div key={idx} className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{widget.label}</span>
                <h3 className="text-xl font-extrabold">{widget.value}</h3>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <TrendingUp size={10} />
                  {widget.change}
                </span>
              </div>
              <div className={`p-3 rounded-lg ${widget.color}`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ==========================================
          3. MAIN CHARTS GRID
          ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-4">Volume Trends (Jan - May)</h4>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMatched" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="month" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    borderRadius: '8px', 
                    color: '#FFF', 
                    border: 'none',
                    fontSize: '11px'
                  }} 
                />
                <Area type="monotone" dataKey="processed" stroke="#64748B" fill="none" name="Total Ingested" strokeWidth={1.5} />
                <Area type="monotone" dataKey="matched" stroke="#06b6d4" fillOpacity={1} fill="url(#colorMatched)" name="AI Reconciled" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie Chart */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Reconcile Composition</h4>
          
          <div className="h-44 w-full relative flex items-center justify-center">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
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
                      fontSize: '11px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-xs">No composition data</div>
            )}
            
            {/* Center rate badge */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold">{stats.accuracyRate}%</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Clear Rate</span>
            </div>
          </div>

          {/* Color Indicators Legend */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-slate-500 dark:text-slate-400">Reconciled Matches</span>
              </div>
              <span className="font-bold">{stats.matchedCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-500 dark:text-slate-400">Partial Overrides</span>
              </div>
              <span className="font-bold">{stats.discrepancyCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-slate-500 dark:text-slate-400">Unmatched / Orphaned</span>
              </div>
              <span className="font-bold">{stats.unmatchedCount}</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
