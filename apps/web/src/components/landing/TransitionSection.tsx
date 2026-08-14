"use client";

import React from 'react';
import { Reveal, Eyebrow } from './shared';

export default function TransitionSection() {
  return (
    <section className="relative py-20 sm:py-24" aria-label="Meet your new digital employee">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <Reveal>
          <Eyebrow>Meet Your New Digital Employee</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            AMAI handles the work behind the post.
          </h2>
          <p className="mt-5 text-base sm:text-lg leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
            AMAI doesn&rsquo;t just schedule content. It learns your business, understands your content,
            helps shape your strategy, publishes across your channels, watches the results and uses what
            it learns to make better decisions.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
