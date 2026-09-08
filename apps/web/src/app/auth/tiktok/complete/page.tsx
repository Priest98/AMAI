"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { API_BASE, setSession } from '@/lib/api';
import { capture, identify } from '@/lib/posthog';

export default function TikTokAuthCompletePage() {
  const router = useRouter();

  useEffect(() => {
    const finish = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        if (!response.ok) throw new Error('Session unavailable');
        const user = await response.json();
        const expiresAt = new URLSearchParams(window.location.search).get('expiresAt') || new Date(Date.now() + 30 * 86400000).toISOString();
        setSession({ id: user.id, email: user.email, name: user.fullName || 'TikTok creator', brandId: user.brandId }, expiresAt);
        identify(user.id, { auth_provider: 'tiktok' });
        capture('dashboard_entered', { source: 'tiktok' });
        router.replace('/dashboard');
      } catch {
        router.replace('/login?error=We%20could%20not%20finish%20TikTok%20sign-in.%20Please%20try%20again.');
      }
    };
    void finish();
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center p-6" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="oy-auth-panel w-full max-w-sm rounded-[var(--radius-xl)] p-8 text-center">
        <Logo className="mx-auto w-fit" />
        <h1 className="mt-6 text-xl font-bold">Setting up your Oyinca workspace</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Connecting your TikTok identity securely…</p>
        <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="Loading" />
      </div>
    </main>
  );
}
