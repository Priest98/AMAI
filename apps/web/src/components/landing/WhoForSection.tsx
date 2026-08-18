"use client";

import React from 'react';
import { Store, Sparkles, Users } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

const CARDS = [
  {
    Icon: Store,
    title: 'Small Business Owners',
    body: 'Spend less time managing social media and more time running your business.',
  },
  {
    Icon: Sparkles,
    title: 'Creators & Personal Brands',
    body: 'Keep your content pipeline moving without living inside your content calendar.',
  },
  {
    Icon: Users,
    title: 'Agencies',
    body: 'Manage multiple businesses, content pipelines and social accounts from one system.',
  },
];

export default function WhoForSection() {
  return (
    <section className="relative py-24 sm:py-28" aria-label="Who AMAI is for">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="lp-heading text-3xl sm:text-4xl font-bold tracking-tight">
            Built for people who have better things to do.
          </h2>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-3 gap-5">
          {CARDS.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.08}>
              <div className="lp-card h-full p-6 flex flex-col gap-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--lp-purple-soft)' }}>
                  <card.Icon className="h-5 w-5" style={{ color: 'var(--lp-purple)' }} />
                </div>
                <h3 className="lp-heading font-bold text-[15px]">{card.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>{card.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
