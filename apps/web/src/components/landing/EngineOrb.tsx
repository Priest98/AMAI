"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Instagram, Video, Facebook, Youtube, Music2 } from 'lucide-react';

const PLATFORMS = [
  { Icon: Instagram, color: '#E1306C', angle: 0 },
  { Icon: Music2, color: '#FE2C55', angle: 72 },
  { Icon: Facebook, color: '#3B82F6', angle: 144 },
  { Icon: Youtube, color: '#EF4444', angle: 216 },
  { Icon: Video, color: '#7FB0DB', angle: 288 },
];

/**
 * The hero's "Oyinca" visualization: social platform icons orbiting a
 * glowing, pulsing AI core with animated connection lines. Built with CSS
 * keyframes + SVG rather than Three.js/WebGL — it reads the same as a 3D
 * orbit at a fraction of the risk (no GPU dependency, no new heavy
 * dependency to verify inside a build pipeline this session can't run
 * locally), and respects prefers-reduced-motion automatically.
 */
export default function EngineOrb() {
  const radius = 150;

  return (
    <div
      className="relative mx-auto"
      style={{ width: 340, height: 340 }}
      role="img"
      aria-label="Animated diagram: Instagram, TikTok, Facebook, YouTube and other platforms orbiting a glowing Oyinca core, representing Oyinca automating publishing across every connected platform."
    >
      {/* Ambient glow behind everything */}
      <div
        className="absolute inset-0 rounded-full lp-animate-glow"
        style={{ background: 'var(--lp-gradient-glow)', filter: 'blur(20px)' }}
      />

      {/* Connection lines (SVG), counter-rotating slowly for a subtle "data flow" feel */}
      <svg
        className="absolute inset-0 lp-animate-orbit-reverse"
        style={{ animationDuration: '40s' }}
        viewBox="0 0 340 340"
        fill="none"
      >
        {PLATFORMS.map((p, i) => {
          const rad = (p.angle * Math.PI) / 180;
          const x = 170 + radius * Math.cos(rad);
          const y = 170 + radius * Math.sin(rad);
          return (
            <line
              key={i}
              x1={170}
              y1={170}
              x2={x}
              y2={y}
              stroke="url(#lp-line-gradient)"
              strokeWidth="1.5"
              strokeDasharray="4 5"
              opacity="0.55"
            />
          );
        })}
        <defs>
          <linearGradient id="lp-line-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7FB0DB" />
            <stop offset="100%" stopColor="#1A3D63" />
          </linearGradient>
        </defs>
      </svg>

      {/* Core */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative flex items-center justify-center rounded-full lp-animate-pulse-core"
          style={{
            width: 92,
            height: 92,
            background: 'var(--lp-gradient-brand)',
            boxShadow: '0 0 60px rgba(127, 176, 219, 0.55), 0 0 120px rgba(26, 61, 99, 0.4)',
          }}
        >
          <span className="text-[#04070D] font-extrabold text-sm lp-heading tracking-tight">Oyinca</span>
        </motion.div>
      </div>

      {/* Orbiting platform icons — outer ring rotates, each icon counter-rotates to stay upright */}
      <div className="absolute inset-0 lp-animate-orbit">
        {PLATFORMS.map(({ Icon, color, angle }, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = 170 + radius * Math.cos(rad) - 22;
          const y = 170 + radius * Math.sin(rad) - 22;
          return (
            <div
              key={i}
              className="absolute lp-animate-counter-orbit"
              style={{ left: x, top: y, width: 44, height: 44 }}
            >
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center lp-glass lp-animate-float"
                style={{ borderColor: 'rgba(255,255,255,0.14)', animationDelay: `${i * 0.4}s` }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
