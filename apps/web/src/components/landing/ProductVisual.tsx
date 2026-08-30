'use client';

import React from 'react';
import { Zap, CalendarClock, Gem, TrendingUp } from 'lucide-react';
import { TikTokLogo } from '@/components/icons/platform-logos';

const STATUS_ITEMS = [
  { Icon: Zap, label: 'Autopilot', value: 'Active', tone: 'cyan' as const, live: true },
  { Icon: CalendarClock, label: 'Scheduled', value: '3 posts', tone: 'gold' as const },
  { Icon: Gem, label: 'Recommendations', value: '2 new', tone: 'cyan' as const },
  { Icon: TikTokLogo, label: 'TikTok', value: 'Connected', tone: 'cyan' as const },
  { Icon: TrendingUp, label: 'Performance', value: 'Tracking', tone: 'gold' as const },
];

export default function ProductVisual() {
  return (
    <section className="relative py-12 w-full max-w-5xl mx-auto px-5 sm:px-8" aria-label="Oyinca status strip">
      <div className="text-center mb-8">
        <h2 className="lp-heading-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Your TikTok, working in the background.
        </h2>
      </div>

      <div className="lp-card p-6 sm:p-8 border" style={{ borderColor: 'var(--lp-border)' }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {STATUS_ITEMS.map((item) => (
            <div key={item.label} className="flex flex-col gap-3 p-4 rounded-xl lp-glass text-left">
              <div className="flex items-center justify-between">
                <item.Icon
                  className="h-4 w-4"
                  style={{ color: item.tone === 'cyan' ? 'var(--lp-cyan)' : 'var(--lp-gold)' }}
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
    </section>
  );
}
