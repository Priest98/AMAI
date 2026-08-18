"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, PartyPopper, X } from 'lucide-react';
import { TourStep } from './tourSteps';

interface TourOverlayProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Finds the current step's target element and tracks its position, re-measuring on scroll/resize and polling briefly after a route change since the new page's content mounts asynchronously. */
function useSpotlightRect(target: string | null): Rect | null {
  const pathname = usePathname();
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!target) { setRect(null); return; }

    const measure = () => {
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) { setRect(null); return; }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    measure();
    const el = document.querySelector(`[data-tour="${target}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const poll = setInterval(measure, 350);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      clearInterval(poll);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, pathname]);

  return rect;
}

export default function TourOverlay({ step, stepIndex, totalSteps, onNext, onPrev, onSkip, onFinish }: TourOverlayProps) {
  const isLastStep = stepIndex === totalSteps - 1;
  const rect = useSpotlightRect(isLastStep ? null : step.target);

  if (isLastStep) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-md rounded-[28px] p-8 sm:p-10 space-y-6 border shadow-2xl text-center relative overflow-hidden"
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
          >
            <div
              className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full blur-3xl opacity-30"
              style={{ background: 'var(--gradient-primary-cta)' }}
            />
            <div className="relative space-y-5">
              <div className="h-14 w-14 mx-auto rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: 'var(--gradient-primary-cta)' }}>
                <PartyPopper className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {step.title}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.body}</p>
              </div>
              <button
                onClick={onFinish}
                className="w-full py-3.5 px-6 rounded-2xl text-white font-bold text-sm shadow-xl transition touch-target"
                style={{ background: 'var(--gradient-primary-cta)', boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)' }}
              >
                Start Using AMAI
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <>
      {/* Spotlight cutout — a transparent box the size of the target with a
          giant box-shadow that dims everything else on the page. */}
      {rect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed z-[95] rounded-xl pointer-events-none transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 3px var(--accent-secondary), 0 0 24px 4px rgba(124, 58, 237, 0.5)',
          }}
        />
      )}
      {/* No visible target on this viewport (e.g. sidebar hidden on mobile) — still dim the page so the card reads clearly. */}
      {!rect && (
        <div className="fixed inset-0 z-[95] bg-black/55 pointer-events-none transition-opacity duration-300" />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step.step}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed z-[100] left-1/2 -translate-x-1/2 bottom-4 sm:bottom-8 w-[calc(100%-2rem)] max-w-sm rounded-[24px] p-5 sm:p-6 space-y-4 border shadow-2xl"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
        >
          <button
            onClick={onSkip}
            className="absolute top-3 right-3 h-7 w-7 rounded-lg flex items-center justify-center transition"
            style={{ color: 'var(--text-muted)' }}
            title="Skip Tour"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Progress indicator */}
          <div className="space-y-1.5 pr-6">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              <span>Step {stepIndex + 1} of {totalSteps}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hover-surface)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--gradient-primary-cta)' }}
                initial={{ width: 0 }}
                animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.body}</p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onPrev}
              disabled={stepIndex === 0}
              className="px-3 py-2 rounded-lg text-xs font-bold border flex items-center space-x-1 disabled:opacity-30 disabled:cursor-not-allowed transition touch-target"
              style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <button
              onClick={onSkip}
              className="text-xs font-semibold underline underline-offset-2 hidden sm:inline"
              style={{ color: 'var(--text-muted)' }}
            >
              Skip Tour
            </button>

            <button
              onClick={onNext}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center space-x-1.5 shadow-md transition touch-target"
              style={{ background: 'var(--gradient-primary-cta)' }}
            >
              <span>Next</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
