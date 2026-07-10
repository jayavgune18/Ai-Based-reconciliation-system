import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, BarChart3, Brain, Lock, Zap, CheckCircle, ChevronRight, Star, Users, TrendingUp } from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
                A
              </div>
              <span className="font-bold text-sm tracking-tight">
                <span className="text-slate-900 dark:text-white">Recon</span>
                <span className="text-cyan-600 dark:text-cyan-400">System</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg shadow-lg shadow-cyan-500/20 transition-all hover:shadow-xl hover:shadow-cyan-500/30"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-cyan-200/30 dark:bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-blue-200/30 dark:bg-blue-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-xs font-semibold mb-6 animate-fade-in">
              <Zap size={14} />
              AI-Powered Financial Reconciliation
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight animate-fade-in">
              <span className="text-slate-900 dark:text-white">
                Intelligent Ledger
              </span>
              <br />
              <span className="text-cyan-600 dark:text-cyan-400">
                Reconciliation Platform
              </span>
            </h1>
            
            <p className="mt-6 text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-in">
              Automate financial data matching, detect discrepancies, and generate audit-ready reports 
              with our AI-driven reconciliation engine. Reduce manual effort by 90%.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all hover:shadow-xl hover:shadow-cyan-500/30"
              >
                Start Free Trial <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
              >
                Sign In
              </button>
            </div>

            {/* Hero Image / Dashboard Preview */}
            <div className="mt-16 animate-fade-in">
              <div className="relative mx-auto max-w-5xl">
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-950 via-transparent to-transparent z-10 pointer-events-none" />
                <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl shadow-cyan-500/10 overflow-hidden bg-slate-100 dark:bg-slate-900">
                  <img 
                    src="/images/Dashboard.png" 
                    alt="ReconSystem Dashboard Preview"
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                  {/* Top bar mockup overlay */}
                  <div className="absolute top-0 left-0 right-0 h-8 bg-slate-900/80 backdrop-blur-sm flex items-center px-4 gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="ml-2 text-[10px] text-slate-400 font-mono">ReconSystem Dashboard</span>
                  </div>
                </div>
                {/* Glow effect */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-6 bg-cyan-500/20 dark:bg-cyan-500/10 blur-2xl rounded-full" />
              </div>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400 dark:text-slate-500 animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" />
                <span>99.9% Accuracy</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-cyan-500" />
                <span>10K+ Users</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-500" />
                <span>4.9/5 Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" />
                <span>90% Faster</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Why Choose Our Platform?
            </h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Everything you need to streamline your financial reconciliation process
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Brain,
                title: 'AI Matching Engine',
                description: 'Advanced algorithms automatically match transactions across ledgers with 99.9% accuracy.',
                color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-500/10'
              },
              {
                icon: BarChart3,
                title: 'Real-time Analytics',
                description: 'Interactive dashboards with live reconciliation status, trends, and performance metrics.',
                color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10'
              },
              {
                icon: Shield,
                title: 'Fraud Detection',
                description: 'Proactive anomaly detection flags suspicious patterns and potential financial irregularities.',
                color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10'
              },
              {
                icon: Lock,
                title: 'Audit-Ready Reports',
                description: 'Generate comprehensive audit trails and compliance reports with a single click.',
                color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10'
              }
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="group relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-200 dark:hover:border-cyan-500/30 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '99.9%', label: 'Matching Accuracy' },
              { value: '10K+', label: 'Transactions/Day' },
              { value: '500+', label: 'Enterprise Clients' },
              { value: '99.9%', label: 'Uptime SLA' }
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-cyan-600 dark:text-cyan-400">{stat.value}</div>
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-cyan-600 to-blue-700 dark:from-cyan-500 dark:to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Ready to Transform Your Reconciliation?
          </h2>
          <p className="mt-4 text-lg text-cyan-100 max-w-2xl mx-auto">
            Join thousands of financial professionals who trust our platform
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-8 px-8 py-3.5 text-sm font-bold text-cyan-600 bg-white hover:bg-cyan-50 rounded-xl shadow-lg flex items-center gap-2 mx-auto transition-all hover:shadow-xl"
          >
            Get Started Free <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white">
                  A
                </div>
                <span className="font-bold text-sm text-white">ReconSystem</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                AI-powered financial reconciliation platform for modern enterprises.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-xs text-white uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2">
                <li><span className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">Features</span></li>
                <li><span className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">Pricing</span></li>
                <li><span className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">API</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-xs text-white uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2">
                <li><span className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">About</span></li>
                <li><span className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">Blog</span></li>
                <li><span className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">Contact</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-xs text-white uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><span className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">Privacy</span></li>
                <li><span className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">Terms</span></li>
                <li><span className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">Security</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">&copy; 2026 ReconSystem. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">Privacy Policy</span>
              <span className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};