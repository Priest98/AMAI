"use client";

import React from 'react';
import { Zap, CalendarClock, Sparkles, Instagram, TrendingUp } from 'lucide-react';
import { Reveal } from './shared';

/**
 * Proof section. Deliberately almost copy-free: by this point the visitor
 * has been told what AMAI does three times over, and a fourth paragraph
 * saying it again is weaker than simply showing the product doing it. This
 * replaces both the old EnginePipeline section and the InteractiveDemo
 * walkthrough, which were two separate "watch it work" sections making
 * overlapping claims.
 *
 * The figures below are an illustrative snapshot of the dashboard, not live
 * data -- kept deliberately modest and generic (no invented customer
 * metrics or growth percentages) so nothing here reads as a performance
 * claim AMAI can't stand behind.
 */
const STATUS_ITEMS = [
  { Icon: Zap, label: 'AutoPilot', value: 'Active', tone: 'cyan' as const, live: true },
  { Icon: CalendarClock, label: 'Scheduled', value: '3 posts', tone: 'purple' as const },
  { Icon: Sparkles, label: 'Recommendations', value: '2 new', tone: 'cyan' as const },
  { Icon: Instagram, label: 'Instagram', value: 'Connected', tone: 'purple' as const },
  { Icon: TrendingUp, label: 'Performance', value: 'Tracking', tone: 'cyan' as const },
];

export default function ProductVisual() {
  return (
    <section className="relative py-16 sm:py-20" aria-label="AMAI at work">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="lp-heading text-3xl sm:text-4xl font-bold tracking-tight">
            Your social media, working in the background.
          </h2>
        </Reveal>

        <Reveal delay={0.15} className="mt-12">
          <div className="lp-card p-6 sm:p-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {STATUS_ITEMS.map((item) => (
                <div key={item.label} className="flex flex-col gap-3 p-4 rounded-xl lp-glass">
                  <div className="flex items-center justify-between">
                    <item.Icon
                      className="h-4 w-4"
                      style={{ color: item.tone === 'cyan' ? 'var(--lp-cyan)' : 'var(--lp-purple)' }}
                    />
                    {item.live && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full animate-pulse"
                          style={{ background: 'var(--lp-cyan)' }}
                        />
                      </span>
                    )}
                  </div>
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: 'var(--lp-text-muted)' }}
                    >
                      {item.label}
                    </p>
                    <p className="lp-heading mt-1 text-sm font-bold" style={{ color: 'var(--lp-text-primary)' }}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
