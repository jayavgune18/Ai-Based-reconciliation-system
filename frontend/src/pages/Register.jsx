import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, User, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { FormInput } from '../layouts/FormInput';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all input fields.');
      setSubmitting(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setSubmitting(false);
      return;
    }
    const res = await register(formData.name, formData.email, formData.password, 'user');
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-200/20 dark:bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/20 dark:bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Register for ledger audit operations
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <FormInput
              label="Full Name"
              id="name"
              name="name"
              icon={User}
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
            />

            <FormInput
              label="Email Address"
              id="email"
              name="email"
              type="email"
              icon={Mail}
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
            />

            <FormInput
              label="Password"
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              icon={Lock}
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <FormInput
              label="Confirm Password"
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              icon={Lock}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm your password"
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm rounded-lg shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all hover:shadow-xl hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{submitting ? 'Please wait...' : 'Create Account'}</span>
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="text-center mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium focus:outline-none"
            >
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;