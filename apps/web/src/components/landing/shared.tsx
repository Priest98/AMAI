"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

// Reveal now lives in components/ui/Reveal.tsx so dashboard pages can use
// it too without importing from the landing-specific folder. Re-exported
// here so every existing `import { Reveal } from './shared'` across the
// landing components keeps working unchanged.
export { Reveal } from '../ui/Reveal';

/** Animated number that counts up from 0 once it scrolls into view. */
export function CountUp({
  value,
  suffix = '',
  prefix = '',
  duration = 1.6,
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px 0px' });
  const [display, setDisplay] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduceMotion]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

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
