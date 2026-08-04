"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Logo } from '@/components/logo';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { User, AtSign, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { API_BASE, isAuthenticated } from '@/lib/api';
import { capture } from '@/lib/posthog';


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
        capture('signup_completed', { email });
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
    return <div className="min-h-screen w-full" style={{ backgroundColor: 'var(--bg-base)' }} />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ color: 'var(--text-primary)' }}>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel w-full max-w-md rounded-[var(--radius-xl)] p-8 sm:p-10 space-y-8 relative overflow-hidden"
      >
        {/* Brand Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3 text-center sm:text-left">
            <Link href="/" className="inline-block">
              <Logo className="h-9" />
            </Link>
            <div>
              <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>
                Create your AMAI Account
              </h1>
              <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Start automating your content pipeline with AI intelligence.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-4 rounded-[var(--radius-lg)] border text-xs font-semibold flex items-center space-x-2" style={{ backgroundColor: 'var(--accent-error-subtle)', borderColor: 'var(--accent-error)', color: 'var(--accent-error)' }}>
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="space-y-4">

          <Input
            label="Full Name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alex Morgan"
            leadingIcon={<User className="h-4 w-4" />}
          />

          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@company.com"
            leadingIcon={<AtSign className="h-4 w-4" />}
          />

          <div className="space-y-1.5">
            <label className="text-overline block">Password</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="input-field w-full text-body py-3 pl-10 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5"
                style={{ color: 'var(--text-muted)' }}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Input
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            leadingIcon={<Lock className="h-4 w-4" />}
          />

          {/* Password Strength Indicators */}
          {password && (
            <div className="space-y-1.5 pt-1">
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-sunken)' }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: isPasswordStrong ? '100%' : isPasswordLong ? '66%' : '33%',
                    backgroundColor: isPasswordStrong ? 'var(--accent-success)' : isPasswordLong ? 'var(--accent-warning)' : 'var(--accent-error)',
                  }}
                />
              </div>
              <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
                {isPasswordStrong ? '✅ Strong password' : isPasswordLong ? '⚠️ Add a number for a stronger password' : '❌ Minimum 8 characters required'}
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" variant="primary" fullWidth loading={loading} icon={<ArrowRight className="h-4 w-4" />}>
              Create AMAI Account
            </Button>
          </div>
        </form>

        {/* Footer Link */}
        <p className="text-center text-body-sm pt-2" style={{ color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-bold hover:underline" style={{ color: 'var(--accent-secondary)' }}>
            Sign in
          </Link>
        </p>

      </motion.div>
    </div>
  );
}
