"use client";

import React from 'react';
import { UploadCloud, SlidersHorizontal, TrendingUp, Zap, CalendarClock, Sparkles } from 'lucide-react';
import { TikTokLogo } from '@/components/icons/platform-logos';
import { Eyebrow } from './shared';
import GsapReveal from './GsapReveal';
import GsapStaggerGroup from './GsapStaggerGroup';

/**
 * The one workflow section on the page -- three steps, not five. "Connect
 * TikTok" and "Review or enable Autopilot" used to be their own cards; the
 * former is a one-time prerequisite folded into step 1, the latter is a
 * preference folded into step 2, not a separate ongoing action.
 *
 * This section now also absorbs two sections that used to sit below it and
 * restate the same pipeline:
 * - AutopilotSection ("Let Oyinca handle your TikTok automatically") drew
 *   the same three steps as a five-box arrow diagram. Removed outright --
 *   showing the identical pipeline twice in a row added length, not
 *   information.
 * - ProductVisual ("Your TikTok, working in the background") is genuine
 *   product-credibility content, not a repeat of the steps above, so it
 *   survives as a short subheading + compact status row instead of its own
 *   full-height section.
 */
const STEPS = [
  {
    Icon: UploadCloud,
    title: 'Add your content',
    body: 'Connect TikTok, then give Oyinca the photos and videos you already have, or connect Google Drive.',
  },
  {
    Icon: SlidersHorizontal,
    title: 'Set your preferences',
    body: 'Tell Oyinca your brand voice and posting style, and choose Assisted or Autopilot.',
  },
  {
    Icon: TrendingUp,
    title: 'Oyinca creates and publishes',
    body: 'Captions, hashtags and a posting plan, published straight to TikTok, then Oyinca learns from what works.',
  },
];

const STATUS_ITEMS = [
  { Icon: Zap, label: 'Autopilot', value: 'Active', tone: 'cyan' as const, live: true },
  { Icon: CalendarClock, label: 'Scheduled', value: '3 posts', tone: 'purple' as const },
  { Icon: Sparkles, label: 'Recommendations', value: '2 new', tone: 'cyan' as const },
  { Icon: TikTokLogo, label: 'TikTok', value: 'Connected', tone: 'purple' as const },
  { Icon: TrendingUp, label: 'Performance', value: 'Tracking', tone: 'cyan' as const },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 lg:py-40" aria-label="How Oyinca works">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <GsapReveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>How It Works</Eyebrow>
          <h2 className="lp-heading-display mt-6 text-3xl sm:text-4xl lg:text-5xl">
            From content to TikTok, automatically.
          </h2>
        </GsapReveal>

        {/* Luxury-motion brief, highest-emphasis item after Pricing: high
            horizontal card padding (p-10), generous margin under each
            icon before the copy starts, wider gaps between the 3 columns,
            and the whole row entering as one GSAP ScrollTrigger stagger
            (not three independently-delayed reveals) as it scrolls into
            view. lp-card-sheen adds the hover-triggered glowing-gradient
            sheen the brief asks for on cards. */}
        <GsapStaggerGroup className="mt-16 grid sm:grid-cols-3 gap-8 lg:gap-10" stagger={0.15}>
          {STEPS.map((step, i) => (
            <div key={step.title} className="lp-card lp-card-sheen h-full p-10 flex flex-col">
              <div className="flex items-center justify-between">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--lp-cyan-soft)' }}
                >
                  <step.Icon className="h-6 w-6" style={{ color: 'var(--lp-cyan)' }} />
                </div>
                <span className="lp-heading text-xs font-bold" style={{ color: 'var(--lp-text-muted)' }}>
                  STEP {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="lp-heading-display mt-8 text-xl">{step.title}</h3>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                {step.body}
              </p>
            </div>
          ))}
        </GsapStaggerGroup>

        <GsapReveal delay={0.1} className="mt-12 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--lp-text-muted)' }}>
            Set it up once. Keep improving over time.
          </p>
        </GsapReveal>

        {/* Formerly its own section ("Your TikTok, working in the
            background."). Kept as a short subheading plus a compact status
            row -- real product credibility, without a second full-height
            block repeating the same automation promise. */}
        <GsapReveal delay={0.15} className="mt-20 text-center">
          <h3 className="lp-heading-display text-lg sm:text-xl">
            Your TikTok, working in the background.
          </h3>
        </GsapReveal>

        <GsapReveal delay={0.2} className="mt-8">
          <div className="lp-card p-6 sm:p-8">
            {/* Mobile-audit fix (carried forward): one column on mobile
                gives every stat its full row width. Gap widened per the
                luxury-spacing pass. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {STATUS_ITEMS.map((item) => (
                <div key={item.label} className="flex flex-col gap-2.5 p-4 rounded-xl lp-glass">
                  <div className="flex items-center justify-between">
                    <item.Icon
                      className="h-4 w-4"
                      style={{ color: item.tone === 'cyan' ? 'var(--lp-cyan)' : 'var(--lp-purple)' }}
                    />
                    {item.live && (
                      <span
                        className="h-1.5 w-1.5 rounded-full animate-pulse"
                        style={{ background: 'var(--lp-cyan)' }}
                      />
                    )}
                  </div>
                  <div>
                    <p
                      className="text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: 'var(--lp-text-muted)' }}
                    >
                      {item.label}
                    </p>
                    <p className="lp-heading mt-0.5 text-sm font-bold" style={{ color: 'var(--lp-text-primary)' }}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GsapReveal>
      </div>
    </section>
  );
}
