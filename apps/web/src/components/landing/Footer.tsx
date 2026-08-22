"use client";

import React from 'react';
import Link from 'next/link';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    // About/Contact/Help Center don't have dedicated pages yet -- rather
    // than link to a 404, these point at real, working destinations
    // (home and a mailto) until those pages exist.
    title: 'Company',
    links: [
      { label: 'About', href: '/' },
      { label: 'Contact', href: 'mailto:hello@amai.app' },
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
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-1">
            <Link href="/" className="font-bold text-lg lp-heading tracking-tight lp-gradient-text lp-focus-ring">
              Oyinca
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-xs" style={{ color: 'var(--lp-text-secondary)' }}>
              Your TikTok content, on autopilot.
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
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
            <span>© {new Date().getFullYear()} Turaab Technology. All rights reserved.</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span>Powered by Turaab Technology</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="lp-focus-ring">TikTok</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="lp-focus-ring">Instagram</a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="lp-focus-ring">X</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
