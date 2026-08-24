"use client";

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

/**
 * Performance note: this module is never statically imported anymore.
 * Every landing component does `await import('./gsap-setup')` from inside
 * a useEffect, after already checking prefersReducedMotion() (a separate,
 * zero-dependency module -- see reduced-motion.ts). A production
 * resource-timing audit found GSAP's ~150KB (core + ScrollTrigger +
 * ScrollSmoother) was being parsed/executed as part of the landing page's
 * critical initial bundle even though every single call site only touches
 * it inside an effect -- static `import { gsap } from './gsap-setup'` still
 * runs the module's top-level code (including this file's own `import
 * 'gsap'`) at initial-bundle-eval time, regardless of when the *usage*
 * happens. Dynamic import turns this into its own chunk that loads in
 * parallel without blocking the main thread's initial parse, and
 * reduced-motion visitors never fetch it at all.
 *
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

export { gsap, ScrollTrigger, ScrollSmoother };
