"use client";

import React from 'react';
import { Upload, PenLine, CalendarClock, Send, TrendingUp, ArrowRight } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

// Five steps, not seven. The old flow split the same story into more boxes
// than it needed ("AI Analysis"/"Strategy" and "Performance"/"Learning"/
// "Better Content" each read as one idea to a first-time visitor).
const FLOW = [
  { label: 'Find your content', Icon: Upload },
  { label: 'Create the post', Icon: PenLine },
  { label: 'Schedule it', Icon: CalendarClock },
  { label: 'Publish it', Icon: Send },
  { label: 'Learn from the result', Icon: TrendingUp },
];

/** The product's "wow" moment, so it keeps its own full-width section -- but states the workflow once, not three different ways. */
export default function AutopilotSection() {
  return (
    <section id="autopilot" className="relative py-16 sm:py-20" aria-label="AutoPilot">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>AutoPilot</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Stop managing every post.
          </h2>
        </Reveal>

        <Reveal delay={0.15} className="mt-14">
          <div className="lp-card p-6 sm:p-10 overflow-x-auto">
            <div className="flex items-center gap-2 sm:gap-3 min-w-max mx-auto justify-center">
              {FLOW.map((step, i) => (
                <React.Fragment key={step.label}>
                  <div className="flex flex-col items-center gap-2 w-[110px] sm:w-[130px] text-center">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center"
                      style={{ background: i % 2 === 0 ? 'var(--lp-cyan-soft)' : 'var(--lp-purple-soft)' }}
                    >
                      <step.Icon className="h-5 w-5" style={{ color: i % 2 === 0 ? 'var(--lp-cyan)' : 'var(--lp-purple)' }} />
                    </div>
                    <span className="text-xs font-semibold leading-tight" style={{ color: 'var(--lp-text-secondary)' }}>
                      {step.label}
                    </span>
                  </div>
                  {i < FLOW.length - 1 && (
                    <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--lp-text-muted)' }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Replaces the old standalone "Autonomous when you want it" section.
            Control level is reassurance, not a headline feature -- one line
            here does the same job a full section was doing. */}
        <Reveal delay={0.25} className="mt-8 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--lp-text-muted)' }}>
            Choose <span style={{ color: 'var(--lp-text-secondary)' }}>Manual</span>,{' '}
            <span style={{ color: 'var(--lp-text-secondary)' }}>Approval</span> or{' '}
            <span style={{ color: 'var(--lp-text-secondary)' }}>Automatic</span> mode. You decide how much AMAI does.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
