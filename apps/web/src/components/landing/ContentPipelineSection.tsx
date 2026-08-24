"use client";

import React from 'react';
import { HardDrive, Gem, ScanEye, PenLine, CalendarClock, Rocket, ArrowRight } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

const FLOW = [
  { label: 'Google Drive', Icon: HardDrive },
  { label: 'Oyinca', Icon: Gem },
  { label: 'Analyze', Icon: ScanEye },
  { label: 'Write', Icon: PenLine },
  { label: 'Schedule', Icon: CalendarClock },
  { label: 'Publish', Icon: Rocket },
];

export default function ContentPipelineSection() {
  return (
    <section className="relative py-24 sm:py-28" aria-label="Content pipeline">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="lp-heading text-3xl sm:text-4xl font-bold tracking-tight">
            Turn your content library into a content engine.
          </h2>
          <p className="mt-4 text-base sm:text-lg" style={{ color: 'var(--lp-text-secondary)' }}>
            Your Google Drive is probably already full of photos and videos. Oyinca can turn that content
            into a structured publishing pipeline.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="mt-14">
          <div className="lp-card p-6 sm:p-8 overflow-x-auto">
            <div className="flex items-center gap-2 sm:gap-3 min-w-max mx-auto justify-center">
              {FLOW.map((step, i) => (
                <React.Fragment key={step.label}>
                  <div className="flex flex-col items-center gap-2 w-[90px] text-center">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center"
                      style={{ background: i % 2 === 0 ? 'var(--lp-purple-soft)' : 'var(--lp-cyan-soft)' }}
                    >
                      <step.Icon className="h-5 w-5" style={{ color: i % 2 === 0 ? 'var(--lp-purple)' : 'var(--lp-cyan)' }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: 'var(--lp-text-secondary)' }}>{step.label}</span>
                  </div>
                  {i < FLOW.length - 1 && <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--lp-text-muted)' }} />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
