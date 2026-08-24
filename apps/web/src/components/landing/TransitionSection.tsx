"use client";

import React from 'react';
import { Eyebrow } from './shared';
import GsapReveal from './GsapReveal';

export default function TransitionSection() {
  return (
    <section id="meet-oyinca" className="relative py-24 sm:py-32 lg:py-40" aria-label="Meet Oyinca">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 text-center">
        <GsapReveal>
          <Eyebrow>Meet Oyinca</Eyebrow>
          <h2 className="lp-heading-display mt-6 text-3xl sm:text-4xl lg:text-5xl">
            Oyinca handles the work behind the post.
          </h2>
          <p className="mt-6 text-base sm:text-lg leading-loose" style={{ color: 'var(--lp-text-secondary)' }}>
            Oyinca isn&rsquo;t another scheduling dashboard. It&rsquo;s an AI social media manager.
            It learns your business, understands your content, helps shape your strategy, publishes to
            TikTok, watches the results and uses what it learns to make better decisions next time.
          </p>
        </GsapReveal>
      </div>
    </section>
  );
}
