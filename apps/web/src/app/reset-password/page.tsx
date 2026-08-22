"use client";
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Logo } from '@/components/logo';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import BrandAttribution from '@/components/BrandAttribution';


function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Invalid or expired password reset link.');
      }
    } catch (err) {
      setError('Unable to reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 p-4" style={{ color: 'var(--text-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel w-full max-w-md rounded-[var(--radius-xl)] p-8 sm:p-10 space-y-8 relative overflow-hidden"
      >
        <div className="space-y-3 text-center sm:text-left">
          <Link href="/" className="inline-block">
            <Logo className="h-9" />
          </Link>
          <div>
            <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>
              Reset Your Password
            </h1>
            <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Enter your new password below to regain access to your account.
            </p>
          </div>
        </div>

        {success ? (
          <div className="space-y-6 text-center">
            <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto border" style={{ backgroundColor: 'var(--accent-success-subtle)', color: 'var(--accent-success)', borderColor: 'var(--accent-success)' }}>
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-h2" style={{ color: 'var(--text-primary)' }}>Password reset</h2>
              <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                Your password has been updated. You can now sign in to your Oyinca account.
              </p>
            </div>
            <Link href="/login">
              <Button variant="primary" fullWidth icon={<ArrowRight className="h-4 w-4" />}>Sign In Now</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div className="p-4 rounded-[var(--radius-lg)] border text-xs font-semibold flex items-center space-x-2" style={{ backgroundColor: 'var(--accent-error-subtle)', borderColor: 'var(--accent-error)', color: 'var(--accent-error)' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-overline block">New Password</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
              label="Confirm New Password"
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              leadingIcon={<Lock className="h-4 w-4" />}
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" fullWidth loading={loading} icon={<ArrowRight className="h-4 w-4" />}>
                Save New Password
              </Button>
            </div>
          </form>
        )}
      </motion.div>

      <BrandAttribution />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
