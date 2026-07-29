"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassmorphicToggle from '@/components/ui/GlassmorphicToggle';
import { brandFetch } from '@/lib/api';
import { useEngineEvents, EngineEvent } from '@/lib/useEngineEvents';
import {
  Zap,
  Pause,
  CheckCircle2,
  Users,
  Sparkles,
  AlertTriangle,
  Activity,
} from 'lucide-react';

type EngineState = 'ACTIVE' | 'PAUSED';
type ApprovalMode = 'MANUAL' | 'AUTO';

interface EngineConfig {
  id: string;
  brandId: string;
  state: EngineState;
  approvalMode: ApprovalMode;
  defaultTone: string;
}

const PERSONAS = [
  '👗 Fashion Designer', '🛍️ Small Business', '🍽️ Restaurant', '🏡 Real Estate', '💄 Beauty', '💪 Fitness', '🎥 Content Creator',
];

export default function AmaiEnginePage() {
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);
  const [activity, setActivity] = useState<EngineEvent[]>([]);

  const load = useCallback(async () => {
    try {
      const [cfg, events] = await Promise.all([
        brandFetch<EngineConfig>('/engine/state'),
        brandFetch<EngineEvent[]>('/engine/activity'),
      ]);
      setConfig(cfg);
      setActivity(events);
    } catch (e: any) {
      setMessage(e.message || 'Could not load the AMAI Engine status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEngineEvents((event) => {
    setActivity((prev) => [event, ...prev].slice(0, 30));
  });

  const showToast = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const toggleState = async (checked: boolean) => {
    if (!config) return;
    const next: EngineState = checked ? 'ACTIVE' : 'PAUSED';
    setConfig({ ...config, state: next });
    setSaving(true);
    try {
      await brandFetch('/engine/state', { method: 'PATCH', body: JSON.stringify({ state: next }) });
      showToast(next === 'ACTIVE' ? 'AMAI Engine is now Active.' : 'AMAI Engine is now Paused.');
    } catch (e: any) {
      showToast(e.message || 'Could not update the AMAI Engine.');
      setConfig(config); // revert on failure
    } finally {
      setSaving(false);
    }
  };

  const applyApprovalMode = async (mode: ApprovalMode) => {
    if (!config) return;
    setConfig({ ...config, approvalMode: mode });
    setSaving(true);
    try {
      await brandFetch('/engine/approval-mode', { method: 'PATCH', body: JSON.stringify({ approvalMode: mode }) });
      showToast(mode === 'AUTO' ? 'Auto Approval enabled.' : 'Manual Approval enabled.');
    } catch (e: any) {
      showToast(e.message || 'Could not update approval mode.');
    } finally {
      setSaving(false);
      setShowAutoConfirm(false);
    }
  };

  const setApprovalMode = (mode: ApprovalMode) => {
    if (mode === 'AUTO' && config?.approvalMode !== 'AUTO') {
      setShowAutoConfirm(true);
      return;
    }
    applyApprovalMode(mode);
  };

  const setTone = async (tone: string) => {
    if (!config) return;
    setConfig({ ...config, defaultTone: tone });
    try {
      await brandFetch('/engine/config', { method: 'PATCH', body: JSON.stringify({ defaultTone: tone }) });
    } catch (e: any) {
      showToast(e.message || 'Could not update persona.');
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>Loading AMAI Engine…</div>;
  }

  const isActive = config?.state === 'ACTIVE';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 sm:pb-12">
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>AMAI Engine</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          The brain of your workspace — it watches for new content and runs your publishing workflow automatically.
        </p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Engine State Card ── */}
      <div
        className="rounded-2xl border p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
      >
        <div className="flex items-start space-x-4">
          <div
            className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: isActive ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.06)' }}
          >
            {isActive ? <Zap className="h-5 w-5 text-emerald-400" /> : <Pause className="h-5 w-5 text-slate-400" />}
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {isActive ? 'AMAI Active' : 'AMAI Paused'}
            </h2>
            <p className="text-xs mt-1 max-w-md leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {isActive
                ? 'The AMAI Engine is monitoring your content and automating your publishing workflow.'
                : 'The AMAI Engine will continue preparing your content, but nothing will be published automatically.'}
            </p>
          </div>
        </div>

        <GlassmorphicToggle
          checked={isActive}
          onChange={toggleState}
          ariaLabel="Toggle AMAI Engine"
        />
      </div>

      {/* ── Approval Mode ── */}
      <div data-tour="tour-engine-mode" className="rounded-2xl border p-5 sm:p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
        <div>
          <h3 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Approval Mode</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Decide whether every prepared post needs your review, or publishes automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setApprovalMode('MANUAL')}
            className={`p-4 rounded-xl border text-left transition touch-target ${
              config?.approvalMode === 'MANUAL' ? 'border-emerald-500/60 bg-emerald-500/10' : ''
            }`}
            style={{ backgroundColor: config?.approvalMode === 'MANUAL' ? undefined : 'var(--bg-surface-raised)', borderColor: config?.approvalMode === 'MANUAL' ? undefined : 'var(--card-border)' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>Manual Approval (Default)</span>
              {config?.approvalMode === 'MANUAL' && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Every prepared post moves into the Approval Queue. Nothing publishes until you approve it.
            </p>
          </button>

          <button
            onClick={() => setApprovalMode('AUTO')}
            className={`p-4 rounded-xl border text-left transition touch-target ${
              config?.approvalMode === 'AUTO' ? 'border-amber-500/60 bg-amber-500/10' : ''
            }`}
            style={{ backgroundColor: config?.approvalMode === 'AUTO' ? undefined : 'var(--bg-surface-raised)', borderColor: config?.approvalMode === 'AUTO' ? undefined : 'var(--card-border)' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>Auto Approval</span>
              {config?.approvalMode === 'AUTO' && <span className="h-2 w-2 rounded-full bg-amber-400" />}
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Posts schedule and publish automatically at the AI-selected best time. No queue required.
            </p>
          </button>
        </div>
      </div>

      {/* ── Persona / Tone ── */}
      <div className="rounded-2xl border p-5 sm:p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
        <div>
          <h3 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Brand Persona</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Shapes the tone, vocabulary, and hashtags AMAI uses when writing your captions.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PERSONAS.map((p) => {
            const tone = p.replace(/^[^\s]+\s/, '');
            const active = config?.defaultTone === tone;
            return (
              <button
                key={p}
                onClick={() => setTone(tone)}
                className={`p-3 rounded-xl border text-xs font-bold transition text-left touch-target ${active ? 'border-amber-500/60 bg-amber-500/10 text-amber-400' : ''}`}
                style={{ backgroundColor: active ? undefined : 'var(--bg-surface-raised)', borderColor: active ? undefined : 'var(--card-border)', color: active ? undefined : 'var(--text-primary)' }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Live Activity ── */}
      <div data-tour="tour-engine-activity" className="rounded-2xl border p-5 sm:p-6 space-y-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Live Activity</h3>
        </div>
        {activity.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
            Nothing yet — upload media and the AMAI Engine will start working.
          </p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {activity.map((e) => (
              <li key={e.id} className="text-xs flex items-start justify-between gap-3 py-1.5 border-b" style={{ borderColor: 'var(--card-border)' }}>
                <span style={{ color: 'var(--text-primary)' }}>{e.message || e.type}</span>
                <span className="shrink-0 text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(e.createdAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Auto Approval confirmation modal ── */}
      <AnimatePresence>
        {showAutoConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAutoConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border p-6 space-y-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
            >
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>Enable Auto Approval?</h3>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  New posts will publish automatically at the AI-selected best time — no review step. You can switch back to Manual Approval anytime.
                </p>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button onClick={() => setShowAutoConfirm(false)} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button
                  onClick={() => applyApprovalMode('AUTO')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-md"
                >
                  Enable Auto Approval
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
