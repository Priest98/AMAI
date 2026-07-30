"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle } from 'lucide-react';
import EngineOrb from './EngineOrb';
import { Eyebrow } from './shared';

export default function Hero() {
  return (
    <section className="relative pt-36 pb-24 sm:pt-44 sm:pb-32 overflow-hidden" aria-label="Introduction">
      <div className="absolute inset-0 lp-noise-grid pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <Eyebrow>AI Social Media Operating System</Eyebrow>

          <h1 className="lp-heading mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
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

          <div className="mt-10 flex items-center gap-6 text-xs font-medium" style={{ color: 'var(--lp-text-muted)' }}>
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
          className="flex justify-center lg:justify-end"
        >
          <EngineOrb />
        </motion.div>
      </div>
    </section>
  );
}
