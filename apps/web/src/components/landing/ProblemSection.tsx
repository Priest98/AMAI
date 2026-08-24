"use client";

import React from 'react';
import GsapReveal from './GsapReveal';

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
    // Luxury-motion brief: py-32/40 breathing room, replacing the previous
    // dense py-16 sm:py-12. Scaled responsively (py-24 -> sm:py-32 ->
    // lg:py-40) rather than a flat py-40 everywhere, so mobile still gets a
    // real increase in room without the section becoming mostly whitespace
    // on a small screen.
    <section className="relative py-24 sm:py-32 lg:py-40" aria-label="The problem Oyinca solves">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 text-center">
        <GsapReveal>
          <h2 className="lp-heading-display text-3xl sm:text-4xl lg:text-5xl">
            Social media shouldn&rsquo;t feel like
            <br className="hidden sm:block" /> a second full-time job.
          </h2>
        </GsapReveal>

        {/* Mobile-audit fix (carried forward): stacked with real gaps on
            mobile so each item gets its own breathing room; reverts to a
            wrapped row at sm+. Gaps widened further per the luxury-spacing
            pass. */}
        <GsapReveal delay={0.1} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-3">
          {PAIN_POINTS.map((point) => (
            <span key={point} className="text-sm leading-relaxed sm:text-base font-medium" style={{ color: 'var(--lp-text-muted)' }}>
              {point}
            </span>
          ))}
        </GsapReveal>

        <GsapReveal delay={0.2}>
          <p className="mt-10 text-lg leading-relaxed sm:text-xl font-semibold lp-heading">
            It all takes time. <span className="lp-gradient-text">That&rsquo;s what you hired Oyinca for.</span>
          </p>
        </GsapReveal>
      </div>
    </section>
  );
}
