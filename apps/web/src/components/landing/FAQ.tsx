"use client";

import React, { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Eyebrow } from './shared';
import GsapReveal from './GsapReveal';
import { ensureGsapPlugins, gsap, prefersReducedMotion } from './gsap-setup';

/**
 * Four questions, not five. "How does TikTok publishing work?" is cut --
 * Assisted vs. Autopilot is now explained in How It Works, so it was a
 * restatement rather than new information. The remaining four are exactly
 * the ones that can block a signup: cost, limits, cancellation, platform
 * scope.
 *
 * Single-open accordion driven by React state. Open/close height is
 * animated with GSAP directly (gsap.to(panel, { height: ... })) per the
 * luxury-motion brief's explicit "smooth GSAP height transitions"
 * requirement -- GSAP's core CSS plugin natively supports animating to/
 * from `height: 'auto'`, so no extra measurement code is needed. Still
 * fully keyboard accessible: each question is a real <button> with
 * aria-expanded/aria-controls, reachable and operable via Tab +
 * Enter/Space, and the answer panel is an aria-labelledby region.
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
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const animatePanel = (el: HTMLDivElement, opening: boolean) => {
    if (prefersReducedMotion()) {
      gsap.set(el, opening ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 });
      return;
    }
    ensureGsapPlugins();
    if (opening) {
      gsap.set(el, { height: 0, opacity: 0 });
      gsap.to(el, { height: 'auto', opacity: 1, duration: 0.42, ease: 'power2.inOut' });
    } else {
      gsap.to(el, { height: 0, opacity: 0, duration: 0.32, ease: 'power2.inOut' });
    }
  };

  const toggle = (i: number) => {
    const wasOpen = openIndex === i;
    const prevIndex = openIndex;

    // Close whichever panel was open before (single-open accordion).
    if (prevIndex !== null && prevIndex !== i) {
      const prevEl = panelRefs.current[prevIndex];
      if (prevEl) animatePanel(prevEl, false);
    }

    const el = panelRefs.current[i];
    if (el) animatePanel(el, !wasOpen);

    setOpenIndex(wasOpen ? null : i);
  };

  return (
    <section id="faq" className="relative py-24 sm:py-32 lg:py-40" aria-label="Frequently asked questions">
      <div className="max-w-2xl mx-auto px-5 sm:px-8">
        <GsapReveal className="text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="lp-heading-display mt-6 text-3xl sm:text-4xl lg:text-5xl">
            Questions, answered
          </h2>
        </GsapReveal>

        {/* space-y-2 -> space-y-4: a comfortable margin between items, per
            the luxury-motion brief, instead of cards nearly touching. */}
        <div className="mt-14 space-y-4">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            const buttonId = `faq-button-${i}`;
            const panelId = `faq-panel-${i}`;
            return (
              <GsapReveal key={item.q} delay={i * 0.04} className="lp-card overflow-hidden">
                {/* px-5 py-4 -> px-8 py-6: expanded padding inside the
                    accordion trigger, per the brief. */}
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between gap-4 px-8 py-6 text-left text-[15px] font-semibold lp-focus-ring"
                >
                  {item.q}
                  <ChevronDown
                    className="h-4 w-4 shrink-0 transition-transform duration-200"
                    style={{ color: isOpen ? 'var(--lp-gold)' : 'var(--lp-cyan)', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                  />
                </button>
                <div
                  ref={(el) => { panelRefs.current[i] = el; }}
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  style={{ height: 0, opacity: 0, overflow: 'hidden' }}
                >
                  <div className="px-8 pb-6 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                    {item.a}
                  </div>
                </div>
              </GsapReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
