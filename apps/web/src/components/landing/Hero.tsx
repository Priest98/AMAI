"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowRight, PlayCircle, Sparkles, Clock3, CheckCircle2, ChevronDown } from 'lucide-react';
import MagneticButton from './MagneticButton';

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
 * visual. Replaces the previous orbiting-platforms diagram with something
 * that actually shows the product doing its job (a caption + best-time +
 * approve affordance), which reads more concretely as "interactive
 * floating dashboard elements" than an abstract logo animation. Depth is
 * driven by mouse position via two independent parallax layers (this
 * card + the smaller status toast beneath it) rather than scroll, since
 * it needs to feel alive even before the user scrolls at all.
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
        className="lp-glass relative w-[300px] sm:w-[340px] rounded-3xl p-5 lp-animate-float"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--lp-success)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--lp-success)' }} />
            AutoPilot Active
          </span>
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: 'var(--lp-cyan)' }} />
        </div>

        <div className="mt-3.5 flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-xl shrink-0"
            style={{ background: 'var(--lp-gradient-brand)' }}
          />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate">launch-reel-final.mp4</p>
            <p className="text-[11px]" style={{ color: 'var(--lp-text-muted)' }}>Today&rsquo;s plan · 3 posts ready</p>
          </div>
        </div>

        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--lp-border)' }}>
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

        <div className="mt-4 flex items-center justify-between">
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
  return (
    <motion.div style={{ x: parallaxX, y: parallaxY }} className="absolute -bottom-6 -left-8 sm:-left-12">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="lp-glass flex items-center gap-2 rounded-2xl px-4 py-3 lp-animate-float"
        style={{ animationDelay: '0.6s' }}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--lp-success)' }} />
        <span className="text-[12px] font-semibold whitespace-nowrap">Published to Instagram &amp; TikTok</span>
      </motion.div>
    </motion.div>
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
      className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 px-5 sm:px-8 overflow-hidden min-h-[80vh] flex items-center"
      aria-label="Introduction"
    >
      {/* Cinematic backdrop -- AI-generated abstract light environment,
          slow continuous Ken Burns drift, dimmed + gradient-masked so
          headline copy stays fully legible over it at every viewport. */}
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
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(4,7,13,0.55) 0%, rgba(4,7,13,0.7) 55%, var(--lp-bg) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 55% at 30% 35%, rgba(4,7,13,0.15), rgba(4,7,13,0.75) 75%)' }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-16 lg:gap-20 items-center z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--lp-cyan)' }}>
            Your AI Social Media Employee
          </p>

          {/* The one deliberate Kugile moment on the page. Kugile Demo maps
              only A-Z/a-z, so the two periods below fall back to Morrison --
              acceptable because a period carries no styling, but it is why
              Kugile must not be applied to headings containing digits,
              ampersands or apostrophes. Font size is left on the existing
              responsive scale so the display face inherits the same
              clamping and never overflows small viewports. */}
          <h1
            className="lp-hero-display mt-5 text-6xl sm:text-7xl lg:text-8xl font-bold"
            style={{ color: 'var(--lp-text-primary)', fontFamily: 'var(--font-display)' }}
          >
            Your social media.
            <br />
            <span className="lp-gradient-text">On autopilot.</span>
          </h1>

          <p className="mt-8 text-lg sm:text-xl leading-relaxed max-w-lg" style={{ color: 'var(--lp-text-secondary)' }}>
            AMAI plans, creates and publishes your content so you don&rsquo;t have to.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <MagneticButton as={motion.div}>
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm lp-btn-primary lp-focus-ring"
              >
                Start Free
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </MagneticButton>
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-2 text-sm font-semibold lp-focus-ring"
              style={{ color: 'var(--lp-text-secondary)' }}
            >
              <PlayCircle className="h-4 w-4 transition group-hover:opacity-80" />
              <span className="transition group-hover:opacity-80">See How It Works</span>
            </a>
          </div>

          <p className="mt-6 text-xs font-medium" style={{ color: 'var(--lp-text-muted)' }}>
            No credit card required.
          </p>
        </motion.div>

        <div className="relative flex justify-center lg:justify-end pb-6">
          <FloatingPreviewCard parallaxX={cardX} parallaxY={cardY} />
          <PublishedToast parallaxX={toastX} parallaxY={toastY} />
        </div>
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
