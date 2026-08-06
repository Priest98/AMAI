"use client";

import React from 'react';

// Reveal and CountUp now live in components/ui so dashboard pages can use
// them too without importing from the landing-specific folder. Re-exported
// here so every existing `import { Reveal, CountUp } from './shared'`
// across the landing components keeps working unchanged.
export { Reveal } from '../ui/Reveal';
export { CountUp } from '../ui/CountUp';

/** Section eyebrow/kicker badge — small pill label above a section heading. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider lp-glass"
      style={{ color: 'var(--lp-cyan)' }}
    >
      {children}
    </span>
  );
}
