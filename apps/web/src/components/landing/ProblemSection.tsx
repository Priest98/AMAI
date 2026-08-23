"use client";

import React from 'react';
import { Reveal } from './shared';

// Four, not six. The point lands on the third item -- past that it stops
// building the case and starts padding the scroll.
const PAIN_POINTS = [
  'Creating posts.',
  'Writing captions.',
  'Scheduling content.',
  'Checking performance.',
];

export default function ProblemSection() {
  return (
    <section className="relative py-16 sm:py-12" aria-label="The problem Oyinca solves">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <Reveal>
          <h2 className="lp-heading text-3xl sm:text-4xl font-bold tracking-tight">
            Social media shouldn&rsquo;t feel like
            <br className="hidden sm:block" /> a second full-time job.
          </h2>
        </Reveal>

        {/* Mobile-audit fix: these read as a cramped wrapped row on a phone
            (four short items fighting for space on 2 tight lines). Stacked
            with real gaps on mobile so each gets its own breathing room;
            reverts to the original single wrapped row at sm+ where there's
            width to spare. */}
        <Reveal delay={0.1} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2">
          {PAIN_POINTS.map((point) => (
            <span key={point} className="text-sm sm:text-base font-medium" style={{ color: 'var(--lp-text-muted)' }}>
              {point}
            </span>
          ))}
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-8 text-lg sm:text-xl font-semibold lp-heading">
            It all takes time. <span className="lp-gradient-text">That&rsquo;s what you hired Oyinca for.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
