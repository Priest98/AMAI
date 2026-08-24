"use client";

import React, { useEffect, useRef } from 'react';
import { ensureGsapPlugins, gsap, prefersReducedMotion } from './gsap-setup';

/**
 * Slow, ambient floating gold particles for the Final CTA panel -- the
 * luxury-motion brief's "slow, subtle floating particle animation ... using
 * GSAP" behind the closing headline. Each particle gets its own randomized
 * size, position, drift distance and duration so the field doesn't read as
 * a single looping sprite; a GSAP timeline per particle (yoyo + repeat)
 * rather than CSS keyframes, since GSAP is what the brief asks for here
 * specifically (CSS keyframes already exist for other ambient effects
 * elsewhere on this page).
 *
 * Purely decorative (aria-hidden), and skipped entirely under
 * prefers-reduced-motion rather than rendered static -- a field of
 * randomly-placed static dots reads as visual noise, not a fallback.
 */
const PARTICLE_COUNT = 14;

export default function Particles({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    ensureGsapPlugins();

    const container = containerRef.current;
    if (!container) return;

    const nodes = Array.from(container.querySelectorAll<HTMLElement>('.lp-particle'));
    const tweens = nodes.map((node) => {
      const size = gsap.utils.random(2, 5);
      const startX = gsap.utils.random(4, 96);
      const startY = gsap.utils.random(8, 92);
      const drift = gsap.utils.random(20, 60);
      const duration = gsap.utils.random(6, 12);

      gsap.set(node, {
        width: size,
        height: size,
        left: `${startX}%`,
        top: `${startY}%`,
        opacity: 0,
      });

      return gsap.to(node, {
        y: `-=${drift}`,
        opacity: gsap.utils.random(0.25, 0.6),
        duration,
        delay: gsap.utils.random(0, 4),
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });

    return () => {
      tweens.forEach((t) => t.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <span key={i} className="lp-particle" />
      ))}
    </div>
  );
}
