"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Logo } from '@/components/logo';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { AtSign, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import BrandAttribution from '@/components/BrandAttribution';


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

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Something went wrong. Please try again.');
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
              Forgot Your Password?
            </h1>
            <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto border" style={{ backgroundColor: 'var(--accent-success-subtle)', color: 'var(--accent-success)', borderColor: 'var(--accent-success)' }}>
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-h2" style={{ color: 'var(--text-primary)' }}>Password Reset Email Sent</h2>
              <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                If an account exists for <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{email}</span>, you will receive a password reset link shortly.
              </p>
            </div>
            <Link href="/login">
              <Button variant="secondary" fullWidth>Back to Sign In</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-[var(--radius-lg)] border text-xs font-semibold flex items-center space-x-2" style={{ backgroundColor: 'var(--accent-error-subtle)', borderColor: 'var(--accent-error)', color: 'var(--accent-error)' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Registered Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              leadingIcon={<AtSign className="h-4 w-4" />}
            />

            <Button type="submit" variant="primary" fullWidth loading={loading} icon={<ArrowRight className="h-4 w-4" />}>
              Send Reset Link
            </Button>

            <p className="text-center text-body-sm pt-2" style={{ color: 'var(--text-secondary)' }}>
              Remembered your password?{' '}
              <Link href="/login" className="font-bold hover:underline" style={{ color: 'var(--accent-secondary)' }}>
                Sign in
              </Link>
            </p>
          </form>
        )}

      </motion.div>

      <BrandAttribution />
    </div>
  );
}
