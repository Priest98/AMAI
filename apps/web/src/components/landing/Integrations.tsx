"use client";

import React from 'react';
import { Camera, Music2, HardDrive, ArrowRight } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';

/**
 * Deliberately uses generic, abstracted glyphs (camera / music-note /
 * drive) rather than reproductions of Instagram's, TikTok's, or Google's
 * actual trademarked logomarks -- avoids any brand-asset/trademark issue
 * while still reading immediately as "photo platform / short-video
 * platform / cloud storage" at a glance.
 */
const INTEGRATIONS = [
  {
    icon: Camera,
    name: 'Instagram',
    description: 'Auto-crop, caption, and publish Reels and posts to your connected account.',
    accent: 'var(--lp-cyan)',
  },
  {
    icon: Music2,
    name: 'TikTok',
    description: 'Publish directly to TikTok with AI-optimized captions and posting times.',
    accent: 'var(--lp-purple)',
  },
  {
    icon: HardDrive,
    name: 'Google Drive',
    description: 'Point Oyinca at a watched folder, and new media is picked up automatically.',
    accent: 'var(--lp-cyan)',
  },
];

export default function Integrations() {
  return (
    <section id="integrations" className="relative py-24 sm:py-32" aria-label="Integrations">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>Connected, not complicated</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Works with the platforms you already use
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
            Connect once. Oyinca handles the rest across every account.
          </p>
        </Reveal>

        <div className="mt-16 grid sm:grid-cols-3 gap-5">
          {INTEGRATIONS.map((item, i) => (
            <Reveal key={item.name} delay={i * 0.08}>
              <div className="lp-card lp-hover-glow h-full p-7 group">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center"
                  style={{ background: `color-mix(in srgb, ${item.accent} 16%, transparent)` }}
                >
                  <item.icon className="h-6 w-6" style={{ color: item.accent }} />
                </div>
                <h3 className="lp-heading mt-5 text-lg font-bold">{item.name}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                  {item.description}
                </p>
                <div
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: item.accent }}
                >
                  Connect in Settings
                  <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
