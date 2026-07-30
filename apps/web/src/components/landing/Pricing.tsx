"use client";

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

const TIERS = [
  {
    name: 'Starter',
    price: '$19',
    period: '/mo',
    description: 'For creators posting consistently on one or two platforms.',
    features: [
      '1 connected brand',
      'Instagram + TikTok publishing',
      'AI captions & hashtags',
      'Approval Queue',
      '50 posts / month',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    description: 'For teams and brands automating their whole content pipeline.',
    features: [
      '3 connected brands',
      'Instagram + TikTok publishing',
      'AI captions, hashtags & scoring',
      'Google Drive auto-sync',
      'Smart scheduling',
      'Unlimited posts',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Agency',
    price: '$149',
    period: '/mo',
    description: 'For agencies managing multiple clients from one workspace.',
    features: [
      'Unlimited connected brands',
      'Everything in Pro',
      'Team member roles',
      'Priority support',
      'Custom onboarding',
    ],
    cta: 'Talk to Us',
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32" aria-label="Pricing">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Simple pricing, no surprises
          </h2>
          <p className="mt-4 text-sm" style={{ color: 'var(--lp-text-secondary)' }}>
            Every plan includes the full AMAI Engine pipeline. Upgrade as you grow.
          </p>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-3 gap-6 items-start">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 0.08}>
              <div
                className="lp-card h-full p-8 flex flex-col relative"
                style={
                  tier.highlighted
                    ? { borderColor: 'var(--lp-cyan)', boxShadow: '0 0 0 1px var(--lp-cyan), 0 20px 60px -20px rgba(57,231,255,0.35)' }
                    : undefined
                }
              >
                {tier.highlighted && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'var(--lp-gradient-brand)', color: '#04070D' }}
                  >
                    Most Popular
                  </span>
                )}
                <h3 className="lp-heading font-bold text-lg">{tier.name}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                  {tier.description}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="lp-heading text-4xl font-bold">{tier.price}</span>
                  <span className="text-sm" style={{ color: 'var(--lp-text-muted)' }}>{tier.period}</span>
                </div>

                <ul className="mt-6 space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--lp-cyan)' }} />
                      <span style={{ color: 'var(--lp-text-secondary)' }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`mt-8 text-center px-5 py-3 rounded-xl text-sm lp-focus-ring ${tier.highlighted ? 'lp-btn-primary' : 'lp-btn-ghost font-semibold'}`}
                >
                  {tier.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
