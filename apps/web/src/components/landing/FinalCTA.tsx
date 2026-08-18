"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './shared';
import MagneticButton from './MagneticButton';

export default function FinalCTA() {
  return (
    <section className="relative py-16 sm:py-20 px-5 sm:px-8" aria-label="Get started">
      <Reveal className="max-w-4xl mx-auto">
        <div
          className="relative overflow-hidden rounded-[28px] p-10 sm:p-16 text-center"
          style={{ background: 'var(--lp-surface)', border: '1px solid var(--lp-border)' }}
        >
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{ background: 'var(--lp-gradient-glow)' }}
          />
          <div className="relative">
            <h2 className="lp-hero-display text-4xl sm:text-6xl">
              Let your social media
              <br />
              run itself.
            </h2>
            <p className="mt-6 text-base sm:text-lg max-w-lg mx-auto" style={{ color: 'var(--lp-text-secondary)' }}>
              Connect your content. Set your preferences. Let AMAI handle the rest.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticButton as={motion.div}>
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm lp-btn-primary lp-focus-ring"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
              </MagneticButton>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-semibold lp-btn-ghost lp-focus-ring"
              >
                Sign In
              </Link>
            </div>
            <p className="mt-6 text-xs font-medium" style={{ color: 'var(--lp-text-muted)' }}>
              No credit card required.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
