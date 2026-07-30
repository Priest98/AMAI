"use client";

import React from 'react';
import { Eye, PenLine, ShieldCheck, CalendarClock, FolderSync, Activity, Gauge, Layers } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

export default function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32" aria-label="Features">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>Everything, handled</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            One engine, every part of the workflow
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Reveal className="sm:col-span-2 lg:col-span-2 lg:row-span-2">
            <div className="lp-card h-full p-8 flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--lp-cyan-soft)' }}>
                  <Eye className="h-6 w-6" style={{ color: 'var(--lp-cyan)' }} />
                </div>
                <h3 className="lp-heading mt-5 text-xl font-bold">AI Vision that understands your content</h3>
                <p className="mt-3 text-sm leading-relaxed max-w-md" style={{ color: 'var(--lp-text-secondary)' }}>
                  AMAI watches every upload — subject, setting, tone, pacing — and uses that
                  understanding to write captions and hashtags that actually fit, not generic filler.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Scene detection', 'Tone matching', 'Format-aware'].map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full text-[11px] font-semibold lp-glass" style={{ color: 'var(--lp-text-secondary)' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="lp-card h-full p-6 min-h-[130px]">
              <PenLine className="h-5 w-5" style={{ color: 'var(--lp-purple)' }} />
              <h3 className="lp-heading mt-4 font-bold text-[15px]">Captions & hashtags</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                Written and tagged automatically, on-brand, every time.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="lp-card h-full p-6 min-h-[130px]">
              <Gauge className="h-5 w-5" style={{ color: 'var(--lp-purple)' }} />
              <h3 className="lp-heading mt-4 font-bold text-[15px]">Content scoring</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                Every post is scored before it ever reaches your queue.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="lp-card h-full p-6 min-h-[130px]">
              <ShieldCheck className="h-5 w-5" style={{ color: 'var(--lp-cyan)' }} />
              <h3 className="lp-heading mt-4 font-bold text-[15px]">Approval Queue</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                Edit caption, hashtags, targets or schedule before it goes live.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="lp-card h-full p-6 min-h-[130px]">
              <CalendarClock className="h-5 w-5" style={{ color: 'var(--lp-cyan)' }} />
              <h3 className="lp-heading mt-4 font-bold text-[15px]">Smart scheduling</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                Publishes at the moment your audience is actually online.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.25} className="sm:col-span-2 lg:col-span-2">
            <div className="lp-card h-full p-6 min-h-[130px] flex items-center gap-5">
              <div className="h-12 w-12 shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'var(--lp-purple-soft)' }}>
                <FolderSync className="h-5 w-5" style={{ color: 'var(--lp-purple)' }} />
              </div>
              <div>
                <h3 className="lp-heading font-bold text-[15px]">Google Drive sync</h3>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                  Drop files in a watched folder — AMAI picks them up automatically, no manual export.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="lp-card h-full p-6 min-h-[130px]">
              <Activity className="h-5 w-5" style={{ color: 'var(--lp-purple)' }} />
              <h3 className="lp-heading mt-4 font-bold text-[15px]">Live activity feed</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                Watch every stage happen in real time, from upload to published.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.35}>
            <div className="lp-card h-full p-6 min-h-[130px]">
              <Layers className="h-5 w-5" style={{ color: 'var(--lp-cyan)' }} />
              <h3 className="lp-heading mt-4 font-bold text-[15px]">Multi-platform</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                One approval, published to Instagram and TikTok together.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
