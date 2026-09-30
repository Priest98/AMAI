"use client";

import React from "react";
import { Sparkles, Layers, ShieldCheck, Database } from "lucide-react";

export default function BrainSection() {
  return (
    <section className="oy-brain-section" aria-label="The Oyinca Brain Architecture">
      <div className="oy-brain-grid">
        <div className="oy-brain-copy">
          <p className="oy-eyebrow text-[var(--oy-blue-sky)]">The Oyinca Brain</p>
          <h2>It learns how your brand speaks.</h2>
          <p>
            Every piece of content gives Oyinca more context about your brand,
            your audience and how you communicate. Over time, Oyinca feels less
            like software you operate and more like a manager who already knows
            the job.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Layers className="w-5 h-5 text-[var(--oy-blue-sky)] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white text-sm block">Persistent Audience Memory</strong>
                <span className="text-white/60 text-xs leading-relaxed">
                  Understands customer demographics, recurring pain points, and specific niche terminology.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-[var(--oy-blue-sky)] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white text-sm block">Voice Consistency Guardrails</strong>
                <span className="text-white/60 text-xs leading-relaxed">
                  Never deviates from your calibrated brand tone, vocabulary prohibitions, or stylistic boundaries.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="oy-brain-lattice" aria-hidden="true">
          <div className="flex items-center justify-between border-b border-[var(--oy-obsidian-line)] pb-4 mb-5">
            <span className="text-xs font-mono text-[var(--oy-blue-sky)] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Contextual Memory Store
            </span>
            <span className="text-[10px] text-white/40 font-mono">ACTIVE EVALUATION</span>
          </div>

          <div className="oy-memory-card">
            <small>Brand Voice Matrix</small>
            <p className="font-medium text-white/95">
              &ldquo;Authoritative, calm, craftsman-led. Avoid hyperbolic claims and exclamation overuse.&rdquo;
            </p>
          </div>

          <div className="oy-memory-card">
            <small>Audience Intent</small>
            <p className="font-medium text-white/95">
              &ldquo;Creators seeking authentic process insight rather than polished sales pitches.&rdquo;
            </p>
          </div>

          <div className="oy-memory-card">
            <small>Publishing Heuristics</small>
            <p className="font-medium text-white/95">
              &ldquo;High video completion rate observed when opening hook uses behind-the-scenes framing.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
