"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

const NAV_LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

/**
 * Floating "island" header -- a self-contained pill rather than a
 * full-width bar, adapted (not copied) for AMAI: it stays centered and
 * sticky, tightens its padding/shadow once the page scrolls, and the
 * mobile menu drops as its own rounded glass panel just beneath the pill
 * instead of a full-width strip.
 */
export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto w-full transition-all duration-500 ease-out ${
          scrolled ? 'mt-3 max-w-2xl' : 'mt-5 max-w-4xl'
        }`}
      >
        <nav
          aria-label="Primary"
          className="flex items-center justify-between rounded-full transition-all duration-500 ease-out"
          style={{
            padding: scrolled ? '0.4rem 0.4rem 0.4rem 1.25rem' : '0.7rem 0.7rem 0.7rem 1.5rem',
            background: 'color-mix(in srgb, var(--lp-bg-soft) 62%, transparent)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--lp-border)',
            boxShadow: scrolled
              ? '0 10px 34px -12px rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)'
              : '0 6px 24px -10px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
          }}
        >
          <Link href="/" className="font-bold text-lg lp-heading tracking-tight lp-gradient-text lp-focus-ring shrink-0" aria-label="AMAI home">
            AMAI
          </Link>

          <div className="hidden lg:flex items-center gap-9 mx-9">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium transition-colors duration-200 lp-focus-ring whitespace-nowrap"
                style={{ color: 'var(--lp-text-secondary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--lp-text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--lp-text-secondary)')}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95 lp-focus-ring"
              style={{ color: 'var(--lp-text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--lp-text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--lp-text-secondary)')}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-full text-sm lp-btn-primary lp-focus-ring transition-transform duration-200 active:scale-95"
            >
              Start Free
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="lp-btn-icon-glass p-2.5 lp-focus-ring"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="lg:hidden mt-2 rounded-3xl overflow-hidden origin-top"
              style={{
                background: 'color-mix(in srgb, var(--lp-bg-soft) 80%, transparent)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--lp-border)',
                boxShadow: '0 10px 34px -12px rgba(0, 0, 0, 0.55)',
              }}
            >
              <div className="px-5 py-5 flex flex-col gap-4">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-sm font-semibold lp-focus-ring"
                    style={{ color: 'var(--lp-text-secondary)' }}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex gap-3 pt-2">
                  <Link href="/login" className="flex-1 text-center px-4 py-2.5 rounded-full text-sm font-semibold lp-btn-ghost">
                    Sign In
                  </Link>
                  <Link href="/register" className="flex-1 text-center px-4 py-2.5 rounded-full text-sm lp-btn-primary">
                    Start Free
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
