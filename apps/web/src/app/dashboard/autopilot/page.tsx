"use client";

import React, { useState, useEffect } from 'react';
import SectionHeader from "@/components/ui/SectionHeader";
import Badge from "@/components/ui/Badge";
import {
  Sparkles,
  Zap,
  FolderKanban,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Instagram,
  Video,
  HardDrive,
  Check,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'DETECTED' | 'GENERATED' | 'QUEUED' | 'SCHEDULED' | 'PUBLISHED';
  title: string;
  timestamp: string;
  platform?: string;
}

export default function AutoPilotPage() {
  const [autopilotEnabled, setAutopilotEnabled] = useState(true);
  const [contentSource, setContentSource] = useState<'GOOGLE_DRIVE' | 'DIRECT_UPLOADS'>('GOOGLE_DRIVE');
  const [approvalMode, setApprovalMode] = useState<'APPROVAL_QUEUE' | 'AUTO_PUBLISH'>('APPROVAL_QUEUE');
  
  const [showAutoConfirmModal, setShowAutoConfirmModal] = useState(false);
  const [globalPersona, setGlobalPersona] = useState('Fashion Designer');

  // Connected OAuth Accounts State
  const [hasGoogleDrive, setHasGoogleDrive] = useState(true);
  const [hasInstagram, setHasInstagram] = useState(true);
  const [hasTikTok, setHasTikTok] = useState(true);

  useEffect(() => {
    // Load stored settings
    const savedAutopilot = localStorage.getItem('amai_autopilot_enabled');
    if (savedAutopilot !== null) setAutopilotEnabled(savedAutopilot === 'true');

    const savedSource = localStorage.getItem('amai_content_source') as 'GOOGLE_DRIVE' | 'DIRECT_UPLOADS';
    if (savedSource) setContentSource(savedSource);

    const savedMode = localStorage.getItem('amai_publishing_mode') as 'APPROVAL_QUEUE' | 'AUTO_PUBLISH';
    if (savedMode) setApprovalMode(savedMode);

    const savedPersona = localStorage.getItem('amai_global_persona');
    if (savedPersona) setGlobalPersona(savedPersona);

    // Sync connected accounts from localStorage
    const igConnected = localStorage.getItem('amai_connected_instagram') !== 'false';
    const ttConnected = localStorage.getItem('amai_connected_tiktok') !== 'false';
    const driveConnected = localStorage.getItem('amai_connected_google') !== 'false';
    
    setHasInstagram(igConnected);
    setHasTikTok(ttConnected);
    setHasGoogleDrive(driveConnected);
  }, []);

  const toggleAutopilot = () => {
    const nextState = !autopilotEnabled;
    setAutopilotEnabled(nextState);
    localStorage.setItem('amai_autopilot_enabled', String(nextState));
  };

  const handleSourceSelect = (source: 'GOOGLE_DRIVE' | 'DIRECT_UPLOADS') => {
    if (source === 'GOOGLE_DRIVE' && !hasGoogleDrive) return;
    setContentSource(source);
    localStorage.setItem('amai_content_source', source);
  };

  const handleApprovalModeSelect = (mode: 'APPROVAL_QUEUE' | 'AUTO_PUBLISH') => {
    if (mode === 'AUTO_PUBLISH') {
      setShowAutoConfirmModal(true);
    } else {
      setApprovalMode('APPROVAL_QUEUE');
      localStorage.setItem('amai_publishing_mode', 'APPROVAL_QUEUE');
    }
  };

  const confirmAutoApproval = () => {
    setApprovalMode('AUTO_PUBLISH');
    localStorage.setItem('amai_publishing_mode', 'AUTO_PUBLISH');
    setShowAutoConfirmModal(false);
  };

  // Activity Feed
  const recentActivities: ActivityItem[] = [
    { id: '1', type: 'DETECTED', title: 'New media detected in Google Drive ("spring_lookbook_v2.mp4")', timestamp: '2 minutes ago' },
    { id: '2', type: 'GENERATED', title: `Niche caption & hashtags generated for ${globalPersona}`, timestamp: '4 minutes ago' },
    { id: '3', type: 'QUEUED', title: 'Sent to Approval Queue for manual review', timestamp: '5 minutes ago' },
    { id: '4', type: 'SCHEDULED', title: 'Optimal time selected (Today at 7:45 PM EST)', timestamp: '12 minutes ago' },
    { id: '5', type: 'PUBLISHED', title: 'Published Reel to Instagram (@abdulrasaq_adam_olayinka)', timestamp: '1 hour ago', platform: 'Instagram' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <SectionHeader
        title="AutoPilot Automation Center"
        subtitle="Set it once, forget it. AMAI automatically monitors new media, generates niche content, and manages publishing."
        action={
          <div className="flex items-center space-x-2">
            <Badge variant={autopilotEnabled ? "emerald" : "slate"}>
              <span className="flex items-center space-x-1.5">
                <span className={`h-2 w-2 rounded-full ${autopilotEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{autopilotEnabled ? "AutoPilot Active" : "AutoPilot Paused"}</span>
              </span>
            </Badge>
          </div>
        }
      />

      {/* 1. Prominent Master AutoPilot ON/OFF Switch */}
      <div 
        className="rounded-2xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition shadow-lg"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
      >
        <div className="flex items-center space-x-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold transition ${
            autopilotEnabled 
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <Zap className={`h-6 w-6 ${autopilotEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                AutoPilot Status: {autopilotEnabled ? "ON (Active Monitoring)" : "OFF (Paused)"}
              </h2>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {autopilotEnabled 
                ? "AMAI is actively monitoring your content source and generating social posts automatically."
                : "Automation is paused. New uploads will not be processed until AutoPilot is enabled."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleAutopilot}
          className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none touch-target ${
            autopilotEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              autopilotEnabled ? 'translate-x-8' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Grid Layout: Content Source & Approval Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 2. Content Source Selector */}
        <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
          <div>
            <h3 className="text-sm font-bold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
              <FolderKanban className="h-4 w-4 text-amber-400" />
              <span>1. Choose Content Source</span>
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Where should AMAI check for new photos and videos?
            </p>
          </div>

          <div className="space-y-3">
            {/* Google Drive Option */}
            <div
              onClick={() => handleSourceSelect('GOOGLE_DRIVE')}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                contentSource === 'GOOGLE_DRIVE' && hasGoogleDrive
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-slate-200 dark:border-white/5 opacity-80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <HardDrive className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Google Drive Folder</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {hasGoogleDrive ? 'Auto-syncs new files dropped into your Drive' : 'Drive connection required'}
                  </div>
                </div>
              </div>
              {contentSource === 'GOOGLE_DRIVE' && hasGoogleDrive ? (
                <Check className="h-4 w-4 text-amber-400 font-bold" />
              ) : !hasGoogleDrive ? (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                  Connect Drive
                </span>
              ) : null}
            </div>

            {/* Direct Uploads Option */}
            <div
              onClick={() => handleSourceSelect('DIRECT_UPLOADS')}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                contentSource === 'DIRECT_UPLOADS'
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-slate-200 dark:border-white/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Upload className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Direct Uploads</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Process files uploaded directly into AMAI Media Library
                  </div>
                </div>
              </div>
              {contentSource === 'DIRECT_UPLOADS' && <Check className="h-4 w-4 text-amber-400 font-bold" />}
            </div>
          </div>
        </div>

        {/* 3. Approval Mode Selector (The Core Setting) */}
        <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
          <div>
            <h3 className="text-sm font-bold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>2. Select Approval Mode</span>
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Control whether posts require your approval before publishing.
            </p>
          </div>

          <div className="space-y-3">
            {/* Manual Approval Card */}
            <div
              onClick={() => handleApprovalModeSelect('APPROVAL_QUEUE')}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                approvalMode === 'APPROVAL_QUEUE'
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-slate-200 dark:border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Manual Approval (Recommended)</span>
                </div>
                {approvalMode === 'APPROVAL_QUEUE' && <Check className="h-4 w-4 text-emerald-400 font-bold" />}
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                AMAI generates captions, hashtags, and schedules posts to your <b>Approval Queue</b>. Nothing goes live without your review.
              </p>
            </div>

            {/* Auto Approval Card */}
            <div
              onClick={() => handleApprovalModeSelect('AUTO_PUBLISH')}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                approvalMode === 'AUTO_PUBLISH'
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-slate-200 dark:border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                  <Zap className="h-4 w-4" />
                  <span>Auto Approval (100% Hands-Free)</span>
                </div>
                {approvalMode === 'AUTO_PUBLISH' && <Check className="h-4 w-4 text-amber-400 font-bold" />}
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                AMAI processes content, generates posts, and publishes directly to Instagram & TikTok automatically at peak engagement times.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Connected Services Grid */}
      <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Connected Channels & Services</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Google Drive */}
          <div className="p-3.5 rounded-xl border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center space-x-2.5">
              <HardDrive className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Google Drive</span>
            </div>
            {hasGoogleDrive ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Connected
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-400">Not Connected</span>
            )}
          </div>

          {/* Instagram */}
          <div className="p-3.5 rounded-xl border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center space-x-2.5">
              <Instagram className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Instagram</span>
            </div>
            {hasInstagram ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Connected
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-400">Not Connected</span>
            )}
          </div>

          {/* TikTok */}
          <div className="p-3.5 rounded-xl border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center space-x-2.5">
              <Video className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>TikTok</span>
            </div>
            {hasTikTok ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Connected
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-400">Not Connected</span>
            )}
          </div>

        </div>
      </div>

      {/* 5. Recent Activity Feed */}
      <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
            <Clock className="h-4 w-4 text-amber-400" />
            <span>Recent AutoPilot Activity</span>
          </h3>
          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Live Automation Log</span>
        </div>

        <div className="space-y-3">
          {recentActivities.map((act) => (
            <div
              key={act.id}
              className="p-3.5 rounded-xl border flex items-center justify-between text-xs transition"
              style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}
            >
              <div className="flex items-center space-x-3">
                {act.type === 'DETECTED' && <HardDrive className="h-4 w-4 text-blue-400 shrink-0" />}
                {act.type === 'GENERATED' && <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />}
                {act.type === 'QUEUED' && <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />}
                {act.type === 'SCHEDULED' && <Clock className="h-4 w-4 text-amber-400 shrink-0" />}
                {act.type === 'PUBLISHED' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{act.title}</span>
              </div>
              <span className="text-[11px] shrink-0" style={{ color: 'var(--text-secondary)' }}>{act.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Auto Approval Warning Modal */}
      {showAutoConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Enable Auto Approval Mode?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                When Auto Approval is enabled, AMAI will generate captions, hashtags, and <b>automatically publish posts to Instagram & TikTok</b> without asking for manual review.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAutoConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAutoApproval}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-md transition"
              >
                Enable Auto Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
