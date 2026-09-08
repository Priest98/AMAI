"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { AtSign, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { API_BASE, isAuthenticated, setSession } from '@/lib/api';
import { capture, identify } from '@/lib/posthog';
import BrandAttribution from '@/components/BrandAttribution';
import PlanSelectionNotice from '@/components/PlanSelectionNotice';
import { getSelectedPlan, planDestination } from '@/lib/plan-intent';


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
    getSelectedPlan();
    const message = new URLSearchParams(window.location.search).get('error');
    if (message) setError(message);
    if (isAuthenticated()) {
      router.replace(planDestination());
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
      // Security audit fix (3.5): the session cookie is httpOnly and set by
      // the server response itself (Set-Cookie) -- `credentials: 'include'`
      // is what makes the browser actually store it. There's no token in
      // the response body anymore to read or persist; `data.user` is just
      // a non-sensitive snapshot cached for synchronous UI reads.
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setSession(data.user, data.expiresAt);
        identify(email, { email });
        capture('login', { email });
        router.push(planDestination());
        return;
      }

      if (data.message && data.message.includes('UNVERIFIED_EMAIL')) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}${getSelectedPlan() ? '&plan='+getSelectedPlan() : ''}`);
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
    return <div className="min-h-screen w-full" style={{ backgroundColor: 'var(--bg-base)' }} />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 p-4" style={{ color: 'var(--text-primary)' }}>

      <PlanSelectionNotice />
      <div
        className="oy-auth-panel w-full max-w-md rounded-[var(--radius-xl)] p-6 sm:p-10 space-y-8 relative overflow-hidden"
      >
        {/* Brand Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3 text-center sm:text-left">
            <Link href="/" className="inline-block">
              <Logo className="h-9" />
            </Link>
            <div>
              <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>
                Your social media.<br />Finally, managed.
              </h1>
              <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Enter with TikTok and meet your social media manager.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Error Feedback */}
        {error && (
          <div role="alert" className="p-4 rounded-[var(--radius-lg)] border text-sm font-semibold flex items-center space-x-2" style={{ backgroundColor: 'var(--accent-error-subtle)', borderColor: 'var(--accent-error)', color: 'var(--accent-error)' }}>
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <a
          href={`${API_BASE}/oauth/tiktok/login`}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-[var(--radius-lg)] bg-black px-5 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label="Continue with TikTok"
        >
          <span className="relative grid h-6 w-6 place-items-center rounded-full border-2 border-white text-[11px] font-black before:absolute before:-left-1 before:top-0 before:h-full before:w-full before:rounded-full before:border-2 before:border-cyan-300 after:absolute after:left-1 after:top-0 after:h-full after:w-full after:rounded-full after:border-2 after:border-rose-400">♪</span>
          Continue with TikTok
          <ArrowRight className="h-4 w-4" />
        </a>

        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1" style={{ backgroundColor: 'var(--card-border)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>or use email</span>
          <span className="h-px flex-1" style={{ backgroundColor: 'var(--card-border)' }} />
        </div>

        {/* Email / Password Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">

          <Input
            label="Email address"
            name="email"
            autoComplete="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            leadingIcon={<AtSign className="h-4 w-4" />}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-overline block">Password</label>
              <Link href="/forgot-password" className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent-secondary)' }}>
                Forgot password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="password"
                name="password"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input-field w-full text-body py-3 pl-10 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 touch-target flex items-center justify-center"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                style={{ color: 'var(--text-muted)' }}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex min-h-11 items-center space-x-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded h-4 w-4"
                style={{ accentColor: 'var(--accent-secondary)' }}
              />
              <span>Remember me for 30 days</span>
            </label>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={loading} icon={<ArrowRight className="h-4 w-4" />}>
            Sign in
          </Button>
        </form>

        {/* Footer Link */}
        <p className="text-center text-body-sm pt-2" style={{ color: 'var(--text-secondary)' }}>
          Don't have an Oyinca account yet?{' '}
          <Link href="/register" className="font-bold hover:underline" style={{ color: 'var(--accent-secondary)' }}>
            Sign up
          </Link>
        </p>

      </div>

      <BrandAttribution />
    </div>
  );
}
