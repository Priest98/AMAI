"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Monogram } from '@/components/logo';

/**
 * Oyinca's cinematic hero portrait -- the Higgsfield-generated character
 * loop this component expects doesn't exist in this environment (no
 * video/image generation available here), so these are the exact asset
 * paths and specs a real Higgsfield export should be dropped into. Nothing
 * else needs to change -- once both files exist at these paths, the video
 * activates automatically and this comment (and the fallback below) simply
 * stop being relevant.
 *
 *   /public/hero/oyinca-loop.mp4    5-8s seamless loop, muted, H.264 mp4,
 *                                   portrait 4:5 (1080x1350), Oyinca
 *                                   centered so a 9:16 mobile crop also
 *                                   stays safe. See the Higgsfield prompt
 *                                   doc for the full character brief.
 *   /public/hero/oyinca-poster.jpg  A single sharp frame from the loop
 *                                   (same 1080x1350), used as the poster
 *                                   attribute and as the first paint
 *                                   before the video downloads.
 *
 * Until those exist, the panel below falls back to the brand's Agent
 * Orbit mark on a solid surface -- an intentional, on-brand placeholder
 * rather than a broken video icon or empty box.
 */
const VIDEO_SRC = '/hero/oyinca-loop.mp4';
const POSTER_SRC = '/hero/oyinca-poster.jpg';

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
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--lp-surface)' }} aria-hidden="true">
          <div className="lp-hero-fallback-orbit">
            <Monogram className="h-24 w-24 sm:h-32 sm:w-32" />
          </div>
        </div>
      )}
      {/* Soft bottom scrim so the floating status/toast cards (rendered by
          Hero.tsx on top of this panel) stay legible against either the
          video or the fallback surface. */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(4,7,13,0.45) 0%, transparent 35%)' }} />
    </div>
  );
}
