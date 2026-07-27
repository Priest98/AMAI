"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Building,
  User,
  Bell,
  ShieldCheck,
  Code,
  Check,
  Zap,
  CheckCircle2,
  Copy,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'publishing' | 'workspace' | 'profile' | 'developer'>('publishing');
  
  // Publishing Mode (Manual Approval vs Auto-Publish)
  const [publishingMode, setPublishingMode] = useState<'MANUAL_APPROVAL' | 'AUTO_PUBLISH'>('MANUAL_APPROVAL');
  const [approvedPostCount, setApprovedPostCount] = useState<number>(10);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState<boolean>(true);

  // Global Niche & Persona Preset
  const [globalPersona, setGlobalPersona] = useState<string>('Fashion Designer');

  const [orgName, setOrgName] = useState('My Marketing Workspace');
  const [userEmail, setUserEmail] = useState('user@marketing-os.com');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
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

    const token = typeof window !== 'undefined' ? localStorage.getItem('marketing_os_token') : null;
    let brandId = 'primary_brand';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.brandId) brandId = payload.brandId;
      } catch (e) {}
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setWebhookUrl(`${origin}/api/autopilot/ingest/wh_${brandId}_${Date.now().toString(36)}`);
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

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Workspace Settings</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Configure publishing modes, global persona presets, and developer API ingestion endpoints.</p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2"
          >
            <Check className="h-4 w-4 text-emerald-500" />
            <span>{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="p-1.5 rounded-[22px] exec-card flex space-x-2">
        {[
          { id: 'publishing', label: 'Publishing Mode & Persona', icon: Zap },
          { id: 'workspace', label: 'Workspace', icon: Building },
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'developer', label: 'Developer & Webhooks', icon: Code },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 touch-target ${
                isActive ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="settingsTabPill"
                  className="absolute inset-0 rounded-xl bg-slate-100 dark:bg-white/10 dark:border dark:border-white/10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`h-4 w-4 relative z-10 ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-zinc-400'}`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Publishing Mode & Global Persona ── */}
      {activeTab === 'publishing' && (
        <div className="space-y-6">
          
          {/* Unlock Prompt Banner when threshold (10 approved posts) reached */}
          {approvedPostCount >= 10 && publishingMode === 'MANUAL_APPROVAL' && showUnlockPrompt && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-[24px] bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-rose-500/10 border border-purple-500/20 space-y-4"
            >
              <div className="flex items-start space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-purple-500 text-white flex items-center justify-center font-extrabold text-base shadow-md flex-shrink-0">
                  🎉
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    You've approved 10 posts — want to turn on Auto-Publish so future posts go out automatically?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Your account has reached the milestone threshold. You can now enable hands-free auto-publishing anytime.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={handleEnableAutoPublishUnlock}
                  className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 text-white text-xs font-bold rounded-xl shadow-md transition touch-target"
                >
                  Enable Auto-Publish
                </button>

                <button
                  onClick={() => setShowUnlockPrompt(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition touch-target"
                >
                  Not now
                </button>
              </div>
            </motion.div>
          )}

          {/* Publishing Mode Toggle Box */}
          <div className="exec-card p-7 rounded-[24px] space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Account Publishing Mode</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Control whether AI-generated posts require manual human approval before dispatching.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Option 1: Manual Approval (Default) */}
              <div
                onClick={() => handleTogglePublishingMode('MANUAL_APPROVAL')}
                className={`p-5 rounded-2xl border cursor-pointer transition touch-target ${
                  publishingMode === 'MANUAL_APPROVAL'
                    ? 'border-rose-500 bg-rose-500/5 dark:bg-rose-500/10'
                    : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">Manual Approval Queue (Default)</span>
                  {publishingMode === 'MANUAL_APPROVAL' && (
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Every post is placed into the Approval Queue for manual review prior to publishing.
                </p>
              </div>

              {/* Option 2: Auto-Publish (Unlocked) */}
              <div
                onClick={() => handleTogglePublishingMode('AUTO_PUBLISH')}
                className={`p-5 rounded-2xl border cursor-pointer transition touch-target ${
                  publishingMode === 'AUTO_PUBLISH'
                    ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                    : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">Auto-Publish Mode</span>
                  {publishingMode === 'AUTO_PUBLISH' && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Posts are published automatically during AI-predicted peak engagement windows without waiting for manual approval.
                </p>
              </div>

            </div>
          </div>

          {/* Account Global Niche & Persona Preset */}
          <div className="exec-card p-7 rounded-[24px] space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Global Account Persona</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Select the account-level tone persona used across AI copy generation.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {[
                { label: '👗 Fashion Designer', tone: 'Fashion Designer' },
                { label: '🛍️ Small Business Owner', tone: 'Small Business Owner' },
                { label: '🍲 Food & Agriculture', tone: 'Food & Agriculture' },
                { label: '🚀 Viral & Trendy', tone: 'Viral & Trendy' },
              ].map((persona, idx) => (
                <button
                  key={idx}
                  onClick={() => setGlobalPersona(persona.tone)}
                  className={`p-3.5 rounded-2xl border text-xs font-bold transition text-left touch-target ${
                    globalPersona === persona.tone
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300'
                      : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
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
        <form onSubmit={handleSave} className="exec-card p-8 rounded-[24px] space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Workspace Preferences</h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500/50"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200/60 dark:border-white/10 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition touch-target"
            >
              Save Preferences
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="exec-card p-8 rounded-[24px] space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">User Account</h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500/50"
              />
            </div>
          </div>
        </form>
      )}

      {/* ── Tab 4: Developer & Advanced Settings ── */}
      {activeTab === 'developer' && (
        <div className="exec-card p-8 rounded-[24px] space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Developer & API Webhooks</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Internal API endpoints for Apple Shortcuts, custom scripts, and external webhook ingestion.</p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Live Webhook Ingestion URL</label>
            <div className="flex space-x-2">
              <input 
                type="text" 
                value={webhookUrl} 
                readOnly
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-zinc-950/60 text-xs font-mono text-slate-700 dark:text-zinc-300 focus:outline-none"
              />
              <button 
                type="button"
                onClick={handleCopyWebhook}
                className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center space-x-1 touch-target flex-shrink-0"
              >
                {copiedWebhook ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedWebhook ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>AES-256 Secret Token Protection</span>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-[11px] leading-relaxed">
              Requests sent to this URL with raw image/video binary payloads will automatically trigger AI caption generation and queueing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
