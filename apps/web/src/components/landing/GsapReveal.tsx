"use client";

import React, { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './reduced-motion';

/**
 * GSAP ScrollTrigger-driven fade-in-up, for a single block (a heading, a
 * paragraph, a card). Drop-in replacement for the old Framer-Motion-based
 * `Reveal` (components/landing/shared.tsx) -- same prop shape (children,
 * delay, y, className, style) -- as part of the luxury-motion brief's
 * explicit split: GSAP ScrollTrigger drives scroll-triggered entrances
 * (headings, text blocks, cards), Framer Motion is reserved for hover/
 * pointer micro-interactions (MagneticButton, card hover sheens) elsewhere
 * in this rebuild.
 *
 * `once: true` -- the brief asks for an entrance animation, not a
 * repeating one every time a section scrolls back into view, which reads
 * as gimmicky on a marketing page a visitor scrolls up and down while
 * reading.
 */
export default function GsapReveal({
  children,
  delay = 0,
  y = 32,
  duration = 0.9,
  start = 'top 88%',
  className = '',
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  start?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }

    let cancelled = false;
    let trigger: { kill: () => void } | undefined;

    import('./gsap-setup').then(({ ensureGsapPlugins, gsap, ScrollTrigger }) => {
      if (cancelled || !ref.current) return;
      ensureGsapPlugins();
      gsap.set(el, { opacity: 0, y });
      trigger = ScrollTrigger.create({
        trigger: el,
        start,
        once: true,
        onEnter: () => {
          gsap.to(el, { opacity: 1, y: 0, duration, delay, ease: 'power3.out' });
        },
      });
    });

    return () => {
      cancelled = true;
      trigger?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
