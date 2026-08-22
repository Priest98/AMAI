"use client";

import React from 'react';
import { Package, Users, MessageSquare, Heart, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

const REMEMBERS = [
  { Icon: Package, label: 'Your products' },
  { Icon: Users, label: 'Your audience' },
  { Icon: MessageSquare, label: 'Your tone' },
  { Icon: Heart, label: 'Your content preferences' },
  { Icon: ThumbsUp, label: "What you've approved" },
  { Icon: ThumbsDown, label: "What you've rejected" },
  { Icon: TrendingUp, label: "What's performing" },
  { Icon: TrendingDown, label: "What isn't" },
];

export default function BusinessBrainSection() {
  return (
    <section id="business-brain" className="relative py-24 sm:py-28" aria-label="Business Brain">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-14 items-center">
        <Reveal>
          <Eyebrow>Business Brain</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            The more Oyinca knows, the better it works.
          </h2>
          <p className="mt-5 text-base leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
            Your business isn&rsquo;t generic. Your social media shouldn&rsquo;t be either. Oyinca remembers
            the things that matter, and over time builds a smarter picture of your business.
          </p>

          <div className="mt-8 lp-card p-5">
            <p className="text-sm font-semibold" style={{ color: 'var(--lp-text-secondary)' }}>
              Generic AI gives you answers.
            </p>
            <p className="mt-1 lp-heading text-lg font-bold lp-gradient-text">
              Oyinca learns how your business works.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="lp-card p-6 sm:p-8 grid grid-cols-2 gap-4">
            {REMEMBERS.map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <div className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--lp-cyan-soft)' }}>
                  <item.Icon className="h-4 w-4" style={{ color: 'var(--lp-cyan)' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--lp-text-primary)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
