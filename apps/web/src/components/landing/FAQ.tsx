"use client";

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

/**
 * Five questions, not eleven. The cut ones were either already answered
 * elsewhere on the page (upgrade timing, approval queue, Business Brain,
 * managing multiple businesses) or a restatement of another entry ("do I
 * need a credit card" has the same answer as "is Free really free"). An FAQ
 * that long reads as a manual and buries the questions that actually block
 * a signup.
 */
const FAQS = [
  {
    q: 'Is Free really free?',
    a: 'Yes. Start on the Free plan without a credit card. It includes core functionality with defined usage limits.',
  },
  {
    q: 'What happens when I hit my Free limit?',
    a: 'That specific feature pauses until your usage resets or you upgrade. Your account stays active and your workspace isn’t locked.',
  },
  {
    q: 'How does TikTok publishing work?',
    a: 'Connect your TikTok account, and Oyinca can publish directly through TikTok\'s own API. Choose Assisted (you approve each post) or Autopilot (Oyinca publishes on its own).',
  },
  {
    q: 'Can I cancel Pro?',
    a: 'Yes, according to the applicable subscription terms. Your access may remain active until the end of your current billing period.',
  },
  {
    q: 'Is Oyinca only for TikTok?',
    a: 'No. Oyinca is an AI social media manager, not a TikTok-only tool. TikTok is where it starts, fully supported end to end, with more platforms on the roadmap.',
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="relative py-16 sm:py-20" aria-label="Frequently asked questions">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Questions, answered
          </h2>
        </Reveal>

        <div className="mt-12 space-y-3">
          {FAQS.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.03}>
              <details className="lp-card group p-0 overflow-hidden">
                <summary
                  className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none text-sm font-semibold lp-focus-ring"
                >
                  {item.q}
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" style={{ color: 'var(--lp-cyan)' }} />
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                  {item.a}
                </div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
