"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowRight, PlayCircle, Sparkles, Clock3, CheckCircle2, ChevronDown, Upload } from 'lucide-react';
import MagneticButton from './MagneticButton';
import HeroVisual from './HeroVisual';
import { Eyebrow } from './shared';
import { Monogram } from '@/components/logo';
import { TikTokLogo } from '@/components/icons/platform-logos';

/**
 * Higgsfield-generated cinematic backdrop (deep navy/steel-blue abstract
 * light environment -- see the generation prompt in project history).
 * Self-hosting isn't possible from this environment (no code-execution
 * sandbox to download the asset), so it's served straight from Higgsfield's
 * CDN; next.config.ts allow-lists that host for next/image optimization.
 */
const HERO_BG_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_3HXsou9653KJM9YD320GPTi1aul/hf_20260806_144358_96bf13e8-58c8-43a4-baf3-c3f1eb7604bb.png';

/**
 * Floating "AI caption" preview card -- the hero's primary interactive
 * visual. Reads concretely as "the product doing its job" (a caption +
 * best-time + ready affordance) rather than an abstract logo animation.
 * Depth is driven by mouse position via two independent parallax layers
 * (this card + the smaller status toast) rather than scroll, since it
 * needs to feel alive even before the user scrolls at all.
 *
 * Deliberately shorter than its previous version -- the file-thumbnail
 * row ("launch-reel-final.mp4 / Today's plan") is gone. That wasn't just
 * decluttering: this card is now positioned ABOVE Oyinca's portrait
 * instead of overlapping it (see the hero redesign's top-priority fix --
 * the old placement sat directly over her face), and every extra row of
 * content was extra height pushing the card further down into the frame,
 * toward her face. Trimming it to the brief's own minimal example --
 * AI CAPTION + quote + best-time -- keeps it short enough to clear her
 * head with room to spare.
 */
