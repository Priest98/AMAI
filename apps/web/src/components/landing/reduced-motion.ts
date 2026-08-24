"use client";

/**
 * Standalone, zero-dependency reduced-motion check -- deliberately kept out
 * of gsap-setup.ts so every landing component can check this BEFORE
 * deciding whether to pull in GSAP at all. GSAP (core + ScrollTrigger +
 * ScrollSmoother) is dynamically imported (`await import('./gsap-setup')`)
 * only inside the effects that actually animate, specifically so this
 * check can gate that import: a prefers-reduced-motion visitor never
 * downloads GSAP's bytes in the first place, and every other visitor gets
 * it as a separate, non-blocking chunk instead of it being parsed/executed
 * as part of the landing page's critical initial bundle (confirmed via a
 * production network-request/resource-timing audit that GSAP was
 * previously part of the eagerly-loaded chunk graph even though every
 * single usage site only touches it inside useEffect).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
