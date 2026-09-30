"use client";

import React from "react";
import { Upload, Eye, CheckCircle, Calendar, Hash, Sparkles, Clock, Check } from "lucide-react";

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="oy-how-section" aria-label="How Oyinca Works">
      <div className="oy-how-container">
        <div className="oy-how-header">
          <p className="oy-eyebrow">Sequential Workflow</p>
          <h2>How Oyinca takes your content live.</h2>
        </div>

        <div className="oy-how-grid">
          {/* Step 01 */}
          <article className="oy-how-card">
            <span className="oy-how-num">01</span>
            <h3>Drop your content</h3>
            <p>
              Upload photos or videos directly or sync your folder. Oyinca takes
              it from there, ready to ingest and inspect.
            </p>
            <div className="oy-how-visual-box">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--oy-line-strong)] rounded-2xl bg-white w-full max-w-sm text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--oy-blue-mist)] flex items-center justify-center text-[var(--oy-blue-steel)] mb-3">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-[var(--oy-ink)]">
                  studio-process.mp4
                </span>
                <span className="text-xs text-[var(--oy-ink-faint)] mt-1">
                  18 seconds • High resolution
                </span>
              </div>
            </div>
          </article>

          {/* Step 02 */}
          <article className="oy-how-card">
            <span className="oy-how-num">02</span>
            <h3>Oyinca understands it</h3>
            <p>
              Oyinca analyses visual pace, context, speech and brand memory
              before preparing your post tailored specifically for TikTok.
            </p>
            <div className="oy-how-visual-box">
              <div className="relative w-full max-w-sm bg-white p-5 rounded-2xl border border-[var(--oy-line)] shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--oy-line)] pb-3 mb-3 text-xs font-semibold text-[var(--oy-ink)]">
                  <span className="flex items-center gap-1.5 text-[var(--oy-blue-steel)]">
                    <Sparkles className="w-4 h-4" /> AI Inspection
                  </span>
                  <span className="text-[#10B981] font-mono">99.2% match</span>
                </div>
                <div className="space-y-2 text-xs text-[var(--oy-ink-muted)]">
                  <div className="flex justify-between py-1 border-b border-[var(--oy-line)]">
                    <span>Identified theme:</span>
                    <span className="font-semibold text-[var(--oy-ink)]">Behind The Scenes</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--oy-line)]">
                    <span>Tone adherence:</span>
                    <span className="font-semibold text-[var(--oy-ink)]">Authentic & Direct</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Pacing:</span>
                    <span className="font-semibold text-[var(--oy-ink)]">High Retention (0:18)</span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Step 03 */}
          <article className="oy-how-card">
            <span className="oy-how-num">03</span>
            <h3>Your post takes shape</h3>
            <p>
              Caption, targeted hashtags, optimal timing, and TikTok parameters
              assemble harmoniously into a complete, ready draft.
            </p>
            <div className="oy-how-visual-box">
              <div className="oy-post-assembly-preview">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[var(--oy-blue-steel)] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Assembled Draft
                </div>
                <p className="text-xs text-[var(--oy-ink)] font-medium leading-relaxed mb-3">
                  &ldquo;A little look at how the work comes together. Made with care, shared with you.&rdquo;
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-[10px] bg-[var(--oy-porcelain)] text-[var(--oy-blue-steel)] font-semibold px-2 py-0.5 rounded">#BehindTheScenes</span>
                  <span className="text-[10px] bg-[var(--oy-porcelain)] text-[var(--oy-blue-steel)] font-semibold px-2 py-0.5 rounded">#CreativeProcess</span>
                  <span className="text-[10px] bg-[var(--oy-porcelain)] text-[var(--oy-blue-steel)] font-semibold px-2 py-0.5 rounded">#StudioLife</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--oy-line)] text-[11px] text-[var(--oy-ink-muted)]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[var(--oy-blue-steel)]" /> Thu, 8:08 AM
                  </span>
                  <span className="text-[#10B981] font-semibold">Ready</span>
                </div>
              </div>
            </div>
          </article>

          {/* Step 04 */}
          <article className="oy-how-card">
            <span className="oy-how-num">04</span>
            <h3>Review or let Oyinca work</h3>
            <p>
              Keep absolute control with Assisted approval mode, or let your
              rhythm transition into automated scheduling when you are ready.
            </p>
            <div className="oy-how-visual-box">
              <div className="w-full max-w-sm bg-white p-5 rounded-2xl border border-[var(--oy-line)] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold tracking-wider uppercase text-[var(--oy-ink)]">
                    Approval Queue
                  </span>
                  <span className="text-[11px] bg-[#ECFDF5] text-[#065F46] font-semibold px-2.5 py-1 rounded-full">
                    1 Pending
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[var(--oy-porcelain)] rounded-xl border border-[var(--oy-line)]">
                  <div className="text-xs">
                    <div className="font-semibold text-[var(--oy-ink)]">studio-process.mp4</div>
                    <div className="text-[11px] text-[var(--oy-ink-muted)]">Scheduled for Thu 8:08 AM</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[var(--oy-ink)] px-3 py-1.5 rounded-lg shadow-sm">
                      <Check className="w-3 h-3" /> Approve
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