function FloatingPreviewCard({
  parallaxX,
  parallaxY,
}: {
  parallaxX: ReturnType<typeof useSpring>;
  parallaxY: ReturnType<typeof useSpring>;
}) {
  // Parallax (mouse-driven, via framer-motion x/y transforms) is applied on
  // this outer wrapper; the CSS keyframe float-bob lives on an inner div.
  // Both animate `transform`, so stacking them on one element would have
  // the CSS animation clobber framer's transform on every keyframe tick --
  // splitting them across parent/child lets both run independently.
  return (
    <motion.div style={{ x: parallaxX, y: parallaxY }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="lp-glass relative w-[260px] sm:w-[290px] rounded-3xl p-4 sm:p-5 lp-animate-float"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--lp-success)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--lp-success)' }} />
            Autopilot Active
          </span>
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: 'var(--lp-cyan)' }} />
        </div>

        <div className="mt-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--lp-cyan)' }}>
            AI Caption
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
            &ldquo;Some things just hit different at golden hour. 🌇&rdquo;
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {['#goldenhour', '#reel', '#aesthetic'].map((tag) => (
              <span key={tag} className="text-[10px] font-medium" style={{ color: 'var(--lp-text-muted)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--lp-border)' }}>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--lp-text-secondary)' }}>
            <Clock3 className="h-3.5 w-3.5" style={{ color: 'var(--lp-cyan)' }} />
            Best time · 6:42 PM
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
            Ready
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PublishedToast({
  parallaxX,
  parallaxY,
}: {
  parallaxX: ReturnType<typeof useSpring>;
  parallaxY: ReturnType<typeof useSpring>;
}) {
  // Was -left-8/-left-12 -- far enough outside the frame's left edge that
  // on narrower viewports it read as loosely floating in the gutter rather
  // than anchored to Oyinca's workflow, and could look accidentally
  // clipped. Pulled in to a small, deliberate corner-anchor overlap instead
  // (matches the scale of overlap FloatingPreviewCard now uses at the top).
  return (
    <motion.div style={{ x: parallaxX, y: parallaxY }} className="absolute -bottom-5 -left-3 sm:-left-5">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="lp-glass flex items-center gap-2 rounded-2xl px-4 py-3 lp-animate-float"
        style={{ animationDelay: '0.6s' }}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--lp-success)' }} />
        <span className="text-[12px] font-semibold whitespace-nowrap">Published to TikTok</span>
      </motion.div>
    </motion.div>
  );
}

/**
 * The "Content -> Oyinca -> Caption/Hashtags/Schedule -> TikTok" pipeline
 * from the brief's ASCII diagram, rendered as real UI (not baked into the
 * cinematic video) so it stays crisp, accessible, and editable. Mirrors the
 * same icon-plus-arrow rail pattern AutopilotSection already uses further
 * down the page, rather than inventing a second visual language for the
 * same idea.
 */
const WORKFLOW_STEPS = [
  { label: 'Your content', Icon: Upload },
  { label: 'Oyinca', Icon: Monogram },
  { label: 'Caption · hashtags · schedule', Icon: CheckCircle2 },
  { label: 'TikTok', Icon: TikTokLogo },
];

function WorkflowRail() {
  return (
    <div className="lp-glass mt-6 w-full max-w-[380px] rounded-2xl px-4 py-4 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max mx-auto justify-center">
        {WORKFLOW_STEPS.map((step, i) => (
          <React.Fragment key={step.label}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3 }}
              className="flex flex-col items-center gap-1.5 w-[76px] text-center cursor-default"
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-shadow"
                style={{ background: i % 2 === 0 ? 'var(--lp-cyan-soft)' : 'var(--lp-purple-soft)' }}
              >
                <step.Icon className="h-4 w-4" style={{ color: i % 2 === 0 ? 'var(--lp-cyan)' : 'var(--lp-purple)' }} />
              </div>
              <span className="text-[10px] font-semibold leading-tight" style={{ color: 'var(--lp-text-secondary)' }}>
                {step.label}
              </span>
            </motion.div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.7 + i * 0.12 }}
              >
                <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--lp-text-muted)' }} />
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  // Two parallax layers: the primary card follows the cursor more, the
  // toast beneath it follows less, so the group reads as having real
  // depth rather than moving as one flat sheet.
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const cardX = useSpring(useTransform(mvX, [-1, 1], [-14, 14]), { stiffness: 120, damping: 20 });
  const cardY = useSpring(useTransform(mvY, [-1, 1], [-14, 14]), { stiffness: 120, damping: 20 });
  const toastX = useSpring(useTransform(mvX, [-1, 1], [-6, 6]), { stiffness: 120, damping: 20 });
  const toastY = useSpring(useTransform(mvY, [-1, 1], [-6, 6]), { stiffness: 120, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduceMotion || !sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    mvX.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    mvY.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  // Hero sizing note: top padding stays generous enough to clear the fixed
  // floating nav, but bottom padding and min-height were roughly halved
  // (from pb-40/48 + min-h-92vh) -- at the old values the hero left ~250px
  // of dead space between the CTA and the next section on a laptop viewport.
  return (
    <section
      id="product"
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative isolate pt-32 pb-20 sm:pt-40 sm:pb-24 px-5 sm:px-8 overflow-hidden min-h-[80vh] flex items-center"
      aria-label="Introduction"
    >
      {/* Cinematic backdrop -- AI-generated abstract light environment,
          slow continuous Ken Burns drift, dimmed + gradient-masked so
          headline copy stays fully legible over it at every viewport.

          `isolate` (CSS `isolation: isolate`) is load-bearing here, not
          decorative: without it this <section> doesn't establish its own
          stacking context, so the backdrop's `-z-10` wrapper below resolves
          against the page-wide .lp-ambient-bg layer (z-index -1, a sibling
          much higher up the tree) instead of staying local to the hero --
          and since -10 < -1, the ambient layer painted on top and hid this
          entire image. Confirmed via DOM/stacking-context inspection: the
          image was loading correctly (network 200, non-zero natural size)
          but was 100% visually obscured before this fix. */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="lp-hero-media absolute inset-0">
          <Image
            src={HERO_BG_URL}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        {/* Theme-aware scrims (landing.css) -- previously hardcoded inline
            rgba(4,7,13,...) here, which meant this never lightened in
            light mode since inline styles can't be reached by the
            `.light .amai-landing` override convention every other themed
            surface on this page uses. */}
        <div className="absolute inset-0 lp-hero-scrim-linear" />
        <div className="absolute inset-0 lp-hero-scrim-radial" />
      </div>

      <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[0.95fr_1.05fr] gap-16 lg:gap-20 items-center z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Reuses the same Eyebrow chip every other section already uses
              (shared.tsx) instead of a bare colored <p> -- besides pulling
              the hero into the same "family" of UI as the rest of the page,
              its lp-glass pill gives the label a guaranteed-legible backing
              regardless of what part of the busy hero photo sits behind it,
              which a plain color on transparent text didn't. */}
          <Eyebrow>Oyinca — your social media manager</Eyebrow>

          {/* The one deliberate Instrument Serif moment in the hero (the
              .lp-hero-display class carries the display-font treatment --
              see landing.css). Font size is left on the existing responsive
              scale so the display face inherits the same clamping and never
              overflows small viewports.

              Copy deliberately drops "AI" from the headline itself -- the
              brand brief positions Oyinca as a social media manager with a
              personality (someone you hire), not another AI tool; "AI" still
              appears once, lower down, where it's actually informative
              (metadata, FAQ) rather than the first thing a visitor reads.

              "Your social media manager." previously used .lp-gradient-text
              (the same class the Oyinca wordmark logo uses) -- its lightest
              gradient stop measured ~2:1 contrast in light mode and reads as
              washed-out even in dark mode. Replaced with .lp-hero-accent-text,
              a dedicated solid (non-gradient) rich-blue token tuned to stay
              legible at both themes without losing the brand-blue identity
              (see landing.css for the contrast math). The mid-phrase <br>
              only activates at lg+ so desktop gets the intentional
              "social media / manager." split while mobile/tablet keep
              natural browser-controlled wrapping instead of a forced break
              at a width it was never tuned for. */}
          <h1
            className="lp-hero-display mt-5 text-6xl sm:text-7xl lg:text-8xl"
            style={{ color: 'var(--lp-text-primary)' }}
          >
            Meet Oyinca.
            <br />
            <span className="lp-hero-accent-text">
              Your social media <br className="hidden lg:block" />manager.
            </span>
          </h1>

          <p className="mt-8 text-lg sm:text-xl leading-relaxed max-w-lg" style={{ color: 'var(--lp-text-secondary)' }}>
            Give Oyinca your content and she&rsquo;ll take care of the rest — from planning and captions
            to scheduling and publishing on TikTok.
          </p>

          {/* Primary CTA copy changed from "Meet Oyinca" (branding, weak as
              a conversion prompt) to the value-proposition itself. Route is
              unchanged (/register -- the same real signup flow every other
              CTA on this page already points at). "Meet Oyinca" moves to
              the secondary slot, which is what it always was functionally:
              a low-commitment link to the page's own How It Works section
              (#how-it-works, a real anchor -- see HowItWorks.tsx), not a
              second signup path. */}
          <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <MagneticButton as={motion.div}>
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm lp-btn-primary lp-focus-ring"
              >
                Let Oyinca handle it
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </MagneticButton>
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-2 text-sm font-semibold lp-focus-ring"
              style={{ color: 'var(--lp-text-secondary)' }}
            >
              <PlayCircle className="h-4 w-4 transition group-hover:opacity-80" />
              <span className="transition group-hover:opacity-80">Meet Oyinca</span>
            </a>
          </div>

          {/* Was --lp-text-muted at text-xs, sitting quietly under the CTA
              row -- easy to miss as reassurance copy. Given a checkmark and
              bumped to --lp-text-secondary/13px so it reads as an answered
              objection ("no, really, it's free to start") rather than fine
              print. */}
          <p className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: 'var(--lp-text-secondary)' }}>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--lp-success)' }} />
            No credit card required.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center lg:items-end"
        >
          {/* Oyinca's cinematic portrait, with the same two floating UI
              cards from before now anchored to it directly -- "her digital
              workspace" -- instead of floating over empty backdrop.

              w-full max-w-[380px] is load-bearing, not decorative: this div
              is a flex item inside a `flex flex-col items-center lg:items-end`
              parent, which overrides the default `align-items: stretch` --
              so without an explicit width, this wrapper (and HeroVisual's
              own width:100%, which resolves against IT) shrink-to-fit their
              normal-flow content. HeroVisual is the only normal-flow child
              and is itself width:100%, a circular reference that resolved
              to ~0 -- confirmed via computed styles: the frame rendered at
              2x3.5px, i.e. completely invisible, on the live site. Matching
              the max-width to .lp-hero-visual-frame's own max-width keeps
              the two in sync by construction instead of by coincidence. */}
          {/* FloatingPreviewCard now sits in NORMAL DOCUMENT FLOW above the
              frame (a sibling, not `absolute` inside it), with a negative
              bottom margin creating a small, deliberate overlap onto the
              frame's top edge -- rather than an `absolute` offset computed
              from the card's estimated pixel height. That distinction
              matters: this hero's height varies by breakpoint and by how
              much the left column's copy wraps, and an absolutely-positioned
              card with a large negative `top` has no guaranteed clearance
              from the section's own `overflow-hidden` boundary above it if
              the row ends up shorter than expected (exactly how the card
              ended up sitting on top of her face before this redesign pass
              -- a `-top-6` estimate that didn't account for the card's real
              height). Normal flow can't make that mistake: the browser
              always reserves however much room the card actually needs, on
              every viewport, by construction -- it's the -mb-10/-mb-12 that
              controls the (small, intentional) overlap, not a guess about
              total offset. Checked against the actual portrait asset
              (oyinca-poster.jpg): her hairline sits a few percent down from
              the frame's top edge, with eyes/nose/mouth in the 20-45% band,
              so a ~40-48px overlap lands on hair/crown only. */}
          <div className="relative z-10 -mb-10 sm:-mb-12">
            <FloatingPreviewCard parallaxX={cardX} parallaxY={cardY} />
          </div>
          <div className="relative w-full max-w-[380px]">
            <HeroVisual />
            <PublishedToast parallaxX={toastX} parallaxY={toastY} />
          </div>

          {/* Content -> Oyinca -> Caption/Hashtags/Schedule -> TikTok,
              spelled out as real UI directly beneath her -- the whole
              pipeline the copy just promised, made visible in ~2 seconds. */}
          <WorkflowRail />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 inset-x-0 flex justify-center z-10" aria-hidden="true">
        <div className="lp-scroll-indicator flex flex-col items-center gap-1" style={{ color: 'var(--lp-text-muted)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-widest">Scroll</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </section>
  );
}
