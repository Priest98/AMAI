"use client";

import React, { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './reduced-motion';

/**
 * Wraps the scrollable body of the landing page (everything except Nav --
 * see page.tsx for why Nav stays outside) in GSAP's ScrollSmoother for a
 * buttery/eased scroll feel, per the luxury-motion brief's GSAP setup
 * requirement.
 *
 * The wrapper only becomes `position: fixed` (landing.css:
 * #smooth-wrapper.lp-smooth-active) once this effect has actually run
 * client-side AND confirmed the visitor hasn't requested reduced motion.
 * Before that -- first paint, SSR, or permanently for reduced-motion
 * visitors -- it stays a normal in-flow element and the page scrolls
 * natively with zero dependency on JS. ScrollSmoother's eased scroll is
 * itself a motion effect, so reduced-motion visitors get real (unsmoothed,
 * instant) scrolling rather than an opt-out that still leaves some
 * animation running.
 */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [smoothActive, setSmoothActive] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion() || !wrapperRef.current || !contentRef.current) return;

    let cancelled = false;
    let smoother: { kill: () => void } | undefined;

    import('./gsap-setup').then(({ ensureGsapPlugins, ScrollSmoother }) => {
      if (cancelled || !wrapperRef.current || !contentRef.current) return;
      ensureGsapPlugins();
      setSmoothActive(true);
      smoother = ScrollSmoother.create({
        wrapper: wrapperRef.current,
        content: contentRef.current,
        smooth: 1.1,
        effects: true,
        normalizeScroll: true,
      });
    });

    return () => {
      cancelled = true;
      smoother?.kill();
    };
  }, []);

  return (
    <div id="smooth-wrapper" ref={wrapperRef} className={smoothActive ? 'lp-smooth-active' : ''}>
      <div id="smooth-content" ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
