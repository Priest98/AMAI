"use client";

import React from 'react';
import { Camera, Music2 } from 'lucide-react';
import { Reveal } from './shared';

export default function MultiPlatformSection() {
  return (
    <section className="relative py-24 sm:py-28" aria-label="Multi-platform publishing">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="lp-heading text-3xl sm:text-4xl font-bold tracking-tight">
            One workflow. Multiple channels.
          </h2>
          <p className="mt-4 text-base sm:text-lg" style={{ color: 'var(--lp-text-secondary)' }}>
            Manage your social presence from one place.
          </p>
        </Reveal>

        <div className="mt-12 grid sm:grid-cols-2 gap-5">
          <Reveal>
            <div className="lp-card h-full p-6 flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'var(--lp-purple-soft)' }}>
                <Camera className="h-5 w-5" style={{ color: 'var(--lp-purple)' }} />
              </div>
              <div>
                <h3 className="lp-heading font-bold text-[15px]">Instagram</h3>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>Plan, create, schedule and publish.</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="lp-card h-full p-6 flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'var(--lp-cyan-soft)' }}>
                <Music2 className="h-5 w-5" style={{ color: 'var(--lp-cyan)' }} />
              </div>
              <div>
                <h3 className="lp-heading font-bold text-[15px]">TikTok</h3>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>Repurpose and publish platform-ready content.</p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.2} className="mt-8 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--lp-text-muted)' }}>
            More channels. One intelligent workflow.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
