"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import MagneticButton from './MagneticButton';
import HeroVisual from './HeroVisual';

/**
 * Cinematic full-bleed hero (v3).
 *
 * Replaces the previous split-screen "product card" hero (headline/CTA on
 * the left, a small rounded 380px video panel + floating dashboard-style
 * cards on the right) with a single full-viewport composition: Oyinca's
 * video IS the background, not a screenshot sitting beside the copy.
 *
 * What got removed and why:
 * - The two-column grid, the small rounded .lp-hero-visual-frame card, and
 *   the AI-generated abstract-light backdrop photo underneath it (that
 *   photo's own scrims are gone too -- see landing.css). All of that
 *   existed to give a small product-card panel somewhere to sit; there's
 *   no panel anymore.
 * - FloatingPreviewCard / PublishedToast / WorkflowRail (the "AI Caption",
 *   "Published to TikTok", and 4-step pipeline dashboard mockups). This is
 *   a deliberate content decision from the redesign brief, not just a
 *   layout casualty: the brief explicitly calls out "oversized product
 *   cards / dashboard mockups / unnecessary floating cards" as clutter to
 *   remove from a cinematic first viewport, capping any optional floating
 *   UI at two ultra-subtle elements and only if they "genuinely improve
 *   the scene." None were added back in this pass -- the safer, more
 *   restrained call for a first cut. Easy to reintroduce one small element
 *   later if the fully-clean version reads as too bare in practice.
 * - The Eyebrow chip, the secondary "Meet Oyinca" ghost CTA, and the "No
 *   credit card required" line. The brief's own copy section lists exactly
 *   one headline pair, one support line, and one CTA -- so this pass
 *   matches that precisely rather than layering the old copy back in.
 *   (Worth flagging to whoever reviews this: the secondary CTA and credit
 *   card reassurance were real, working, low-risk elements -- removing
 *   them is a content/scope decision from the new brief, not a bug fix.)
 *
 * What's unchanged on purpose:
 * - Nav.tsx. It already renders as a fixed, floating, frosted-glass pill at
 *   z-50 site-wide, which is exactly "navigation floats above the
 *   cinematic hero" -- there was nothing to move.
 * - The /register route for the CTA, and the underlying video asset/
 *   HeroVisual play-pause/reduced-motion/error-fallback logic.
 * - .lp-hero-display / .lp-hero-accent-text (Instrument Serif treatment +
 *   the legible solid-blue accent token) -- both already exist and already
 *   solve exactly the typography problem this brief describes.
 */
export default function Hero() {
  return (
    <section
      id="product"
      // Mobile-audit fix: a literal 100svh here forces the nav, headline,
      // support copy and CTA to all physically fit inside one phone
      // screen, which is exactly what was reading as "cramped" -- there's
      // no way to give any of them breathing room when the container itself
      // has zero slack. 88svh leaves a visible sliver of the next section,
      // which both frees up room for larger mobile spacing below and gives
      // an implicit "there's more, scroll" cue. Unchanged (100svh) at sm+
      // where the original full-bleed cinematic composition has room to
      // work.
      className="relative isolate flex h-[88svh] min-h-[560px] w-full flex-col overflow-hidden sm:h-[100svh]"
      aria-label="Meet Oyinca, your social media manager"
    >
      {/* Full-bleed cinematic video background. Absolutely positioned and
          explicitly pushed behind (-z-10) the overlay/copy below --
          `isolate` on this section (not decorative -- see the historical
          note in landing.css / prior commits) keeps that -z-10 scoped to
          this section instead of resolving against the page-wide ambient
          background layer several levels up, which is the exact bug that
          made an earlier version of this backdrop invisible. */}
      <HeroVisual className="-z-10" />

      {/* Cinematic overlay (landing.css: .lp-hero-cinematic-overlay) --
          two soft layered gradients (left-weighted + bottom-weighted), not
          a flat dark scrim. Legibility for the copy below without dimming
          Oyinca or the center/right of the frame where she's most visible. */}
      <div className="pointer-events-none absolute inset-0 lp-hero-cinematic-overlay" aria-hidden="true" />

      {/* Copy block: bottom-left, anchored via the section's own flex
          column (justify-end on this wrapper) rather than a hardcoded vh
          offset -- it reserves exactly the room its real content needs at
          any viewport, and stays clear of Oyinca's face by construction
          (max-w-xl keeps it from ever spanning the full cinematic frame). */}
      <div className="relative z-10 flex flex-1 flex-col justify-end px-5 pb-14 sm:px-8 sm:pb-16 lg:max-w-xl lg:pb-[12vh] lg:pl-[6vw]">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          // Luxury rebrand: massive, elegant Playfair Display headline --
          // pushed a step larger at every breakpoint than the prior sizing
          // (5xl/6xl/7xl -> 6xl/7xl/8xl) so it reads as a deliberate
          // statement rather than a slightly-oversized label.
          className="lp-hero-display text-6xl sm:text-7xl lg:text-8xl"
          style={{ color: 'var(--lp-text-primary)' }}
        >
          Meet Oyinca.
          <br />
          <span className="lp-hero-accent-text">Your social media manager.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-sm text-base leading-relaxed sm:text-lg"
          style={{ color: 'var(--lp-text-secondary)' }}
        >
          Give Oyinca your content. She handles the rest.
        </motion.p>

        {/* Substantial breathing room below the CTA, per the luxury-motion
            brief -- mt-8 -> mt-12, plus pb-14/pb-16 on the copy block's own
            wrapper above (unchanged) already reserves room beneath this. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12"
        >
          <MagneticButton as={motion.div}>
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-2xl px-9 py-4.5 text-sm lp-btn-primary lp-focus-ring"
            >
              Let Oyinca handle it
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </MagneticButton>
        </motion.div>
      </div>

      {/* Scroll indicator -- more useful now than before: at a genuine
          100svh, nothing below the fold is visible without a nudge. */}
      <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center" aria-hidden="true">
        <div className="lp-scroll-indicator flex flex-col items-center gap-1" style={{ color: 'var(--lp-text-muted)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-widest">Scroll</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </section>
  );
}
