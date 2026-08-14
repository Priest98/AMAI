"use client";

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

export default function AnalyticsSection() {
  return (
    <section className="relative py-24 sm:py-28" aria-label="Performance Intelligence">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-14 items-center">
        <Reveal>
          <Eyebrow>Performance Intelligence</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Don&rsquo;t just see the numbers. Know what to do next.
          </h2>
          <p className="mt-5 text-base leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
            AMAI turns performance data into useful decisions. Instead of{' '}
            <span style={{ color: 'var(--lp-text-muted)' }}>&ldquo;Your engagement was 4.2%,&rdquo;</span>{' '}
            AMAI should help answer{' '}
            <span className="font-semibold" style={{ color: 'var(--lp-text-primary)' }}>
              &ldquo;Your product videos are outperforming static posts. Here&rsquo;s what I&rsquo;d do next.&rdquo;
            </span>
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="lp-card p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--lp-cyan)' }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--lp-cyan)' }}>AMAI Recommends</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--lp-text-primary)' }}>
              Your last 5 product videos performed above your average.
            </p>
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--lp-border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--lp-text-muted)' }}>Next Move</p>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                Create 3 more product-focused videos this week.
              </p>
            </div>
            <Link
              href="/register"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm lp-btn-primary lp-focus-ring"
            >
              Create Content
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
