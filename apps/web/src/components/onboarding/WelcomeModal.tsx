"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeModalProps {
  onGetStarted: () => void;
  onSkip: () => void;
}

export default function WelcomeModal({ onGetStarted, onSkip }: WelcomeModalProps) {
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
          className="w-full max-w-md rounded-[28px] p-8 sm:p-10 space-y-6 border shadow-2xl relative overflow-hidden"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
        >
          {/* Ambient brand glow */}
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl opacity-30"
            style={{ background: 'var(--gradient-primary-cta)' }}
          />

          <div className="relative space-y-5">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: 'var(--gradient-primary-cta)' }}>
              <Sparkles className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                👋 Welcome to AMAI!
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Your AI-powered social media assistant is ready to help you automate your content from upload to publishing.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Let's get everything set up in just a few minutes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={onGetStarted}
                className="flex-1 py-3.5 px-6 rounded-2xl text-white font-bold text-sm shadow-xl transition flex items-center justify-center space-x-2 touch-target"
                style={{ background: 'var(--gradient-primary-cta)', boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)' }}
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onSkip}
                className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm border transition touch-target"
                style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
              >
                Skip Tour
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
