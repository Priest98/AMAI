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
    <section className="relative py-16 sm:py-20" aria-label="The problem AMAI solves">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <Reveal>
          <h2 className="lp-heading text-3xl sm:text-4xl font-bold tracking-tight">
            You have a business to run.
            <br className="hidden sm:block" /> Not a content calendar to babysit.
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {PAIN_POINTS.map((point) => (
            <span key={point} className="text-sm sm:text-base font-medium" style={{ color: 'var(--lp-text-muted)' }}>
              {point}
            </span>
          ))}
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-8 text-lg sm:text-xl font-semibold lp-heading">
            It all takes time. <span className="lp-gradient-text">AMAI handles the repetitive work.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
