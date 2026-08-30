import type { Metadata } from 'next';
import Link from 'next/link';
import '@/styles/landing.css';
import { Logo } from '@/components/logo';
import { MarketingAdminDashboard } from '@/components/marketing/MarketingAdminDashboard';
import BrandAttribution from '@/components/BrandAttribution';

export const metadata: Metadata = {
  title: 'Oyinca Admin | Marketing & Founding Creator Acquisition',
  description: 'Founder administration view for early access signups, referral metrics, and Founding TikTok Creator qualification.',
};

export default function MarketingAdminPage() {
  return (
    <div className="amai-landing min-h-screen relative font-sans text-slate-100 selection:bg-[#7FB0DB] selection:text-black">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full mt-3 sm:mt-4 max-w-7xl">
          <nav
            className="flex items-center justify-between rounded-full px-5 py-3 sm:px-6 sm:py-3.5"
            style={{
              background: 'color-mix(in srgb, var(--lp-bg-soft) 85%, transparent)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--lp-border)',
            }}
          >
            <Link href="/" className="flex items-center gap-2" aria-label="Oyinca home">
              <Logo variant="full" size="md" />
            </Link>

            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
              ADMIN CONSOLE
            </span>
          </nav>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="pt-28 pb-16 px-4 md:px-8">
        <MarketingAdminDashboard />
      </main>

      {/* Footer */}
      <footer className="w-full border-t py-10 text-center space-y-2" style={{ borderColor: 'var(--lp-border)' }}>
        <BrandAttribution />
        <p className="text-xs" style={{ color: 'var(--lp-text-muted)' }}>
          © 2026 Oyinca. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
