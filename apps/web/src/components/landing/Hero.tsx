"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle, Facebook, Twitter, Instagram } from 'lucide-react';
import EngineOrb from './EngineOrb';
import { Eyebrow } from './shared';

/**
 * Hotspot callouts ringing the AMAI Engine orb -- the landing-page
 * equivalent of the reference moodboard's annotated product-photo hero
 * (dots + leader lines + labels pointing at parts of the gear). Here they
 * point at what the Engine actually does, not literal UI regions, since
 * the orb is an abstract visualization rather than a photographed product.
 */
const HOTSPOTS: {
  label: string;
  top: string;
  /** Which CSS box edge the dot-end anchors to. 'left' anchors grow the
   *  callout rightward (dot near anchor, label extending out past the
   *  right edge); 'right' anchors grow it leftward (dot near anchor,
   *  label extending out past the left edge). */
  anchor: 'left' | 'right';
  anchorValue: string;
  lineWidth: number;
}[] = [
  { label: 'AI Captions', top: '6%', anchor: 'left', anchorValue: '78%', lineWidth: 56 },
  { label: 'Smart Hashtags', top: '30%', anchor: 'right', anchorValue: '92%', lineWidth: 44 },
  { label: 'Best-Time Publish', top: '68%', anchor: 'left', anchorValue: '82%', lineWidth: 50 },
  { label: 'Auto Scheduling', top: '92%', anchor: 'right', anchorValue: '92%', lineWidth: 60 },
];

function Hotspot({ label, top, anchor, anchorValue, lineWidth }: (typeof HOTSPOTS)[number]) {
  return (
    <div
      className="absolute hidden md:flex items-center gap-2 select-none"
      style={{
        top,
        [anchor]: anchorValue,
        flexDirection: anchor === 'left' ? 'row' : 'row-reverse',
      } as React.CSSProperties}
    >
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--lp-cyan)', boxShadow: '0 0 8px var(--lp-cyan)' }} />
      <span className="h-px shrink-0" style={{ width: lineWidth, backgroundColor: 'var(--lp-border-strong)' }} />
      <span className="text-[11px] font-semibold whitespace-nowrap uppercase tracking-wide" style={{ color: 'var(--lp-text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative pt-10 sm:pt-14 pb-24 sm:pb-32 px-3 sm:px-6" aria-label="Introduction">
      <div
        className="relative max-w-7xl mx-auto rounded-[28px] sm:rounded-[36px] overflow-hidden border pt-28 pb-16 sm:pt-32 sm:pb-20"
        style={{ backgroundColor: 'var(--lp-bg)', borderColor: 'var(--lp-border)' }}
      >
        <div className="absolute inset-0 lp-noise-grid pointer-events-none" />

        {/* Oversized ambient background typography, echoing the reference's
            huge "KEN" backdrop -- pure atmosphere, not meant to be read. */}
        <div
          className="absolute -bottom-6 left-0 right-0 text-center pointer-events-none select-none overflow-hidden"
          aria-hidden="true"
        >
          <span className="text-display-giant" style={{ color: 'var(--lp-border-strong)', opacity: 0.5 }}>
            AMAI
          </span>
        </div>

        {/* Vertical step indicator, left edge — the product's 3-step story */}
        <div className="hidden lg:flex absolute left-8 top-1/2 -translate-y-1/2 flex-col gap-5 z-10">
          {['Upload once', 'Approve once', 'AMAI runs it'].map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  backgroundColor: i === 0 ? 'var(--lp-cyan)' : 'transparent',
                  border: i === 0 ? 'none' : '1.5px solid var(--lp-border-strong)',
                  boxShadow: i === 0 ? '0 0 8px var(--lp-cyan)' : 'none',
                }}
              />
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: i === 0 ? 'var(--lp-text-primary)' : 'var(--lp-text-muted)' }}>
                {i + 1}. {step}
              </span>
            </div>
          ))}
        </div>

        {/* Vertical social stack, bottom-left */}
        <div className="hidden lg:flex absolute left-8 bottom-10 flex-col items-center gap-4 z-10">
          <span className="h-10 w-px" style={{ backgroundColor: 'var(--lp-border-strong)' }} />
          {[Facebook, Twitter, Instagram].map((Icon, i) => (
            <Icon key={i} className="h-3.5 w-3.5" style={{ color: 'var(--lp-text-muted)' }} />
          ))}
        </div>

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 lg:px-24 grid lg:grid-cols-2 gap-16 items-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <Eyebrow>AI Social Media Operating System</Eyebrow>

            <h1 className="lp-heading mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight" style={{ color: 'var(--lp-text-primary)' }}>
              Upload once. <span className="lp-gradient-text">Approve once.</span>
              <br />
              Then let AMAI run your social media.
            </h1>

            <p className="mt-6 text-base sm:text-lg leading-relaxed max-w-xl" style={{ color: 'var(--lp-text-secondary)' }}>
              AMAI watches your media, writes the captions and hashtags, scores every post,
              and publishes to Instagram and TikTok on schedule — you just review and approve.
              No more juggling five apps to post one video.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm lp-btn-primary lp-focus-ring"
              >
                Start Automating Free
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold lp-btn-ghost lp-focus-ring"
              >
                <PlayCircle className="h-4 w-4" />
                See it in action
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6 text-xs font-medium flex-wrap" style={{ color: 'var(--lp-text-muted)' }}>
              <span>No credit card required</span>
              <span className="h-1 w-1 rounded-full" style={{ background: 'var(--lp-text-muted)' }} />
              <span>Cancel anytime</span>
              <span className="hidden sm:inline h-1 w-1 rounded-full" style={{ background: 'var(--lp-text-muted)' }} />
              <span className="hidden sm:inline">Setup in under 5 minutes</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative" style={{ width: 340, height: 340 }}>
              <EngineOrb />
              {HOTSPOTS.map((h) => (
                <Hotspot key={h.label} {...h} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
