"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  User,
  Check,
  Zap,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'publishing' | 'workspace' | 'profile'>('publishing');
  
  // Publishing Mode (Manual Approval vs Auto-Publish)
  const [publishingMode, setPublishingMode] = useState<'MANUAL_APPROVAL' | 'AUTO_PUBLISH'>('MANUAL_APPROVAL');
  const [approvedPostCount, setApprovedPostCount] = useState<number>(10);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState<boolean>(true);

  // Global Niche & Persona Preset
  const [globalPersona, setGlobalPersona] = useState<string>('Fashion Designer');

  const [orgName, setOrgName] = useState('My Marketing Workspace');
  const [userEmail, setUserEmail] = useState('user@marketing-os.com');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Read from localStorage
    const savedMode = localStorage.getItem('amai_publishing_mode');
    if (savedMode === 'AUTO_PUBLISH') {
      setPublishingMode('AUTO_PUBLISH');
    }

    const savedCount = localStorage.getItem('amai_approved_count');
    if (savedCount) {
      setApprovedPostCount(parseInt(savedCount, 10));
    }

    const savedPersona = localStorage.getItem('amai_global_persona');
    if (savedPersona) {
      setGlobalPersona(savedPersona);
    }
  }, []);

  const handleTogglePublishingMode = (mode: 'MANUAL_APPROVAL' | 'AUTO_PUBLISH') => {
    setPublishingMode(mode);
    localStorage.setItem('amai_publishing_mode', mode);
    setMessage(`Publishing mode updated to ${mode === 'AUTO_PUBLISH' ? 'Auto-Publish' : 'Manual Approval'}`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEnableAutoPublishUnlock = () => {
    setPublishingMode('AUTO_PUBLISH');
    localStorage.setItem('amai_publishing_mode', 'AUTO_PUBLISH');
    setShowUnlockPrompt(false);
    setMessage('Auto-Publish mode enabled!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('amai_global_persona', globalPersona);
    setMessage('Settings saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 sm:pb-12">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Workspace Settings</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Configure publishing modes, global persona presets, and workspace preferences.</p>
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
          { id: 'publishing', label: 'Publishing Mode & Persona', icon: Zap },
          { id: 'workspace', label: 'Workspace', icon: Building },
          { id: 'profile', label: 'Profile', icon: User },
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

      {/* ── Tab 1: Publishing Mode & Global Persona ── */}
      {activeTab === 'publishing' && (
        <div className="space-y-6">
          
          {/* Unlock Prompt Banner when threshold reached */}
          {approvedPostCount >= 10 && publishingMode === 'MANUAL_APPROVAL' && showUnlockPrompt && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-rose-500/10 border border-purple-500/20 space-y-3"
            >
              <div className="flex items-start space-x-3">
                <div className="h-9 w-9 rounded-xl bg-purple-500 text-white flex items-center justify-center font-extrabold text-sm shadow-md shrink-0">
                  🎉
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                    You've approved 10 posts — want to turn on Auto-Publish so future posts go out automatically?
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Your account has reached the milestone threshold. You can enable hands-free auto-publishing anytime.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-1">
                <button
                  onClick={handleEnableAutoPublishUnlock}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl shadow-md transition touch-target"
                >
                  Enable Auto-Publish
                </button>

                <button
                  onClick={() => setShowUnlockPrompt(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition touch-target"
                >
                  Not now
                </button>
              </div>
            </motion.div>
          )}

          {/* Publishing Mode Toggle Box */}
          <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Account Publishing Mode</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Control whether AI-generated posts require manual human approval before dispatching.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Option 1: Manual Approval (Default) */}
              <div
                onClick={() => handleTogglePublishingMode('MANUAL_APPROVAL')}
                className={`p-4 rounded-xl border cursor-pointer transition touch-target ${
                  publishingMode === 'MANUAL_APPROVAL'
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-slate-200 dark:border-white/10'
                }`}
                style={{ backgroundColor: publishingMode === 'MANUAL_APPROVAL' ? undefined : 'var(--bg-surface)' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">Manual Approval Queue (Default)</span>
                  {publishingMode === 'MANUAL_APPROVAL' && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Every post is placed into the Approval Queue for manual review prior to publishing.
                </p>
              </div>

              {/* Option 2: Auto-Publish */}
              <div
                onClick={() => handleTogglePublishingMode('AUTO_PUBLISH')}
                className={`p-4 rounded-xl border cursor-pointer transition touch-target ${
                  publishingMode === 'AUTO_PUBLISH'
                    ? 'border-amber-500/60 bg-amber-500/10'
                    : 'border-slate-200 dark:border-white/10'
                }`}
                style={{ backgroundColor: publishingMode === 'AUTO_PUBLISH' ? undefined : 'var(--bg-surface)' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">Auto-Publish Mode</span>
                  {publishingMode === 'AUTO_PUBLISH' && (
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Posts are published automatically during peak engagement windows without waiting for manual approval.
                </p>
              </div>

            </div>
          </div>

          {/* Account Global Niche & Persona Preset */}
          <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Global Business Niche & Persona</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Select your business niche to customize AI caption tone, vocabulary, and hashtag generation.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {[
                { label: '👗 Fashion Designer', tone: 'Fashion Designer' },
                { label: '🛍️ Small Business Owner', tone: 'Small Business' },
                { label: '🍽️ Restaurant / Bistro', tone: 'Restaurant' },
                { label: '🏡 Real Estate & Realty', tone: 'Real Estate' },
                { label: '💄 Beauty & Skincare', tone: 'Beauty' },
                { label: '💪 Fitness & Health', tone: 'Fitness' },
              ].map((persona, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setGlobalPersona(persona.tone);
                    localStorage.setItem('amai_global_persona', persona.tone);
                  }}
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

      {/* Tab 2: Workspace */}
      {activeTab === 'workspace' && (
        <form onSubmit={handleSave} className="rounded-2xl border p-6 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Workspace Preferences</h3>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full p-3 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-amber-500/50"
                style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl shadow-md transition touch-target"
            >
              Save Preferences
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="rounded-2xl border p-6 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">User Account</h3>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full p-3 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-amber-500/50"
                style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl shadow-md transition touch-target"
            >
              Save Profile
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
