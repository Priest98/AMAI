"use client";

import React from 'react';
import { Reveal } from './shared';

/**
 * Per the copy brief: no fabricated customer logos, stats, or testimonials.
 * This is deliberately a quiet trust strip, not a numbers/testimonial wall
 * -- real proof (logos, quotes, stats) gets added here once it exists.
 */
export default function SocialProof() {
  return (
    <section className="relative py-14" aria-label="Who Oyinca is built for">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <Reveal>
          <p className="text-sm sm:text-base font-medium" style={{ color: 'var(--lp-text-muted)' }}>
            Built for businesses that want to grow without spending all day posting.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
