"use client";

import React from 'react';
import { Hand, ShieldCheck, Zap } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

const MODES = [
  { Icon: Hand, title: 'Manual', body: 'You decide what gets published.' },
  { Icon: ShieldCheck, title: 'Approval', body: 'Oyinca prepares everything. You approve before publishing.' },
  { Icon: Zap, title: 'Automatic', body: 'Oyinca handles the workflow according to your rules.' },
];

export default function ApprovalControlSection() {
  return (
    <section className="relative py-24 sm:py-28" aria-label="Approval control">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="lp-heading text-3xl sm:text-4xl font-bold tracking-tight">
            Autonomous when you want it. Controlled when you need it.
          </h2>
          <p className="mt-4 text-base sm:text-lg" style={{ color: 'var(--lp-text-secondary)' }}>
            You&rsquo;re always in control. Choose how much Oyinca does for you.
          </p>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-3 gap-5">
          {MODES.map((mode, i) => (
            <Reveal key={mode.title} delay={i * 0.08}>
              <div className="lp-card h-full p-6 text-center flex flex-col items-center gap-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--lp-cyan-soft)' }}>
                  <mode.Icon className="h-5 w-5" style={{ color: 'var(--lp-cyan)' }} />
                </div>
                <h3 className="lp-heading font-bold text-[15px]">{mode.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>{mode.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-10 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--lp-text-muted)' }}>
            AI should save you time, not take away your control.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
