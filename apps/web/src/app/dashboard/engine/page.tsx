"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassmorphicToggle from '@/components/ui/GlassmorphicToggle';
import EngineWorkflowVisualization from '@/components/engine/EngineWorkflowVisualization';
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
  CalendarClock,
  Globe2,
} from 'lucide-react';

type EngineState = 'ACTIVE' | 'PAUSED';
type ApprovalMode = 'MANUAL' | 'AUTO';
type ScheduleStartOption = 'TODAY' | 'TOMORROW' | 'CUSTOM';
type SchedulingPlatform = 'INSTAGRAM' | 'TIKTOK' | 'BOTH';

interface EngineConfig {
  id: string;
  brandId: string;
  state: EngineState;
  approvalMode: ApprovalMode;
  defaultTone: string;
  postsPerDay: number;
  scheduleStartFrom: ScheduleStartOption;
  customStartDate: string | null;
  timeZone: string;
  schedulingPlatform: SchedulingPlatform;
}

const COMMON_TIME_ZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Africa/Lagos', 'Africa/Cairo', 'Africa/Johannesburg', 'Asia/Dubai', 'Asia/Kolkata',
  'Asia/Bangkok', 'Asia/Singapore', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney',
];

function timeZoneOptions(): string[] {
  try {
    // @ts-ignore -- supportedValuesOf isn't in older TS lib targets
    const all: string[] = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    return all.length > 0 ? all : COMMON_TIME_ZONES;
  } catch {
    return COMMON_TIME_ZONES;
  }
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

  // One-time nudge: if the saved time zone is still the default (meaning
  // it's never been explicitly set), suggest the browser's detected zone.
  // Doesn't fire again once the config actually has a real value saved.
  useEffect(() => {
    if (!config || config.timeZone !== 'UTC') return;
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && detected !== 'UTC') {
        savePostingSchedule({ timeZone: detected });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id]);

  const savePostingSchedule = async (patch: Partial<Pick<EngineConfig, 'postsPerDay' | 'scheduleStartFrom' | 'customStartDate' | 'timeZone' | 'schedulingPlatform'>>) => {
    if (!config) return;
    const next = { ...config, ...patch };
    setConfig(next);
    setSaving(true);
    try {
      await brandFetch('/engine/posting-schedule', { method: 'PATCH', body: JSON.stringify(patch) });
    } catch (e: any) {
      showToast(e.message || 'Could not update the Posting Schedule.');
      setConfig(config); // revert on failure
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>Loading AMAI Engine…</div>;
  }

  const isActive = config?.state === 'ACTIVE';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 sm:pb-12">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>AMAI Engine</h1>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
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

      {/* ── AMAI Engine live workflow — the product's visual centerpiece ── */}
      <div data-tour="tour-engine-activity">
        <EngineWorkflowVisualization />
      </div>

      {/* ── Main Engine State Card ── */}
      <div className="exec-card p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
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
      <div data-tour="tour-engine-mode" className="exec-card p-5 sm:p-6 space-y-4">
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
      <div className="exec-card p-5 sm:p-6 space-y-4">
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

      {/* ── Posting Schedule (AI publishing calendar) ── */}
      <div className="exec-card p-5 sm:p-6 space-y-5">
        <div className="flex items-center space-x-2">
          <CalendarClock className="h-4 w-4 text-indigo-400" />
          <div>
            <h3 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Posting Schedule</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              How many posts to publish per day and when — AMAI builds the full calendar automatically as you upload media.
            </p>
          </div>
        </div>

        {/* Posts per day */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Posts per day</label>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = config?.postsPerDay === n;
              return (
                <button
                  key={n}
                  onClick={() => savePostingSchedule({ postsPerDay: n })}
                  className={`py-2.5 rounded-xl border text-sm font-extrabold transition touch-target ${active ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-400' : ''}`}
                  style={{ backgroundColor: active ? undefined : 'var(--bg-surface-raised)', borderColor: active ? undefined : 'var(--card-border)', color: active ? undefined : 'var(--text-primary)' }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>Maximum 5 posts per day.</p>
        </div>

        {/* Start scheduling from */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Start scheduling from</label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(['TODAY', 'TOMORROW', 'CUSTOM'] as ScheduleStartOption[]).map((opt) => {
              const active = config?.scheduleStartFrom === opt;
              return (
                <button
                  key={opt}
                  onClick={() => savePostingSchedule({ scheduleStartFrom: opt })}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-extrabold transition touch-target ${active ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-400' : ''}`}
                  style={{ backgroundColor: active ? undefined : 'var(--bg-surface-raised)', borderColor: active ? undefined : 'var(--card-border)', color: active ? undefined : 'var(--text-primary)' }}
                >
                  {opt === 'TODAY' ? 'Today' : opt === 'TOMORROW' ? 'Tomorrow' : 'Custom Date'}
                </button>
              );
            })}
          </div>
          {config?.scheduleStartFrom === 'CUSTOM' && (
            <input
              type="date"
              value={config?.customStartDate ? config.customStartDate.slice(0, 10) : ''}
              onChange={(e) => savePostingSchedule({ customStartDate: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : null })}
              className="mt-2 w-full px-3 py-2 rounded-xl border text-xs font-semibold"
              style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            />
          )}
        </div>

        {/* Time zone */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <Globe2 className="h-3 w-3" /> Time zone
          </label>
          <select
            value={config?.timeZone || 'UTC'}
            onChange={(e) => savePostingSchedule({ timeZone: e.target.value })}
            className="mt-2 w-full px-3 py-2 rounded-xl border text-xs font-semibold"
            style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
          >
            {timeZoneOptions().map((tz) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Platforms */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Platforms</label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(['INSTAGRAM', 'TIKTOK', 'BOTH'] as SchedulingPlatform[]).map((p) => {
              const active = config?.schedulingPlatform === p;
              return (
                <button
                  key={p}
                  onClick={() => savePostingSchedule({ schedulingPlatform: p })}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-extrabold transition touch-target ${active ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-400' : ''}`}
                  style={{ backgroundColor: active ? undefined : 'var(--bg-surface-raised)', borderColor: active ? undefined : 'var(--card-border)', color: active ? undefined : 'var(--text-primary)' }}
                >
                  {p === 'INSTAGRAM' ? 'Instagram' : p === 'TIKTOK' ? 'TikTok' : 'Both'}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            "Both" alternates between Instagram's and TikTok's best-time tables across your calendar.
          </p>
        </div>
      </div>

      {/* ── Activity history ── */}
      <div className="exec-card p-5 sm:p-6 space-y-3">
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />
          <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Activity history</h3>
        </div>
        {activity.length === 0 ? (
          <p className="text-body-sm py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
            Nothing yet — upload media and the AMAI Engine will start working.
          </p>
        ) : (
          <ul className="space-y-1 max-h-80 overflow-y-auto">
            {activity.map((e) => (
              <li
                key={e.id}
                className="text-body-sm flex items-start justify-between gap-3 py-2 border-b last:border-b-0"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <span style={{ color: 'var(--text-primary)' }}>{e.message || e.type}</span>
                <span className="shrink-0 text-caption font-mono" style={{ color: 'var(--text-muted)' }}>
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
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(10, 11, 20, 0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowAutoConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 4 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel w-full max-w-sm rounded-[var(--radius-xl)] p-6 space-y-4"
            >
              <div className="h-10 w-10 rounded-[var(--radius-lg)] flex items-center justify-center" style={{ backgroundColor: 'var(--accent-warning-subtle)', color: 'var(--accent-warning)' }}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Enable Auto Approval?</h3>
                <p className="text-body-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  New posts will publish automatically at the AI-selected best time — no review step. You can switch back to Manual Approval anytime.
                </p>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button onClick={() => setShowAutoConfirm(false)} className="px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button
                  onClick={() => applyApprovalMode('AUTO')}
                  className="px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold shadow-md"
                  style={{ backgroundColor: 'var(--accent-warning)', color: '#1A1300' }}
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
