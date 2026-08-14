"use client";

import React from 'react';
import Link from 'next/link';
import { Building2, Users2, BrainCircuit, LayoutGrid, ArrowRight } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

const AGENCY_FEATURES = [
  { Icon: Building2, title: 'Client Workspaces', body: 'Keep every business organized.' },
  { Icon: Users2, title: 'Team Access', body: 'Give your team the access they need.' },
  { Icon: BrainCircuit, title: 'Client-Specific Intelligence', body: 'Every business gets its own context.' },
  { Icon: LayoutGrid, title: 'Agency Overview', body: 'See what’s happening across your portfolio.' },
];

export default function AgencySection() {
  return (
    <section id="agency" className="relative py-24 sm:py-32" aria-label="For agencies">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>For Agencies</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            One command center. Every client.
          </h2>
          <p className="mt-4 text-base sm:text-lg" style={{ color: 'var(--lp-text-secondary)' }}>
            Stop jumping between spreadsheets, folders, calendars and social accounts. Manage clients
            from one workspace while keeping every brand&rsquo;s content, strategy and Business Brain separate.
          </p>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {AGENCY_FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <div className="lp-card h-full p-6 flex flex-col gap-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--lp-cyan-soft)' }}>
                  <f.Icon className="h-5 w-5" style={{ color: 'var(--lp-cyan)' }} />
                </div>
                <h3 className="lp-heading font-bold text-[15px]">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-12 text-center">
          <a
            href="#pricing"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm lp-btn-ghost font-semibold lp-focus-ring"
          >
            Explore Agency
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
