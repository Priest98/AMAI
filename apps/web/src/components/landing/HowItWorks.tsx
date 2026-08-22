"use client";

import React from 'react';
import { Link2, UploadCloud, Brain, PlayCircle, TrendingUp } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

const STEPS = [
  {
    Icon: Link2,
    title: 'Connect TikTok',
    body: 'Give Oyinca permission to manage your TikTok content.',
  },
  {
    Icon: UploadCloud,
    title: 'Give Oyinca your content',
    body: 'Upload the photos and videos you already have, or connect Google Drive.',
  },
  {
    Icon: Brain,
    title: 'Oyinca creates your posts',
    body: 'Captions, hashtags and a posting plan, optimized for TikTok.',
  },
  {
    Icon: PlayCircle,
    title: 'Review or enable Autopilot',
    body: 'Approve each post yourself, or let Oyinca Autopilot handle it end to end.',
  },
  {
    Icon: TrendingUp,
    title: 'Oyinca publishes to TikTok',
    body: 'Your post goes live, and Oyinca logs the result and learns for next time.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 sm:py-20" aria-label="How Oyinca works">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>How It Works</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            From content to TikTok, automatically.
          </h2>
        </Reveal>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <div className="lp-card h-full p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--lp-cyan-soft)' }}
                  >
                    <step.Icon className="h-5 w-5" style={{ color: 'var(--lp-cyan)' }} />
                  </div>
                  <span className="lp-heading text-xs font-bold" style={{ color: 'var(--lp-text-muted)' }}>
                    STEP {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="lp-heading font-bold text-[15px]">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-10 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--lp-text-muted)' }}>
            Set it up once. Keep improving over time.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
