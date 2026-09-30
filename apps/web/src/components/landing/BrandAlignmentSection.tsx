"use client";

import React, { useState } from "react";
import Image from "next/image";

const PILLARS = [
  {
    title: "YOUR VOICE",
    desc: "Whether bold and conversational or understated and educational, Oyinca writes with your cadence.",
  },
  {
    title: "YOUR CONTENT",
    desc: "From short-form phone videos to studio photography, every asset is interpreted in its true context.",
  },
  {
    title: "YOUR AUDIENCE",
    desc: "Oyinca tracks what your community engages with and sharpens future angles without guesswork.",
  },
  {
    title: "YOUR RHYTHM",
    desc: "Post once daily or manage multiple drops a week; Oyinca maintains momentum without burnout.",
  },
];

export default function BrandAlignmentSection() {
  const [activePillar, setActivePillar] = useState(0);

  return (
    <section className="oy-brand-split-section" aria-label="Built Around Your Brand">
      {/* Left Visual Panel */}
      <div className="oy-split-visual-panel">
        <div className="relative w-full max-w-md aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-white/60">
          <Image
            src="/hero/oyinca-sculpture-v1.webp"
            alt="Oyinca dimensional sculpture representing architectural brand presence"
            fill
            className="object-cover"
            sizes="(max-width: 1080px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--oy-ink)]/70 via-transparent to-transparent flex items-end p-8">
            <div className="text-white">
              <span className="text-[11px] font-mono tracking-widest uppercase text-[var(--oy-blue-sky)] block mb-1">
                ADAPTIVE INTELLIGENCE
              </span>
              <p className="text-base font-medium">
                Calibrated to your standard, not a generic prompt.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Content Panel */}
      <div className="oy-split-content-panel">
        <p className="oy-eyebrow">Adaptive Brand Calibration</p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--oy-ink)] mb-4">
          Built around your reality.
        </h2>
        <p className="text-sm sm:text-base text-[var(--oy-ink-muted)] max-w-md mb-8">
          Generic AI tools force you to rewrite generic copy. Oyinca builds a bespoke
          operational context that feels entirely human.
        </p>

        <div className="oy-brand-pillars">
          {PILLARS.map((pillar, idx) => (
            <div
              key={pillar.title}
              className={`oy-pillar-item cursor-pointer transition-opacity duration-200 ${
                activePillar === idx ? "opacity-100" : "opacity-40 hover:opacity-75"
              }`}
              onClick={() => setActivePillar(idx)}
            >
              <h3 className="oy-pillar-title">{pillar.title}</h3>
              <p className="oy-pillar-desc">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
