"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './shared';

export default function FinalCTA() {
  return (
    <section className="relative py-24 sm:py-32 px-5 sm:px-8" aria-label="Get started">
      <Reveal className="max-w-4xl mx-auto">
        <div
          className="relative overflow-hidden rounded-[28px] p-10 sm:p-16 text-center"
          style={{ background: 'var(--lp-surface)', border: '1px solid var(--lp-border)' }}
        >
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{ background: 'var(--lp-gradient-glow)' }}
          />
          <div className="relative">
            <h2 className="lp-heading text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
              Stop managing five apps
              <br />
              to post one video.
            </h2>
            <p className="mt-5 text-base max-w-lg mx-auto" style={{ color: 'var(--lp-text-secondary)' }}>
              Upload once. Approve once. AMAI handles everything in between.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm lp-btn-primary lp-focus-ring"
              >
                Start Automating Free
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-semibold lp-btn-ghost lp-focus-ring"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
