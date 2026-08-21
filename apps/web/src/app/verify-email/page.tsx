"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Logo } from '@/components/logo';
import Button from '@/components/ui/Button';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ExternalLink } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import BrandAttribution from '@/components/BrandAttribution';


function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token');
  const userEmail = searchParams.get('email') || 'your email';

  const [verifying, setVerifying] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (token) {
      handleVerifyToken(token);
    }
  }, [token]);

  const handleVerifyToken = async (tokenToVerify: string) => {
    setVerifying(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToVerify }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setVerified(true);
      } else {
        setError(data.message || 'This verification link is invalid or has expired.');
      }
    } catch (e) {
      setError('Unable to reach the server. Please check your connection and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!userEmail || userEmail === 'your email') return;
    setResending(true);
    setResendMessage('');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendMessage(data.message || 'Verification email resent successfully.');
      } else {
        setError(data.message || 'Could not resend the verification email. Please try again.');
      }
    } catch (e) {
      setError('Unable to reach the server. Please check your connection and try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 p-4" style={{ color: 'var(--text-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel w-full max-w-md rounded-[var(--radius-xl)] p-8 sm:p-10 space-y-8 text-center relative overflow-hidden"
      >
        <Link href="/" className="inline-block">
          <Logo className="h-9" />
        </Link>

        {verifying ? (
          <div className="space-y-4 py-8">
            <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--accent-secondary-subtle)', color: 'var(--accent-secondary)' }}>
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
            <h2 className="text-h2" style={{ color: 'var(--text-primary)' }}>Verifying your email...</h2>
            <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>Please wait while we confirm your security token.</p>
          </div>
        ) : verified ? (
          <div className="space-y-6">
            <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto border" style={{ backgroundColor: 'var(--accent-success-subtle)', color: 'var(--accent-success)', borderColor: 'var(--accent-success)' }}>
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-h1" style={{ color: 'var(--text-primary)' }}>Email verified</h2>
              <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Your account is active. You can now log in and access your AMAI workspace.
              </p>
            </div>

            <Link href="/login">
              <Button variant="primary" fullWidth icon={<ArrowRight className="h-4 w-4" />}>Continue to Sign In</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto border" style={{ backgroundColor: 'var(--accent-secondary-subtle)', color: 'var(--accent-secondary)', borderColor: 'var(--accent-secondary)' }}>
              <Mail className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-h1" style={{ color: 'var(--text-primary)' }}>Check your inbox</h2>
              <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                We've sent a verification link to <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{userEmail}</span>. Click it to activate your account, then come back and sign in.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-[var(--radius-lg)] border text-xs font-semibold flex items-center justify-center space-x-2" style={{ backgroundColor: 'var(--accent-error-subtle)', borderColor: 'var(--accent-error)', color: 'var(--accent-error)' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {resendMessage && (
              <div className="p-4 rounded-[var(--radius-lg)] border text-xs font-semibold" style={{ backgroundColor: 'var(--accent-success-subtle)', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}>
                {resendMessage}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <a href="https://mail.google.com" target="_blank" rel="noreferrer">
                <Button variant="secondary" fullWidth icon={<ExternalLink className="h-3.5 w-3.5" />}>Open Email Inbox</Button>
              </a>

              <Button
                variant="ghost"
                fullWidth
                onClick={handleResend}
                loading={resending}
                icon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </Button>

              <div className="pt-2">
                <Link href="/register" className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent-secondary)' }}>
                  Wrong email address? Change Email
                </Link>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <BrandAttribution />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }} />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
