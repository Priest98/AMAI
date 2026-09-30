"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="oy-final-section" aria-label="Get Started with Oyinca">
      {/* Visual Echo of the Hero Centerpiece */}
      <div className="oy-final-core-echo flex items-center justify-center text-white" aria-hidden="true">
        <Sparkles className="w-8 h-8 text-[#EBF3F8] animate-pulse" />
      </div>

      <p className="oy-eyebrow text-[var(--oy-blue-sky)] justify-center">Take The Next Step</p>

      <h2 className="oy-final-headline">
        Your content is ready.
        <br />
        Give it a manager.
      </h2>

      <div className="mt-8">
        <Link href="/register?plan=FREE" className="oy-final-btn">
          <span>Start with Oyinca</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      <p className="mt-6 text-xs text-white/50">
        Free to begin. No credit card required.
      </p>
    </section>
  );
}
