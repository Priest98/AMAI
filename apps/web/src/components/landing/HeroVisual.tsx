"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Oyinca's hero visual.
 *
 * The cinematic idle-motion loop is live: /public/hero/oyinca-loop.mp4 (+
 * poster jpg), generated with Google Flow (Veo 3.1, 9:16, 8s) using the
 * user's Google AI Pro plan. Higgsfield's own video models all rejected
 * generation with "Requires basic/plus plan or higher" (free tier), so the
 * source frame -- a photoreal Higgsfield portrait of Oyinca (model
 * `soul_2`, job 95edf626-ebdb-4cf7-a829-5c67b4346146) matching the locked
 * character brief in oyinca-higgsfield-hero-prompt.md (West African
 * heritage, late-20s, charcoal blazer, single gold ear cuff,
 * photoreal-unretouched realism) -- was fed into Flow as the starting
 * frame for image-to-video instead, keeping the same face/wardrobe/
 * identity across both tools.
 *
 * OYINCA_PORTRAIT_SRC (the static Higgsfield portrait) is kept as the
 * fallback for onError below -- if the video ever fails to load, visitors
 * still see the real character, with the same subtle CSS "Ken Burns"
 * drift (.lp-hero-portrait-kenburns in landing.css) standing in for
 * motion, rather than a broken video icon or empty box.
 */
const VIDEO_SRC = '/hero/oyinca-loop.mp4';
const POSTER_SRC = '/hero/oyinca-poster.jpg';
// Real generated portrait, hosted on Higgsfield's CDN (same external-hosting
// pattern already used for HERO_BG_URL elsewhere in Hero.tsx).
const OYINCA_PORTRAIT_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_3HXsou9653KJM9YD320GPTi1aul/hf_20260822_134812_95edf626-ebdb-4cf7-a829-5c67b4346146.png';

export default function HeroVisual({ className = '' }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const [inView, setInView] = useState(false);

  // Only start decoding/playing once the panel is actually on screen --
  // it's above the fold today so this fires almost immediately, but keeps
  // the component correct if the hero is ever reflowed lower on the page.
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

  return (
    <div
      ref={wrapRef}
      className={`lp-hero-visual-frame relative overflow-hidden ${className}`}
      role="img"
      aria-label="Oyinca, your social media manager, at work in her digital workspace"
    >
      {!videoFailed ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
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
        // No local video export exists yet (see comment above) -- this path
        // is what actually renders today. Show Oyinca's real generated
        // portrait rather than a video element pointed at nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={OYINCA_PORTRAIT_SRC}
          alt=""
          className="lp-hero-portrait-kenburns absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        />
      )}
      {/* Soft bottom scrim so the floating status/toast cards (rendered by
          Hero.tsx on top of this panel) stay legible against either the
          video or the fallback surface. */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(4,7,13,0.45) 0%, transparent 35%)' }} />
    </div>
  );
}
