"use client";

import React from 'react';
import Link from 'next/link';
import { Monogram } from '@/components/logo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    // "About" previously linked to "/" -- since that's the page you're
    // already on, it was a functional no-op ("fake button": looks
    // clickable, does nothing meaningful). Removed rather than invented,
    // since writing a real About page is out of scope here. Contact stays:
    // a mailto is a genuinely working destination, just using the
    // founder's real address until a dedicated support inbox exists (same
    // address as Privacy/Terms' CONTACT_EMAIL).
    title: 'Company',
    links: [
      { label: 'Contact', href: 'mailto:Abdurasaqadamolayinka@gmail.com' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t" style={{ borderColor: 'var(--lp-border)' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg lp-heading tracking-tight lp-focus-ring">
              <Monogram className="h-7 w-7 rounded-lg" />
              <span className="lp-gradient-text">Oyinca</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-xs" style={{ color: 'var(--lp-text-secondary)' }}>
              Your AI Social Media Manager, starting with TikTok.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--lp-text-muted)' }}>
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm lp-focus-ring"
                      style={{ color: 'var(--lp-text-secondary)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-14 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px]"
          style={{ borderColor: 'var(--lp-border)', color: 'var(--lp-text-muted)' }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
            <span>© {new Date().getFullYear()} Oyinca. Powered by Turaab Technology. All rights reserved.</span>
          </div>
          {/* Previously linked "TikTok"/"X" to tiktok.com and x.com -- the
              platforms' generic homepages, not an actual Oyinca profile on
              either. That reads as a fake/broken social link (visitor
              expects the brand's account, lands on a generic homepage
              instead), so removed until real Oyinca social profile URLs
              exist to link to. */}
        </div>
      </div>
    </footer>
  );
}
