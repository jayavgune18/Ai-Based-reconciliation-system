import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, BarChart3, Brain, Lock, Zap } from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900 via-slate-950 to-brand-950 text-slate-100">
      {/* Navigation Bar */}
      <nav className="relative z-10 border-b border-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
              A
            </div>
            <span className="font-extrabold text-sm tracking-wider uppercase bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
              Recon System
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg shadow-lg shadow-cyan-500/20 transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pulse-glow" style={{ animationDelay: '1.5s' }} />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6">
            <Zap size={14} />
            AI-Powered Financial Reconciliation
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Intelligent Ledger
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Reconciliation Platform
            </span>
          </h1>
          
          <p className="mt-6 text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Automate financial data matching, detect discrepancies, and generate audit-ready reports 
            with our AI-driven reconciliation engine. Reduce manual effort by 90%.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
            >
              Start Free Trial <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 text-sm font-semibold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-xl transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Why Choose Our Platform?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Brain,
              title: 'AI Matching Engine',
              description: 'Advanced algorithms automatically match transactions across ledgers with 99.9% accuracy.',
              color: 'text-cyan-500 bg-cyan-500/10'
            },
            {
              icon: BarChart3,
              title: 'Real-time Analytics',
              description: 'Interactive dashboards with live reconciliation status, trends, and performance metrics.',
              color: 'text-emerald-500 bg-emerald-500/10'
            },
            {
              icon: Shield,
              title: 'Fraud Detection',
              description: 'Proactive anomaly detection flags suspicious patterns and potential financial irregularities.',
              color: 'text-red-500 bg-red-500/10'
            },
            {
              icon: Lock,
              title: 'Audit-Ready Reports',
              description: 'Generate comprehensive audit trails and compliance reports with a single click.',
              color: 'text-indigo-500 bg-indigo-500/10'
            }
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 hover:border-slate-700/80 transition-all group">
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={24} />
                </div>
                <h3 className="font-bold text-sm mb-2">{feature.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-slate-500">
          <span>&copy; 2026 Reconciliation System. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
};