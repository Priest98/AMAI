"use client";

import React from 'react';
import { Reveal, Eyebrow } from './shared';

export default function TransitionSection() {
  return (
    <section id="meet-oyinca" className="relative py-20 sm:py-24" aria-label="Meet Oyinca">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <Reveal>
          <Eyebrow>Meet Oyinca</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Oyinca handles the work behind the post.
          </h2>
          <p className="mt-5 text-base sm:text-lg leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
            Oyinca isn&rsquo;t another scheduling dashboard &mdash; it&rsquo;s an AI social media manager.
            It learns your business, understands your content, helps shape your strategy, publishes to
            TikTok, watches the results and uses what it learns to make better decisions next time.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
