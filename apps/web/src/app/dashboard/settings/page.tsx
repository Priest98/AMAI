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
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Approval mode, brand persona, and your account.</p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-[var(--radius-lg)] border text-xs font-semibold flex items-center space-x-2"
            style={{ backgroundColor: 'var(--accent-success-subtle)', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}
          >
            <Check className="h-4 w-4" />
            <span>{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="surface-tile p-1 flex space-x-2">
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
              className="relative flex-1 py-2.5 px-3 rounded-[var(--radius-md)] text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-2 touch-target"
              style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {isActive && (
                <motion.div
                  layoutId="settingsTabPill"
                  className="absolute inset-0 rounded-[var(--radius-md)]"
                  style={{ backgroundColor: 'var(--bg-surface-raised)', boxShadow: 'var(--elevation-1)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="h-3.5 w-3.5 relative z-10" style={{ color: isActive ? 'var(--accent-warning)' : 'var(--text-muted)' }} />
              <span className="relative z-10 truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'publishing' && (
        <div className="space-y-6">
          <div className="exec-card p-5 space-y-4">
            <div>
              <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Approval Mode</h3>
              <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Control whether AMAI-prepared posts require your review before publishing.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => handleTogglePublishingMode('MANUAL')}
                className="p-4 rounded-[var(--radius-lg)] border cursor-pointer transition-all duration-200 touch-target"
                style={approvalMode === 'MANUAL'
                  ? { borderColor: 'var(--accent-success)', backgroundColor: 'var(--accent-success-subtle)' }
                  : { borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>Manual Approval (Default)</span>
                  {approvalMode === 'MANUAL' && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--accent-success)' }} />}
                </div>
                <p className="text-caption leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Every post is placed into the Approval Queue for your review before publishing.
                </p>
              </div>

              <div
                onClick={() => handleTogglePublishingMode('AUTO')}
                className="p-4 rounded-[var(--radius-lg)] border cursor-pointer transition-all duration-200 touch-target"
                style={approvalMode === 'AUTO'
                  ? { borderColor: 'var(--accent-warning)', backgroundColor: 'var(--accent-warning-subtle)' }
                  : { borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>Auto Approval</span>
                  {approvalMode === 'AUTO' && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--accent-warning)' }} />}
                </div>
                <p className="text-caption leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Posts publish automatically during AI-selected peak engagement windows.
                </p>
              </div>
            </div>
          </div>

          <div className="exec-card p-5 space-y-4">
            <div>
              <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Brand Persona</h3>
              <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Sets the tone, vocabulary, and hashtags AMAI uses when writing captions.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {PERSONAS.map((persona, idx) => {
                const active = globalPersona === persona.tone;
                return (
                  <button
                    key={idx}
                    onClick={() => handlePersonaSelect(persona.tone)}
                    className="p-3 rounded-[var(--radius-lg)] border text-xs font-bold transition-all duration-200 text-left touch-target"
                    style={active
                      ? { borderColor: 'var(--accent-warning)', backgroundColor: 'var(--accent-warning-subtle)', color: 'var(--accent-warning)' }
                      : { borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }}
                  >
                    {persona.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="exec-card p-6 space-y-5">
          <div className="space-y-4">
            <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Your Account</h3>
            <div>
              <label className="block text-overline mb-2" style={{ color: 'var(--text-muted)' }}>Email Address</label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="input-field w-full opacity-70 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'help' && (
        <div className="exec-card p-6 space-y-5">
          <div className="space-y-1">
            <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Help & Support</h3>
            <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>New to AMAI, or just want a refresher? Replay the guided product tour any time.</p>
          </div>
          <button
            onClick={() => onboarding?.restartTour()}
            className="btn-primary-gradient px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-bold flex items-center space-x-2 touch-target"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Replay Product Tour</span>
          </button>
        </div>
      )}
    </div>
  );
}
