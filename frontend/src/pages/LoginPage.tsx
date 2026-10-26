import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  UtensilsCrossed,
  Lock,
  Mail,
  AlertCircle,
  Shield,
  User,
  Store,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await login(trimmedEmail, password);
      if (!res.success) {
        setErrorMessage(res.message || 'Invalid email or password. Please check your credentials.');
        return;
      }
      navigate(redirectPath);
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.response?.data?.message || err.message || 'Login failed. Please verify credentials.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill demo credentials into form WITHOUT automatically logging in
  const handleFillDemo = (demoEmail: string, demoPass: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
    setInfoMessage(
      `Pre-filled credentials for ${roleName}. Review your login details above and click "Sign In" to proceed.`
    );
  };

  const handleClearForm = () => {
    setEmail('');
    setPassword('');
    setErrorMessage(null);
    setInfoMessage(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 bg-white p-5 sm:p-10 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white mx-auto shadow-md shadow-orange-500/20">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Sign In to Quick<span className="text-orange-600">Bite</span>
          </h2>
          <p className="text-xs text-slate-500">
            Enter your login credentials to access your account
          </p>
        </div>

        {/* Informational Notification */}
        {infoMessage && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-700 animate-in fade-in">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <span className="flex-1 leading-relaxed">{infoMessage}</span>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Email Address
              </label>
              {(email || password) && (
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-orange-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-orange-500 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Pre-fill Demo Accounts Section */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Quick-Fill Demo Credentials
            </span>
            <span className="text-[10px] text-slate-400">Pre-seeded</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Click a role to load sample credentials into the fields above, then review and click Sign In:
          </p>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('customer01@quickbite.demo', 'QuickBite@123', 'Customer (Kavya Patel)')}
              className="p-2.5 bg-slate-50 hover:bg-orange-50/50 hover:border-orange-300 border border-slate-200 rounded-xl text-center space-y-1 transition-all cursor-pointer group"
              title="Load Customer demo credentials"
            >
              <User className="w-4 h-4 text-orange-600 mx-auto group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-bold text-slate-800">Customer</p>
              <p className="text-[9px] text-slate-400 truncate">Kavya Patel</p>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('admin@quickbite.demo', 'QuickBite@123', 'Admin (Aarav Sharma)')}
              className="p-2.5 bg-purple-50/60 hover:bg-purple-100/70 hover:border-purple-300 border border-purple-200 rounded-xl text-center space-y-1 transition-all cursor-pointer group"
              title="Load Admin demo credentials"
            >
              <Shield className="w-4 h-4 text-purple-600 mx-auto group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-bold text-purple-900">Admin</p>
              <p className="text-[9px] text-purple-400 truncate">Aarav Sharma</p>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('owner01@quickbite.demo', 'QuickBite@123', 'Restaurant Owner (Vikram Reddy)')}
              className="p-2.5 bg-amber-50/60 hover:bg-amber-100/70 hover:border-amber-300 border border-amber-200 rounded-xl text-center space-y-1 transition-all cursor-pointer group"
              title="Load Owner demo credentials"
            >
              <Store className="w-4 h-4 text-amber-600 mx-auto group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-bold text-amber-900">Owner</p>
              <p className="text-[9px] text-amber-500 truncate">Vikram Reddy</p>
            </button>
          </div>
        </div>

        {/* Register Redirection */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-bold text-orange-600 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
