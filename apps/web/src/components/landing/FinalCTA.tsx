"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import GsapReveal from './GsapReveal';
import MagneticButton from './MagneticButton';
import Particles from './Particles';
import { ensureGsapPlugins, gsap, prefersReducedMotion } from './gsap-setup';

export default function FinalCTA() {
  return (
    // py-16 sm:py-12 -> py-24 sm:py-32 lg:py-40: massive breathing room
    // around the closing panel, per the luxury-motion brief.
    <section className="relative py-24 sm:py-32 lg:py-40 px-5 sm:px-8" aria-label="Get started">
      <GsapReveal className="max-w-4xl mx-auto">
        <div
          // p-10 sm:p-16 -> p-12 sm:p-20 lg:p-24: massive internal padding,
          // per the brief's explicit instruction for this panel.
          className="relative overflow-hidden rounded-[28px] p-12 sm:p-20 lg:p-24 text-center lp-glow-border-gold"
          style={{ background: 'var(--lp-surface)', border: '1px solid var(--lp-border)' }}
        >
          {/* Ambient radial gradient behind the text, pulsing slowly --
              replaces the previous static glow div with one whose opacity
              breathes via a GSAP timeline (yoyo + repeat), matched by a
              field of slow floating gold particles (Particles.tsx). Both
              skip themselves entirely under prefers-reduced-motion. */}
          <AmbientGlow />
          <Particles />
          <div className="relative">
            <h2 className="lp-hero-display text-5xl sm:text-6xl lg:text-7xl">
              Let Oyinca handle
              <br />
              your TikTok.
            </h2>
            <p className="mt-7 text-base sm:text-lg leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--lp-text-secondary)' }}>
              Upload your content. Set your preferences. Let Oyinca handle the rest on TikTok.
            </p>
            <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticButton as={motion.div}>
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 px-9 py-4.5 rounded-2xl text-sm lp-btn-primary lp-focus-ring"
                >
                  Hire Oyinca
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
              </MagneticButton>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl text-sm font-semibold lp-btn-ghost lp-focus-ring"
              >
                Sign In
              </Link>
            </div>
            <p className="mt-8 text-xs font-medium" style={{ color: 'var(--lp-text-muted)' }}>
              No credit card required.
            </p>
          </div>
        </div>
      </GsapReveal>
    </section>
  );
}

/** Slow-breathing ambient glow behind the Final CTA's headline (landing.css: .lp-cta-glow). Separated out purely so its GSAP tween has its own isolated ref/effect. */
function AmbientGlow() {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    ensureGsapPlugins();
    const tween = gsap.to(el, {
      opacity: 0.85,
      duration: 4.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="absolute inset-0 pointer-events-none lp-cta-glow"
      style={{ opacity: 0.5 }}
      aria-hidden="true"
    />
  );
}
