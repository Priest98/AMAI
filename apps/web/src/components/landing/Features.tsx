"use client";

import React from 'react';
import { BrainCircuit, PenLine, Rocket, LineChart } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

/**
 * The entire feature story in four cards. Deliberately one line of body
 * copy each -- this section answers "what does it do for me", and anything
 * longer turns a scannable answer back into an essay. Concepts that used to
 * have their own full sections (Content Intelligence, Content Repurposing,
 * Continuous Learning, the Google Drive pipeline, multi-platform publishing)
 * are folded into these four cards and the supporting line below, because
 * they're facets of the same four ideas rather than separate products.
 */
const FEATURES = [
  {
    Icon: PenLine,
    title: 'Content Creation',
    body: 'Captions, hashtags and ready-to-publish TikTok posts from your photos and videos.',
    tone: 'purple' as const,
  },
  {
    Icon: Rocket,
    title: 'Scheduling & Publishing',
    body: 'Oyinca plans the best time to post and publishes to TikTok automatically.',
    tone: 'cyan' as const,
  },
  {
    Icon: BrainCircuit,
    title: 'Recommendations',
    body: 'Oyinca learns your business, brand and audience, and tells you what to create next.',
    tone: 'cyan' as const,
  },
  {
    Icon: LineChart,
    title: 'Performance Insights',
    body: 'See what’s working, and what to do next.',
    tone: 'purple' as const,
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-16 sm:py-20" aria-label="What Oyinca Handles">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>What Oyinca Handles</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Everything your TikTok needs.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 0.06}>
              <div className="lp-card h-full p-6 flex flex-col gap-4">
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center"
                  style={{ background: feature.tone === 'cyan' ? 'var(--lp-cyan-soft)' : 'var(--lp-purple-soft)' }}
                >
                  <feature.Icon
                    className="h-5 w-5"
                    style={{ color: feature.tone === 'cyan' ? 'var(--lp-cyan)' : 'var(--lp-purple)' }}
                  />
                </div>
                <h3 className="lp-heading font-bold text-base">{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                  {feature.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Where the old standalone "One workflow. Multiple channels." and
            "Google Drive → content engine" sections ended up. These are
            supporting details, not headline claims -- a visitor wants to
            know they're covered, not read a section about each. */}
        <Reveal delay={0.3} className="mt-10 text-center">
          <p className="text-sm max-w-2xl mx-auto" style={{ color: 'var(--lp-text-muted)' }}>
            Content creation, captions, hashtags, scheduling, publishing, recommendations and
            performance insights &mdash; all handled. Connect Google Drive to turn content you already
            have into posts.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
