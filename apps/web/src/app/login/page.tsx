"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Logo } from '@/components/logo';
import { AtSign, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_BASE, isAuthenticated, TOKEN_KEY } from '@/lib/api';


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  // Already have a valid session? Skip straight to the dashboard instead of
  // making the user look at (or resubmit) a sign-in form.
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
      return;
    }
    setCheckingSession(false);
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email address and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (res.ok && data.accessToken) {
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        router.push('/dashboard');
        return;
      }

      if (data.message && data.message.includes('UNVERIFIED_EMAIL')) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      setError(data.message || 'Invalid email address or password.');
    } catch (err) {
      setError('Unable to reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen w-full bg-[#F7F8FC] dark:bg-[#0B0D12]" />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F7F8FC] dark:bg-[#0B0D12] text-slate-900 dark:text-white font-sans ambient-bg transition-colors duration-300">
      
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white dark:bg-[#12151D] border border-slate-200/80 dark:border-white/10 rounded-[28px] p-8 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden"
      >
        {/* Brand Header */}
        <div className="space-y-3 text-center sm:text-left">
          <Link href="/" className="inline-block">
            <Logo className="h-9" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome back to AMAI
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Sign in to manage your AI social media publishing workspace.
            </p>
          </div>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Email / Password Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Email Address
            </label>
            <div className="relative flex items-center">
              <AtSign className="absolute left-4 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500/50 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-semibold">
                Forgot password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500/50 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
              />
              <span>Remember me for 30 days</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-900 via-violet-700 to-violet-600 hover:opacity-95 text-white font-bold text-sm rounded-2xl shadow-xl shadow-violet-600/20 transition flex items-center justify-center space-x-2 border border-white/20 touch-target disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-500 dark:text-zinc-400 pt-2">
          Don't have an AMAI account yet?{' '}
          <Link href="/register" className="font-bold text-violet-600 dark:text-violet-400 hover:underline">
            Sign up
          </Link>
        </p>

      </motion.div>
    </div>
  );
}
