"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Gem, Hash, Gauge, CheckCircle2, RotateCcw, Play } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

type DemoState = 'idle' | 'uploading' | 'analyzing' | 'writing' | 'scoring' | 'done';

const SAMPLE_CAPTION =
  "New drop just landed 🔥 Shot on location, edited in a night. This is what happens when the whole team shows up.";
const SAMPLE_HASHTAGS = ['#NewDrop', '#BehindTheScenes', '#SmallBusiness', '#ContentCreator', '#StudioLife'];

const STEP_LABELS: Record<DemoState, string> = {
  idle: '',
  uploading: 'Uploading sample-launch-reel.mp4…',
  analyzing: 'AI Vision analyzing the video…',
  writing: 'Writing caption & hashtags…',
  scoring: 'Scoring content quality…',
  done: 'Added to your Approval Queue',
};

/**
 * A frontend-only simulation — no upload, no API call, nothing persisted.
 * Exists purely to show, in ~5 seconds, what the real Oyinca pipeline
 * looks like from a user's chair. Clearly labeled as a simulated demo.
 */
export default function InteractiveDemo() {
  const [state, setState] = useState<DemoState>('idle');
  const [progress, setProgress] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const runDemo = () => {
    clearTimers();
    setProgress(0);
    setState('uploading');

    const uploadInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(uploadInterval);
          return 100;
        }
        return p + 10;
      });
    }, 90);
    timers.current.push(uploadInterval as unknown as ReturnType<typeof setTimeout>);

    timers.current.push(setTimeout(() => setState('analyzing'), 1100));
    timers.current.push(setTimeout(() => setState('writing'), 2300));
    timers.current.push(setTimeout(() => setState('scoring'), 3500));
    timers.current.push(setTimeout(() => setState('done'), 4500));
  };

  const reset = () => {
    clearTimers();
    setState('idle');
    setProgress(0);
  };

  return (
    <section id="demo" className="relative py-24 sm:py-32" aria-label="Interactive demo">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>Try It, No Account Needed</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            See the engine run, right here
          </h2>
          <p className="mt-4 text-sm" style={{ color: 'var(--lp-text-secondary)' }}>
            This is a simulated walkthrough. Nothing is uploaded or stored. Your real content
            gets the exact same pipeline once you sign up.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12 lp-card p-6 sm:p-10">
            {state === 'idle' && (
              <div className="flex flex-col items-center text-center py-10">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'var(--lp-cyan-soft)' }}
                >
                  <Film className="h-7 w-7" style={{ color: 'var(--lp-cyan)' }} />
                </div>
                <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--lp-text-secondary)' }}>
                  Run a sample video through Oyinca to see caption generation,
                  hashtags, and content scoring happen live.
                </p>
                <button
                  onClick={runDemo}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm lp-btn-primary lp-focus-ring"
                >
                  <Play className="h-4 w-4" />
                  Run the Demo
                </button>
              </div>
            )}

            {state !== 'idle' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--lp-surface-raised)', border: '1px solid var(--lp-border-strong)' }}>
                      <Film className="h-4.5 w-4.5" style={{ color: 'var(--lp-text-muted)' }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold lp-mono">sample-launch-reel.mp4</p>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={state}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-[11px]"
                          style={{ color: 'var(--lp-cyan)' }}
                        >
                          {STEP_LABELS[state]}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>
                  {state === 'done' && (
                    <button
                      onClick={reset}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold lp-btn-ghost lp-focus-ring"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Run again
                    </button>
                  )}
                </div>

                {state === 'uploading' && (
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--lp-surface-raised)' }}>
                    <motion.div
                      className="h-full"
                      style={{ background: 'var(--lp-gradient-brand)', width: `${progress}%` }}
                    />
                  </div>
                )}

                {(state === 'analyzing' || state === 'writing' || state === 'scoring' || state === 'done') && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--lp-text-muted)' }}>
                    <Gem className="h-3.5 w-3.5" style={{ color: 'var(--lp-purple)' }} />
                    AI Vision detected: outdoor product shot, upbeat pacing, product-launch tone.
                  </div>
                )}

                <AnimatePresence>
                  {(state === 'writing' || state === 'scoring' || state === 'done') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 rounded-xl lp-glass"
                    >
                      <p className="text-sm leading-relaxed">{SAMPLE_CAPTION}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {SAMPLE_HASHTAGS.map((h) => (
                          <span key={h} className="px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'var(--lp-purple-soft)', color: 'var(--lp-purple)' }}>
                            <Hash className="inline h-2.5 w-2.5 mr-0.5" />
                            {h.replace('#', '')}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {(state === 'scoring' || state === 'done') && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 rounded-xl lp-glass"
                    >
                      <Gauge className="h-5 w-5" style={{ color: 'var(--lp-cyan)' }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                          <span>Content Score</span>
                          <span style={{ color: 'var(--lp-cyan)' }}>94 / 100</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--lp-surface-raised)' }}>
                          <motion.div
                            className="h-full"
                            style={{ background: 'var(--lp-gradient-brand)' }}
                            initial={{ width: 0 }}
                            animate={{ width: '94%' }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {state === 'done' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-sm font-semibold"
                      style={{ color: 'var(--lp-success)' }}
                    >
                      <CheckCircle2 className="h-4.5 w-4.5" />
                      Added to your Approval Queue, ready for a real review.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
