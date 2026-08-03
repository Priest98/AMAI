"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle } from 'lucide-react';
import EngineOrb from './EngineOrb';

/**
 * Hotspot callouts ringing the AMAI Engine orb -- minimal dot + leader-line
 * + label annotations that let the visual carry the "what AMAI does" story
 * instead of another paragraph of copy. Kept deliberately short (three,
 * not a checklist) so the hero stays uncluttered.
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
  { label: 'AI Captions', top: '8%', anchor: 'left', anchorValue: '80%', lineWidth: 52 },
  { label: 'Best-Time Publish', top: '50%', anchor: 'right', anchorValue: '96%', lineWidth: 46 },
  { label: 'Auto Scheduling', top: '90%', anchor: 'left', anchorValue: '82%', lineWidth: 50 },
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
    <section className="relative pt-40 pb-32 sm:pt-48 sm:pb-40 px-5 sm:px-8 overflow-hidden" aria-label="Introduction">
      {/* Oversized ambient background typography -- pure atmosphere sitting
          directly on the shared page backdrop, not meant to be read. */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <span className="text-display-giant" style={{ color: 'var(--lp-border-strong)', opacity: 0.4 }}>
          AMAI
        </span>
      </div>

      <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="lp-heading text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.04] tracking-tight" style={{ color: 'var(--lp-text-primary)' }}>
            Upload once. <span className="lp-gradient-text">AMAI</span> handles the rest.
          </h1>

          <p className="mt-7 text-lg leading-relaxed max-w-md" style={{ color: 'var(--lp-text-secondary)' }}>
            It writes the captions, picks the best time, and publishes to Instagram and TikTok — automatically.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-7 py-4 rounded-2xl text-sm lp-btn-primary lp-focus-ring"
            >
              Start Automating Free
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#demo"
              className="group inline-flex items-center gap-2 text-sm font-semibold lp-focus-ring"
              style={{ color: 'var(--lp-text-secondary)' }}
            >
              <PlayCircle className="h-4 w-4 transition group-hover:opacity-80" />
              <span className="transition group-hover:opacity-80">See it in action</span>
            </a>
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
    </section>
  );
}
