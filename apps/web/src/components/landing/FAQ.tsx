"use client";

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reveal, Eyebrow } from './shared';

/**
 * Four questions, not five. "How does TikTok publishing work?" is cut --
 * Assisted vs. Autopilot is now explained in How It Works, so it was a
 * restatement rather than new information. The remaining four are exactly
 * the ones that can block a signup: cost, limits, cancellation, platform
 * scope.
 *
 * Single-open accordion driven by React state instead of native
 * <details>/<summary>, specifically so open/close can animate smoothly
 * (framer-motion's height: 'auto' animation) -- <details> toggles
 * instantly with no transition. Still fully keyboard accessible: each
 * question is a real <button> with aria-expanded/aria-controls, reachable
 * and operable via Tab + Enter/Space, and the answer panel is an
 * aria-labelledby region.
 */
const FAQS = [
  {
    q: 'Is Oyinca really free?',
    a: 'Yes. Oyinca has a free plan with a limited number of posts each month. You can start without entering payment details and upgrade when you need more.',
  },
  {
    q: 'What happens when I hit my free limit?',
    a: 'You can upgrade to a paid plan to continue publishing, or wait until your allowance resets. Your existing content and account remain intact.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel your paid plan at any time. Your account remains accessible according to the terms of your current billing period.',
  },
  {
    q: 'Is Oyinca only for TikTok?',
    a: 'Not permanently. TikTok is where Oyinca starts, but the product is being built to support a broader social media presence as more platforms are added.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative py-12 sm:py-16" aria-label="Frequently asked questions">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Questions, answered
          </h2>
        </Reveal>

        <div className="mt-10 space-y-2">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            const buttonId = `faq-button-${i}`;
            const panelId = `faq-panel-${i}`;
            return (
              <Reveal key={item.q} delay={i * 0.03}>
                <div className="lp-card overflow-hidden">
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold lp-focus-ring"
                  >
                    {item.q}
                    <ChevronDown
                      className="h-4 w-4 shrink-0 transition-transform duration-200"
                      style={{ color: 'var(--lp-cyan)', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
