"use client";

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

/**
 * Single shared plugin-registration point for the whole landing page.
 * `gsap.registerPlugin` is idempotent (GSAP itself no-ops a duplicate
 * registration), but centralizing it means every component that needs
 * ScrollTrigger/ScrollSmoother imports from here instead of each re-running
 * its own registration call scattered across files, and there's exactly one
 * place to look if plugin setup ever needs to change (e.g. adding
 * ScrollSmoother's `effects` companion plugins).
 */
let registered = false;
export function ensureGsapPlugins() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
  registered = true;
}

/** True when the visitor's OS/browser has requested reduced motion. SSR-safe (returns false on the server; components only call this inside useEffect). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export { gsap, ScrollTrigger, ScrollSmoother };
