"use client";

import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'AMAI Engine', href: '#engine' },
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign In', href: '/login' },
      { label: 'Create Account', href: '/register' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t" style={{ borderColor: 'var(--lp-border)' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-lg lp-heading lp-focus-ring">
              <span className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--lp-gradient-brand)' }}>
                <Sparkles className="h-4.5 w-4.5" style={{ color: '#04070D' }} />
              </span>
              <span>AMAI</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-xs" style={{ color: 'var(--lp-text-secondary)' }}>
              The AI social media operating system. Upload once, approve once, then let AMAI run your social media.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--lp-text-muted)' }}>
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
          className="mt-14 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{ borderColor: 'var(--lp-border)', color: 'var(--lp-text-muted)' }}
        >
          <span>© {new Date().getFullYear()} AMAI. All rights reserved.</span>
          <span>Built for creators who’d rather create than post.</span>
        </div>
      </div>
    </footer>
  );
}
