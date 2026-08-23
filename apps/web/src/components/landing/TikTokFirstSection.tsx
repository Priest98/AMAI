"use client";

import React from 'react';
import { Reveal, Eyebrow } from './shared';

/**
 * Spec section 17 requires this as its own named section ("TikTok First"),
 * distinct from the Hero/How It Works copy: it's the strategic-positioning
 * statement, not a feature or a proof point. Per the spec's section 29
 * strategic rule, Oyinca is not a TikTok-only brand; it's an AI social
 * media manager that starts with TikTok, so this section says exactly
 * that and nothing more (no claims about Instagram or other platforms
 * being live, since they aren't part of V1).
 */
export default function TikTokFirstSection() {
  return (
    <section id="tiktok-first" className="relative py-12 sm:py-16" aria-label="TikTok first">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <Reveal>
          <Eyebrow>TikTok First</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Built for TikTok today.
            <br />
            Built for your entire social presence tomorrow.
          </h2>
          <p className="mt-5 text-base sm:text-lg leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
            Oyinca is an AI social media manager, not a TikTok-only tool. TikTok is where it starts,
            with more platforms on the roadmap.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
