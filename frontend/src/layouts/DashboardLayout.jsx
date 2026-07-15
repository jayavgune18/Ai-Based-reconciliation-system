import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  RefreshCcw, 
  ShieldAlert, 
  History, 
  Settings as SettingsIcon,
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  User as UserIcon,
  Bell,
  ChevronDown,
  Users,
  Shield
} from 'lucide-react';

export const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(1);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Reconcile Workbench', path: '/workbench', icon: RefreshCcw },
    { name: 'Fraud Center', path: '/fraud', icon: ShieldAlert, badge: true },
    { name: 'Audit Logs', path: '/audit', icon: History },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
    ...(user?.role === 'admin' ? [
      { divider: true },
      { name: 'User Management', path: '/admin/users', icon: Users, adminOnly: true },
    ] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 lg:static lg:block transform transition-transform duration-300 ease-in-out
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20 text-base">
              A
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="text-slate-900 dark:text-white">Recon</span>
              <span className="text-cyan-600 dark:text-cyan-400">System</span>
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        {/* User Widget */}
        <div className="p-3 mx-3 my-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover shadow-md shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-md shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
              </div>
            )}
            <div className="overflow-hidden flex-1 min-w-0">
              <h4 className="font-semibold text-base truncate text-slate-900 dark:text-white">{user?.name || 'Recon Officer'}</h4>
              <div className="flex">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  user?.role === 'admin'
                    ? 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {user?.role === 'admin' ? <Shield size={12} /> : <UserIcon size={12} />}
                  {user?.role || 'User'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-1 space-y-0.5">
          {navItems.map((item, index) => {
            if (item.role && user?.role !== item.role) return null;
            
            if (item.divider) {
              return (
                <div key={`divider-${index}`} className="pt-2 pb-1">
                  <div className="flex items-center gap-2 px-3">
                    <Shield size={10} className="text-cyan-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      Admin
                    </span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              );
            }

            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center justify-between px-3 py-2.5 rounded-lg text-base font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/10' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'}
                  ${item.adminOnly ? 'pl-8' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${isActive ? 'bg-white text-cyan-500' : 'bg-red-500/10 text-red-500'}`}>
                    Live
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-3 left-0 w-full px-3">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-200"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30">
          
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu size={20} />
            </button>
            <h2 className="hidden sm:block font-semibold text-lg text-slate-500 dark:text-slate-400">
              {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
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
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 border border-white dark:border-slate-900" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-4 z-50 text-sm">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <h5 className="font-semibold text-slate-900 dark:text-white">Notifications</h5>
                    <button className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline" onClick={() => setShowNotifications(false)}>Dismiss</button>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-500/5 border-l-2 border-red-500">
                      <p className="font-medium text-xs text-red-600 dark:text-red-400">Duplicate Cash Debit Flagged</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ATM Withdrawal occurred twice on Q1 Audits.</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/5 border-l-2 border-amber-500">
                      <p className="font-medium text-xs text-amber-600 dark:text-amber-400">Reconciliation Pending</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">2 transactions awaiting review.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowUserMenu(!showUserMenu)}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover shadow-md" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
                </div>
              )}
              <span className="hidden md:block text-base font-medium text-slate-700 dark:text-slate-300">{user?.name || 'Officer'}</span>
              <ChevronDown size={14} className="hidden md:block text-slate-400" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};