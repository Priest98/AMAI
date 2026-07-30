"use client";

import React from 'react';
import { Star } from 'lucide-react';
import { Reveal, CountUp, Eyebrow } from './shared';

const STATS = [
  { value: 2, suffix: '', label: 'Steps from upload to live: upload, approve' },
  { value: 5, suffix: ' min', label: 'Average setup time to first automated post' },
  { value: 9, suffix: '-stage', label: 'AI pipeline behind every single post' },
  { value: 24, suffix: '/7', label: 'AMAI Engine runs on your schedule, always on' },
];

const TESTIMONIALS = [
  {
    quote: 'I used to spend an evening a week writing captions and scheduling posts across two apps. Now I upload the raw clips and approve a queue on my phone.',
    name: 'Amara O.',
    role: 'Social Media Manager, early access',
  },
  {
    quote: 'The Approval Queue is the whole product for me — I get full control over what actually gets published without doing any of the writing myself.',
    name: 'Daniel R.',
    role: 'Founder, DTC apparel brand',
  },
  {
    quote: 'Watching the engine move a video from upload to published in the activity feed made it click instantly. It’s not a black box.',
    name: 'Priya S.',
    role: 'Content Lead, early access',
  },
];

export default function SocialProof() {
  return (
    <section className="relative py-24 sm:py-32" aria-label="Product highlights and testimonials">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.06}>
              <div className="lp-card p-6 text-center h-full">
                <div className="lp-heading text-3xl sm:text-4xl font-bold lp-gradient-text">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--lp-text-secondary)' }}>
                  {stat.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="text-center max-w-2xl mx-auto mt-24">
          <Eyebrow>Early Access Feedback</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            What early users are saying
          </h2>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              <div className="lp-card h-full p-6 flex flex-col gap-4">
                <div className="flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5" style={{ color: 'var(--lp-cyan)', fill: 'var(--lp-cyan)' }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                  “{t.quote}”
                </p>
                <div className="mt-auto pt-2">
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--lp-text-muted)' }}>{t.role}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
