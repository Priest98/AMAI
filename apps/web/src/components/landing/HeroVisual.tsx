"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { prefersReducedMotion } from './reduced-motion';

/**
 * Oyinca's cinematic hero background.
 *
 * Rewritten from a small rounded 380px "product card" panel into a
 * full-bleed background layer -- per the cinematic-hero redesign brief,
 * Oyinca is meant to be the visual environment of the first viewport, not
 * a screenshot sitting beside the copy. Structurally this is now a plain
 * absolute inset-0 layer with no card chrome (no border-radius, border,
 * or surface background) -- Hero.tsx renders it as the section's own
 * backdrop and layers its copy/overlay on top.
 *
 * The play/pause/fallback logic below is unchanged from the previous
 * version: same IntersectionObserver-gated autoplay, same
 * prefers-reduced-motion opt-out, same onError -> static-portrait fallback.
 * None of that was specific to the old card layout, so there was no reason
 * to rewrite it.
 *
 * Video source: /public/hero/oyinca-loop.mp4 (+ poster jpg), generated
 * with Google Flow (Veo 3.1, 9:16, 8s, 720x1280) -- see the git history for
 * the full generation notes. It's a PORTRAIT asset being used as a
 * landscape/full-viewport background, which is a deliberate, considered
 * choice, not an oversight: at typical wide desktop aspect ratios,
 * object-fit: cover on a 9:16 source is width-driven (the video's full
 * width fits with zero horizontal crop; the crop is entirely vertical), so
 * nothing about her horizontal framing is lost -- only object-position's Y
 * value matters, tuned in landing.css (.lp-hero-fullbleed-media) per
 * breakpoint to keep her face/smile in the visible band instead of an
 * arbitrary top-anchored crop. On narrow mobile viewports the math flips
 * (portrait containers crop horizontally, not vertically), which is also
 * handled there.
 */
const VIDEO_SRC = '/hero/oyinca-loop.mp4';
const POSTER_SRC = '/hero/oyinca-poster.jpg';
// Static portrait fallback if the video element ever fails to load --
// same asset HeroVisual has always used for this path, just now rendered
// full-bleed instead of inside a card.
const OYINCA_PORTRAIT_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_3HXsou9653KJM9YD320GPTi1aul/hf_20260822_134812_95edf626-ebdb-4cf7-a829-5c67b4346146.png';

export default function HeroVisual({ className = '' }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const [inView, setInView] = useState(false);

  // The hero is the first thing on the page, so this fires almost
  // immediately -- kept anyway so the component stays correct if the
  // section is ever reflowed, and so a slow/backgrounded tab doesn't
  // spend cycles decoding a video nobody's looking at yet.
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoFailed) return;
    // prefers-reduced-motion: never autoplay -- the poster frame (or the
    // static fallback) is the entire experience for these visitors.
    if (inView && !reduceMotion) {
      video.play().catch(() => {
        // Autoplay can still be blocked by the browser even when muted
        // (rare, but happens) -- the poster frame stays visible either
        // way, so there's nothing broken to recover from.
      });
    } else {
      video.pause();
    }
  }, [inView, reduceMotion, videoFailed]);

  // Luxury-motion brief: "a subtle GSAP parallax effect to the video
  // container as the user scrolls away." Scrubbed (tied directly to scroll
  // position, not time-based) so it never fights ScrollSmoother's own
  // eased scroll -- both read from the same scroll position on every
  // frame. A slight scale-up (1 -> 1.08) accompanies the vertical drift so
  // the edges of the video never reveal themselves as it shifts inside its
  // overflow-hidden wrapper.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = wrapRef.current;
    if (!el) return;

    // Dynamically imported (not a top-level import) so GSAP's bytes never
    // sit on the hero's own critical rendering path -- this is the single
    // most LCP-sensitive component on the page, and the parallax it adds
    // is a scroll-driven embellishment, not something the initial paint
    // depends on.
    let cancelled = false;
    let tween: { kill: () => void; scrollTrigger?: { kill: () => void } } | undefined;

    import('./gsap-setup').then(({ ensureGsapPlugins, gsap }) => {
      if (cancelled || !wrapRef.current) return;
      ensureGsapPlugins();
      tween = gsap.fromTo(
        wrapRef.current,
        { yPercent: 0, scale: 1 },
        {
          yPercent: 14,
          scale: 1.08,
          ease: 'none',
          scrollTrigger: {
            trigger: wrapRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        },
      );
    });

    return () => {
      cancelled = true;
      tween?.scrollTrigger?.kill();
      tween?.kill();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      role="img"
      aria-label="Oyinca, your social media manager, at work in her digital workspace"
    >
      {!videoFailed ? (
        <video
          ref={videoRef}
          className="lp-hero-fullbleed-media absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
          poster={POSTER_SRC}
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      ) : (
        // No local video export exists -- this path is what actually
        // renders today. Shows Oyinca's real generated portrait rather
        // than a broken/empty video element, with the same slow Ken Burns
        // drift standing in for motion the video would otherwise supply.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={OYINCA_PORTRAIT_SRC}
          alt=""
          className="lp-hero-fullbleed-media lp-hero-portrait-kenburns absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
