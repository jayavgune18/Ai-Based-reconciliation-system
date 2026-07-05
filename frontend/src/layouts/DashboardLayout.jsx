import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  RefreshCcw, 
  ShieldAlert, 
  History, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  User as UserIcon,
  Bell
} from 'lucide-react';

export const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(1);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Reconcile Workbench', path: '/workbench', icon: RefreshCcw },
    { name: 'Fraud Center', path: '/fraud', icon: ShieldAlert, badge: true },
    { name: 'Audit Logs', path: '/audit', icon: History, role: 'admin' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-brand-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* ==========================================
          1. SIDEBAR (RESPONSIVE)
          ========================================== */}
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 lg:static lg:block transform transition-transform duration-300 ease-in-out
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
              A
            </div>
            <span className="font-extrabold text-sm tracking-wider uppercase bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
              Reconciliation System
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {/* User Account Widget */}
        <div className="p-4 mx-4 my-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <UserIcon size={20} />
            </div>
            <div className="overflow-hidden">
              <h4 className="font-semibold text-xs truncate">{user?.name || 'Recon Officer'}</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user?.role || 'User'}</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="px-4 py-2 space-y-1">
          {navItems.map((item) => {
            if (item.role && user?.role !== item.role) return null;
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center justify-between px-4 py-3 rounded-lg text-xs font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/10' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold ${isActive ? 'bg-white text-cyan-500' : 'bg-red-500/10 text-red-500'}`}>
                    Live
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="absolute bottom-4 left-0 w-full px-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/5 dark:hover:bg-red-500/10 transition-colors duration-200"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* ==========================================
          2. MAIN CONTENT WRAPPER
          ========================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30">
          
          {/* Burger button (Mobile) */}
          <button 
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu size={20} />
          </button>

          {/* Page Banner Title */}
          <h2 className="hidden sm:block font-bold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {navItems.find(item => item.path === location.pathname)?.name || 'Workbench'}
          </h2>

          {/* Quick Action Group */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
            </button>

            {/* Notification Center */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setNotificationCount(0);
                }}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              >
                <Bell size={18} />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white dark:border-slate-900 pulse-glow" />
                )}
              </button>

              {/* Notification Overlay Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-4 z-50 text-xs animate-in fade-in-50 duration-150">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <h5 className="font-bold">System Alerts</h5>
                    <button className="text-[10px] text-cyan-500 hover:underline" onClick={() => setShowNotifications(false)}>Dismiss</button>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border-l-2 border-red-500">
                      <p className="font-semibold text-red-500">Duplicate Cash Debit Flagged</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">ATM Withdrawal occurred twice on Q1 Audits.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar Pill */}
            <div className="h-8 border-l border-slate-200 dark:border-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
              </div>
              <span className="hidden md:block text-xs font-semibold">{user?.name || 'Officer'}</span>
            </div>

          </div>
        </header>

        {/* Inner Main Layout Viewport */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto animate-in fade-in-50 duration-300">
          {children}
        </main>
      </div>

    </div>
  );
};
