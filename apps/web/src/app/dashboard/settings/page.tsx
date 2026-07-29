"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { brandFetch, getCurrentUser } from '@/lib/api';
import { useOnboarding } from '@/components/onboarding/OnboardingContext';
import {
  Building,
  User,
  Check,
  Zap,
  LifeBuoy,
  RotateCcw,
} from 'lucide-react';

type ApprovalMode = 'MANUAL' | 'AUTO';

const PERSONAS = [
  { label: '👗 Fashion Designer', tone: 'Fashion Designer' },
  { label: '🛍️ Small Business Owner', tone: 'Small Business' },
  { label: '🍽️ Restaurant / Bistro', tone: 'Restaurant' },
  { label: '🏡 Real Estate & Realty', tone: 'Real Estate' },
  { label: '💄 Beauty & Skincare', tone: 'Beauty' },
  { label: '💪 Fitness & Health', tone: 'Fitness' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'publishing' | 'profile' | 'help'>('publishing');
  const onboarding = useOnboarding();
  const [approvalMode, setApprovalModeState] = useState<ApprovalMode>('MANUAL');
  const [globalPersona, setGlobalPersona] = useState<string>('Fashion Designer');
  const [userEmail, setUserEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setUserEmail(user.email);

    brandFetch<{ approvalMode: ApprovalMode; defaultTone: string }>('/engine/state')
      .then((cfg) => {
        setApprovalModeState(cfg.approvalMode);
        if (cfg.defaultTone) setGlobalPersona(cfg.defaultTone);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const handleTogglePublishingMode = async (mode: ApprovalMode) => {
    setApprovalModeState(mode);
    try {
      await brandFetch('/engine/approval-mode', { method: 'PATCH', body: JSON.stringify({ approvalMode: mode }) });
      flash(`Approval mode updated to ${mode === 'AUTO' ? 'Auto Approval' : 'Manual Approval'}.`);
    } catch (e: any) {
      flash(e.message || 'Could not update approval mode.');
    }
  };

  const handlePersonaSelect = async (tone: string) => {
    setGlobalPersona(tone);
    try {
      await brandFetch('/engine/config', { method: 'PATCH', body: JSON.stringify({ defaultTone: tone }) });
      flash('Persona updated.');
    } catch (e: any) {
      flash(e.message || 'Could not update persona.');
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>Loading settings…</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 sm:pb-12">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Approval mode, brand persona, and your account.</p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center space-x-2"
          >
            <Check className="h-4 w-4 text-emerald-500" />
            <span>{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="p-1 rounded-xl border flex space-x-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
        {[
          { id: 'publishing', label: 'Approval Mode & Persona', icon: Zap },
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'help', label: 'Help & Support', icon: LifeBuoy },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 touch-target ${
                isActive ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="settingsTabPill"
                  className="absolute inset-0 rounded-lg bg-slate-100 dark:bg-white/10 dark:border dark:border-white/10 shadow-xs"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`h-3.5 w-3.5 relative z-10 ${isActive ? 'text-amber-400' : 'text-slate-400 dark:text-zinc-400'}`} />
              <span className="relative z-10 truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'publishing' && (
        <div className="space-y-6">
          <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Approval Mode</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Control whether AMAI-prepared posts require your review before publishing.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => handleTogglePublishingMode('MANUAL')}
                className={`p-4 rounded-xl border cursor-pointer transition touch-target ${
                  approvalMode === 'MANUAL' ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-200 dark:border-white/10'
                }`}
                style={{ backgroundColor: approvalMode === 'MANUAL' ? undefined : 'var(--bg-surface)' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">Manual Approval (Default)</span>
                  {approvalMode === 'MANUAL' && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Every post is placed into the Approval Queue for your review before publishing.
                </p>
              </div>

              <div
                onClick={() => handleTogglePublishingMode('AUTO')}
                className={`p-4 rounded-xl border cursor-pointer transition touch-target ${
                  approvalMode === 'AUTO' ? 'border-amber-500/60 bg-amber-500/10' : 'border-slate-200 dark:border-white/10'
                }`}
                style={{ backgroundColor: approvalMode === 'AUTO' ? undefined : 'var(--bg-surface)' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">Auto Approval</span>
                  {approvalMode === 'AUTO' && <span className="h-2 w-2 rounded-full bg-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Posts publish automatically during AI-selected peak engagement windows.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Brand Persona</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Sets the tone, vocabulary, and hashtags AMAI uses when writing captions.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {PERSONAS.map((persona, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePersonaSelect(persona.tone)}
                  className={`p-3 rounded-xl border text-xs font-bold transition text-left touch-target ${
                    globalPersona === persona.tone
                      ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                      : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300'
                  }`}
                  style={{ backgroundColor: globalPersona === persona.tone ? undefined : 'var(--bg-surface-raised)' }}
                >
                  {persona.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="rounded-2xl border p-6 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Your Account</h3>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="w-full p-3 rounded-xl border text-xs outline-none opacity-70 cursor-not-allowed"
                style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'help' && (
        <div className="rounded-2xl border p-6 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Help & Support</h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>New to AMAI, or just want a refresher? Replay the guided product tour any time.</p>
          </div>
          <button
            onClick={() => onboarding?.restartTour()}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center space-x-2 shadow-md transition touch-target"
            style={{ background: 'var(--gradient-primary-cta)' }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Replay Product Tour</span>
          </button>
        </div>
      )}
    </div>
  );
}
