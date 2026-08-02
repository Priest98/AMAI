"use client";

import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

/**
 * Fades + slides its children in once as they scroll into view. Originally
 * built for the landing page (see components/landing/shared.tsx, which
 * re-exports this same component for backward compatibility with existing
 * imports), moved here so it can be reused site-wide -- dashboard pages
 * included -- without importing from the landing-specific folder.
 *
 * Respects prefers-reduced-motion via framer-motion's useReducedMotion:
 * when set, content just appears (no animated initial state) instead of
 * forcing motion on users who've asked for less of it.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className = '',
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  /** Pass-through for inline styles (this codebase leans on CSS custom
   *  properties via `style={{ backgroundColor: 'var(--bg-surface)' }}`
   *  extensively outside the landing page, so Reveal needs to support
   *  that when used as a drop-in wrapper around existing dashboard markup). */
  style?: React.CSSProperties;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px 0px' });
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? undefined : { opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
