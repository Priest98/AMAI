"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Logo } from '@/components/logo';
import { AtSign, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_BASE } from '@/lib/api';


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      setSubmitted(true);
    } catch (err) {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F7F8FC] dark:bg-[#0B0D12] text-slate-900 dark:text-white font-sans ambient-bg transition-colors duration-300">
      
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white dark:bg-[#12151D] border border-slate-200/80 dark:border-white/10 rounded-[28px] p-8 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden"
      >
        <div className="space-y-3 text-center sm:text-left">
          <Link href="/" className="inline-block">
            <Logo className="h-9" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Forgot Your Password?
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Password Reset Email Sent</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                If an account exists for <span className="font-bold text-slate-900 dark:text-white">{email}</span>, you will receive a password reset link shortly.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full py-3.5 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs rounded-2xl transition flex items-center justify-center space-x-2 touch-target"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Registered Email Address
              </label>
              <div className="relative flex items-center">
                <AtSign className="absolute left-4 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500/50 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-sm rounded-2xl shadow-xl shadow-rose-500/20 transition flex items-center justify-center space-x-2 border border-white/20 touch-target disabled:opacity-50"
            >
              <span>{loading ? 'Sending Link...' : 'Send Reset Link'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-center text-xs text-slate-500 dark:text-zinc-400 pt-2">
              Remembered your password?{' '}
              <Link href="/login" className="font-bold text-rose-600 dark:text-rose-400 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}

      </motion.div>
    </div>
  );
}
