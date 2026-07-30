"use client";

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

const FAQS = [
  {
    q: 'Do I need to write anything myself?',
    a: 'No — AMAI generates the caption, hashtags, and content score automatically. You can edit any of it in the Approval Queue before it goes out, but nothing requires you to write from scratch.',
  },
  {
    q: 'Which platforms does AMAI publish to?',
    a: 'Instagram and TikTok today, with more platforms on the roadmap. Every post can target one or both platforms from a single upload.',
  },
  {
    q: 'What happens if I don’t approve a post?',
    a: 'Nothing gets published without your approval. Posts sit in the Approval Queue until you approve, edit, reject, or schedule them — AMAI never publishes on your behalf without that step.',
  },
  {
    q: 'Can I connect Google Drive instead of uploading manually?',
    a: 'Yes. Point AMAI at a watched Drive folder and new media is picked up automatically, no manual export or re-upload needed.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Every plan starts with a free trial and no credit card required. You can cancel anytime from Settings.',
  },
  {
    q: 'How does content scoring work?',
    a: 'Each post is scored based on caption quality, hashtag relevance, and platform fit before it reaches your Approval Queue, so you can prioritize what to review first.',
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="relative py-24 sm:py-32" aria-label="Frequently asked questions">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Questions, answered
          </h2>
        </Reveal>

        <div className="mt-12 space-y-3">
          {FAQS.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.04}>
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
