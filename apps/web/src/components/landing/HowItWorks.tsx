"use client";

import React from 'react';
import { Link2, Brain, PlayCircle, TrendingUp } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

const STEPS = [
  {
    Icon: Link2,
    title: 'Connect your business',
    body: 'Connect your social accounts and content library.',
  },
  {
    Icon: Brain,
    title: 'Teach AMAI your brand',
    body: 'AMAI learns your products, audience, voice and content preferences.',
  },
  {
    Icon: PlayCircle,
    title: 'Let it work',
    body: 'AMAI plans, creates, schedules and publishes content according to your preferences.',
  },
  {
    Icon: TrendingUp,
    title: 'It gets smarter',
    body: 'AMAI studies performance and uses those insights to improve what comes next.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 sm:py-20" aria-label="How AMAI works">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>How It Works</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            From content to growth, automatically.
          </h2>
        </Reveal>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                    STEP {String(i + 1).padStart(2, '0')}
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

        <Reveal delay={0.3} className="mt-10 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--lp-text-muted)' }}>
            Set it up once. Keep improving over time.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
