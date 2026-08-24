"use client";

import React, { useEffect, useRef } from 'react';
import { ensureGsapPlugins, gsap, ScrollTrigger, prefersReducedMotion } from './gsap-setup';

/**
 * Staggers the entrance of its direct children (a row of cards, a list of
 * FAQ items) off a single ScrollTrigger on the container, rather than each
 * child carrying its own independently-delayed reveal -- the idiomatic
 * GSAP pattern for "staggered fade-in-up" (one gsap.to() call with a
 * `stagger` option), and the one the luxury-motion brief specifically asks
 * for on How It Works' 3 cards and Pricing's 3 columns.
 *
 * Children must be plain elements (not already wrapped in their own
 * Reveal/GsapReveal) so this component can read and animate them directly
 * via `container.children`.
 */
export default function GsapStaggerGroup({
  children,
  className = '',
  stagger = 0.14,
  y = 44,
  duration = 0.9,
  start = 'top 85%',
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  duration?: number;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const items = Array.from(container.children) as HTMLElement[];
    if (items.length === 0) return;

    if (prefersReducedMotion()) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }

    ensureGsapPlugins();
    gsap.set(items, { opacity: 0, y });

    const trigger = ScrollTrigger.create({
      trigger: container,
      start,
      once: true,
      onEnter: () => {
        gsap.to(items, { opacity: 1, y: 0, duration, stagger, ease: 'power3.out' });
      },
    });

    return () => trigger.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
