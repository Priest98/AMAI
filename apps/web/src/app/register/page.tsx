"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Logo } from '@/components/logo';
import { User, AtSign, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { API_BASE, isAuthenticated } from '@/lib/api';


export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
      return;
    }
    setCheckingSession(false);
  }, [router]);

  const isPasswordLong = password.length >= 8;
  const isPasswordStrong = isPasswordLong && /\d/.test(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isPasswordLong) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      setError(data.message || 'Failed to create account. Please try again.');
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
              Create your AMAI Account
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Start automating your content pipeline with AI intelligence.
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

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Full Name
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-4 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500/50 transition"
              />
            </div>
          </div>

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
                placeholder="alex@company.com"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500/50 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
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

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500/50 transition"
              />
            </div>
          </div>

          {/* Password Strength Indicators */}
          {password && (
            <div className="space-y-1 pt-1">
              <div className="h-1.5 w-full bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isPasswordStrong ? 'w-full bg-emerald-500' : isPasswordLong ? 'w-2/3 bg-amber-500' : 'w-1/3 bg-red-500'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                {isPasswordStrong ? '✅ Strong password' : isPasswordLong ? '⚠️ Add a number for a stronger password' : '❌ Minimum 8 characters required'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-900 via-violet-700 to-violet-600 hover:opacity-95 text-white font-bold text-sm rounded-2xl shadow-xl shadow-violet-600/20 transition flex items-center justify-center space-x-2 border border-white/20 touch-target disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Creating Account...' : 'Create AMAI Account'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-500 dark:text-zinc-400 pt-2">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-violet-600 dark:text-violet-400 hover:underline">
            Sign in
          </Link>
        </p>

      </motion.div>
    </div>
  );
}
