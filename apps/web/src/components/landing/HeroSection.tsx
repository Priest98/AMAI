"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Play, Sparkles, CheckCircle2, Clock } from "lucide-react";

export default function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <section
      id="product"
      ref={heroRef}
      className="oy-hero-section"
      aria-label="Oyinca Overview"
    >
      <div className="oy-hero-grid">
        <div className="oy-hero-copy">
          <p className="oy-eyebrow">Meet your social media manager</p>
          <h1 className="oy-hero-headline">
            Your social media,
            <em>handled.</em>
          </h1>
          <p className="oy-hero-sub">
            Oyinca understands your content, prepares your posts and keeps your
            TikTok moving — while you focus on creating.
          </p>
          <div className="oy-hero-actions">
            <Link href="/register?plan=FREE" className="oy-btn-primary">
              <span>Get started</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className="oy-btn-secondary">
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>See how it works</span>
            </a>
          </div>
          <div className="oy-hero-trust">
            <span aria-hidden="true" />
            No credit card required. Review every post before it goes live.
          </div>
        </div>

        <div className="oy-hero-visual" aria-hidden="true">
          {/* Dimensional metallic intelligence core */}
          <div className="oy-core-sphere">
            <div className="oy-core-inner-ring" />
            <div className="oy-core-outer-ring" />
            
            {/* Center icon / signature emblem */}
            <div className="relative z-10 flex flex-col items-center justify-center text-white select-none">
              <Sparkles className="w-10 h-10 text-[#EBF3F8] drop-shadow-md animate-pulse" />
              <span className="text-[11px] font-bold tracking-[0.25em] text-[#EBF3F8] mt-2 uppercase opacity-90">
                Oyinca Core
              </span>
            </div>
          </div>

          {/* Floating Contextual Badges */}
          <div className="oy-floating-badge oy-badge-top-right">
            <span className="oy-badge-dot" />
            <span>Analyzing video pace & tone</span>
          </div>

          <div className="oy-floating-badge oy-badge-bottom-left">
            <Clock className="w-4 h-4 text-[var(--oy-blue-steel)]" />
            <span>Optimal slot: Today at 6:15 PM</span>
          </div>
        </div>
      </div>
    </section>
  );
}
