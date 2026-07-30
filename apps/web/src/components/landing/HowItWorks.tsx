"use client";

import React from 'react';
import { UploadCloud, ScanEye, PenLine, ShieldCheck, Rocket } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

const STEPS = [
  {
    Icon: UploadCloud,
    title: 'Drop your media',
    body: 'Upload directly or connect Google Drive — AMAI picks up new video and photo content automatically.',
  },
  {
    Icon: ScanEye,
    title: 'AI Vision analyzes it',
    body: 'AMAI watches the content, understands what’s in frame, and detects the best-fit platform format.',
  },
  {
    Icon: PenLine,
    title: 'Caption & hashtags written',
    body: 'A caption, hashtag set, and content score are generated in seconds — on-brand, every time.',
  },
  {
    Icon: ShieldCheck,
    title: 'You approve, once',
    body: 'Review in the Approval Queue. Edit anything, or approve as-is — you’re always the final say.',
  },
  {
    Icon: Rocket,
    title: 'Published on schedule',
    body: 'AMAI publishes to Instagram and TikTok at the optimal time and confirms it went live.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32" aria-label="How AMAI works">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>How It Works</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Five steps. Zero busywork.
          </h2>
          <p className="mt-4 text-base" style={{ color: 'var(--lp-text-secondary)' }}>
            From raw footage to a published post, AMAI carries the work end to end —
            you only step in to approve.
          </p>
        </Reveal>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <div className="lp-card h-full p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--lp-cyan-soft)' }}
                  >
                    <step.Icon className="h-5 w-5" style={{ color: 'var(--lp-cyan)' }} />
                  </div>
                  <span className="lp-heading text-xs font-bold" style={{ color: 'var(--lp-text-muted)' }}>
                    0{i + 1}
                  </span>
                </div>
                <h3 className="lp-heading font-bold text-[15px]">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
