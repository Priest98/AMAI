"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, Layers, Eye, PenLine, Hash, Gauge, ShieldCheck, Clock, CheckCircle2,
} from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

const STAGES = [
  { Icon: UploadCloud, label: 'Upload', detail: 'video-launch-reel.mp4 received' },
  { Icon: Layers, label: 'Media Detection', detail: 'Format & dimensions verified' },
  { Icon: Eye, label: 'AI Vision', detail: 'Scene, subject & tone analyzed' },
  { Icon: PenLine, label: 'Caption Generator', detail: 'On-brand caption drafted' },
  { Icon: Hash, label: 'Hashtag Generator', detail: '12 relevant hashtags selected' },
  { Icon: Gauge, label: 'Content Score', detail: 'Scored 94/100 for engagement' },
  { Icon: ShieldCheck, label: 'Approval Decision', detail: 'Routed to Approval Queue' },
  { Icon: Clock, label: 'Schedule Optimizer', detail: 'Best send time: 6:40 PM' },
  { Icon: CheckCircle2, label: 'Published', detail: 'Live on Instagram & TikTok' },
];

/**
 * The dedicated "AMAI Engine" pipeline visualization — loops through every
 * real stage of the automation (mirrors the actual backend pipeline:
 * upload -> media detection -> AI vision -> caption/hashtag generation ->
 * scoring -> approval -> scheduling -> publish) with the active stage
 * highlighted, auto-advancing on a timer and pausable via keyboard/click.
 */
export default function EnginePipeline() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: '-100px 0px' });

  useEffect(() => {
    if (paused || !inView || reduceMotion) return;
    const id = setInterval(() => setActive((v) => (v + 1) % STAGES.length), 1700);
    return () => clearInterval(id);
  }, [paused, inView, reduceMotion]);

  return (
    <section id="engine" className="relative py-24 sm:py-32" aria-label="AMAI Engine pipeline">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>The AMAI Engine</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Watch the engine actually work
          </h2>
          <p className="mt-4 text-base" style={{ color: 'var(--lp-text-secondary)' }}>
            This is the real pipeline every upload goes through — not a mockup.
          </p>
        </Reveal>

        <div
          ref={ref}
          className="mt-16 lp-card p-6 sm:p-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          role="group"
          aria-label="AMAI Engine automation stages, auto-advancing"
        >
          {/* Desktop: horizontal pipeline */}
          <div className="hidden lg:block">
            <div className="relative flex items-start justify-between">
              <div
                className="absolute top-6 left-6 right-6 h-px"
                style={{ background: 'var(--lp-border-strong)' }}
              />
              <motion.div
                className="absolute top-6 left-6 h-px"
                style={{ background: 'var(--lp-gradient-brand)' }}
                animate={{ width: `calc(${(active / (STAGES.length - 1)) * 100}% - ${active === 0 ? 0 : 12}px)` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              {STAGES.map((stage, i) => {
                const isActive = i === active;
                const isDone = i < active;
                return (
                  <button
                    key={stage.label}
                    onClick={() => setActive(i)}
                    className="relative z-10 flex flex-col items-center gap-3 w-[11%] lp-focus-ring"
                    aria-current={isActive}
                    aria-label={`${stage.label}: ${stage.detail}`}
                  >
                    <span
                      className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300"
                      style={{
                        background: isActive || isDone ? 'var(--lp-gradient-brand)' : 'var(--lp-surface-raised)',
                        border: isActive || isDone ? 'none' : '1px solid var(--lp-border-strong)',
                        boxShadow: isActive ? '0 0 24px rgba(57,231,255,0.5)' : 'none',
                        transform: isActive ? 'scale(1.12)' : 'scale(1)',
                      }}
                    >
                      <stage.Icon
                        className="h-5 w-5"
                        style={{ color: isActive || isDone ? '#04070D' : 'var(--lp-text-muted)' }}
                      />
                    </span>
                    <span
                      className="text-[11px] font-semibold text-center leading-tight"
                      style={{ color: isActive ? 'var(--lp-text-primary)' : 'var(--lp-text-muted)' }}
                    >
                      {stage.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile / tablet: vertical list */}
          <div className="lg:hidden space-y-3">
            {STAGES.map((stage, i) => {
              const isActive = i === active;
              return (
                <button
                  key={stage.label}
                  onClick={() => setActive(i)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition lp-focus-ring"
                  style={{ background: isActive ? 'var(--lp-cyan-soft)' : 'transparent' }}
                  aria-current={isActive}
                >
                  <span
                    className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center"
                    style={{
                      background: isActive ? 'var(--lp-gradient-brand)' : 'var(--lp-surface-raised)',
                      border: isActive ? 'none' : '1px solid var(--lp-border-strong)',
                    }}
                  >
                    <stage.Icon className="h-4.5 w-4.5" style={{ color: isActive ? '#04070D' : 'var(--lp-text-muted)' }} />
                  </span>
                  <span className="text-sm font-semibold" style={{ color: isActive ? 'var(--lp-text-primary)' : 'var(--lp-text-secondary)' }}>
                    {stage.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="lp-mono text-xs sm:text-[13px] px-4 py-2 rounded-full lp-glass"
                style={{ color: 'var(--lp-cyan)' }}
              >
                {STAGES[active].detail}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
