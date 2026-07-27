"use client";

import React, { useState, useEffect } from 'react';
import SectionHeader from "@/components/ui/SectionHeader";
import Badge from "@/components/ui/Badge";
import GlassmorphicToggle from "@/components/ui/GlassmorphicToggle";
import {
  Zap,
  FolderKanban,
  Upload,
  HardDrive,
  Check,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export default function AutoPilotPage() {
  const [autopilotEnabled, setAutopilotEnabled] = useState(true);
  const [contentSource, setContentSource] = useState<'GOOGLE_DRIVE' | 'DIRECT_UPLOADS'>('GOOGLE_DRIVE');
  const [approvalMode, setApprovalMode] = useState<'APPROVAL_QUEUE' | 'AUTO_PUBLISH'>('APPROVAL_QUEUE');
  
  const [showAutoConfirmModal, setShowAutoConfirmModal] = useState(false);
  const [hasGoogleDrive, setHasGoogleDrive] = useState(true);

  useEffect(() => {
    // Sync settings with localStorage
    const savedAutopilot = localStorage.getItem('amai_autopilot_enabled');
    if (savedAutopilot !== null) setAutopilotEnabled(savedAutopilot === 'true');

    const savedSource = localStorage.getItem('amai_content_source') as 'GOOGLE_DRIVE' | 'DIRECT_UPLOADS';
    if (savedSource) setContentSource(savedSource);

    const savedMode = localStorage.getItem('amai_publishing_mode') as 'APPROVAL_QUEUE' | 'AUTO_PUBLISH';
    if (savedMode) setApprovalMode(savedMode);

    const driveConnected = localStorage.getItem('amai_connected_google') !== 'false';
    setHasGoogleDrive(driveConnected);
  }, []);

  const handleToggle = (nextState: boolean) => {
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 px-1 sm:px-0">
      <SectionHeader
        title="AutoPilot Automation Settings"
        subtitle="Set how you want AMAI to automate your social media content pipeline."
        action={
          <Badge variant={autopilotEnabled ? "emerald" : "slate"}>
            <span className="flex items-center space-x-1.5">
              <span className={`h-2 w-2 rounded-full ${autopilotEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{autopilotEnabled ? "AutoPilot Active" : "AutoPilot Paused"}</span>
            </span>
          </Badge>
        }
      />

      {/* ── 1. Hero AutoPilot Status Card with 3D Glass Pill Toggle ── */}
      <div 
        className="rounded-2xl border p-5 sm:p-6 transition shadow-lg space-y-3"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
      >
        {/* Horizontal Row alignment on all screen sizes */}
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold transition shrink-0 ${
              autopilotEnabled 
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <Zap className={`h-5 w-5 ${autopilotEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                AutoPilot Status: {autopilotEnabled ? "ON" : "OFF"}
              </h2>
              <span className="text-[11px] font-semibold text-emerald-400 block sm:hidden">
                {autopilotEnabled ? "Active & Monitoring" : "Paused"}
              </span>
            </div>
          </div>

          {/* 3D Glass Pill Toggle (matching reference image) */}
          <GlassmorphicToggle
            checked={autopilotEnabled}
            onChange={handleToggle}
            ariaLabel="AutoPilot Status Toggle"
          />
        </div>

        <p className="text-xs pt-1 border-t border-slate-200/40 dark:border-white/5" style={{ color: 'var(--text-secondary)' }}>
          {autopilotEnabled 
            ? "AMAI actively monitors new content, generates niche copy & hashtags, and schedules posts."
            : "Automation is paused. New uploads will not be processed until AutoPilot is enabled."}
        </p>
      </div>

      {/* ── 2. Content Source Section (Flattened Segmented Control) ── */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xs sm:text-sm font-bold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
            <FolderKanban className="h-4 w-4 text-amber-400" />
            <span>Content Source</span>
          </h3>
          <p className="text-[11px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>
            Select where AMAI checks for new photos and videos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Google Drive Option */}
          <div
            onClick={() => handleSourceSelect('GOOGLE_DRIVE')}
            className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between touch-target ${
              contentSource === 'GOOGLE_DRIVE' && hasGoogleDrive
                ? 'border-amber-500/60 bg-amber-500/10'
                : 'border-slate-200 dark:border-white/10 opacity-75'
            }`}
            style={{ backgroundColor: contentSource === 'GOOGLE_DRIVE' && hasGoogleDrive ? undefined : 'var(--bg-surface)' }}
          >
            <div className="flex items-center space-x-3">
              <HardDrive className="h-5 w-5 text-blue-400 shrink-0" />
              <div>
                <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Google Drive Folder</div>
                <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {hasGoogleDrive ? 'Auto-syncs dropped Drive files' : 'Connect Drive in Integrations'}
                </div>
              </div>
            </div>
            {contentSource === 'GOOGLE_DRIVE' && hasGoogleDrive && (
              <Check className="h-4 w-4 text-amber-400 font-bold shrink-0" />
            )}
          </div>

          {/* Direct Uploads Option */}
          <div
            onClick={() => handleSourceSelect('DIRECT_UPLOADS')}
            className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between touch-target ${
              contentSource === 'DIRECT_UPLOADS'
                ? 'border-amber-500/60 bg-amber-500/10'
                : 'border-slate-200 dark:border-white/10'
            }`}
            style={{ backgroundColor: contentSource === 'DIRECT_UPLOADS' ? undefined : 'var(--bg-surface)' }}
          >
            <div className="flex items-center space-x-3">
              <Upload className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Direct Uploads</div>
                <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  Process media uploaded to Library
                </div>
              </div>
            </div>
            {contentSource === 'DIRECT_UPLOADS' && (
              <Check className="h-4 w-4 text-amber-400 font-bold shrink-0" />
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Approval Mode Section (Flattened Segmented Control) ── */}
      <div className="space-y-3 pt-2">
        <div>
          <h3 className="text-xs sm:text-sm font-bold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Approval Mode</span>
          </h3>
          <p className="text-[11px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>
            Control whether posts require manual review before publishing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Manual Approval Card */}
          <div
            onClick={() => handleApprovalModeSelect('APPROVAL_QUEUE')}
            className={`p-4 rounded-xl border transition cursor-pointer touch-target ${
              approvalMode === 'APPROVAL_QUEUE'
                ? 'border-emerald-500/60 bg-emerald-500/10'
                : 'border-slate-200 dark:border-white/10'
            }`}
            style={{ backgroundColor: approvalMode === 'APPROVAL_QUEUE' ? undefined : 'var(--bg-surface)' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Manual Approval (Recommended)</span>
              </div>
              {approvalMode === 'APPROVAL_QUEUE' && <Check className="h-4 w-4 text-emerald-400 font-bold shrink-0" />}
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Posts are sent to your Approval Queue. Nothing is published without your review.
            </p>
          </div>

          {/* Auto Approval Card */}
          <div
            onClick={() => handleApprovalModeSelect('AUTO_PUBLISH')}
            className={`p-4 rounded-xl border transition cursor-pointer touch-target ${
              approvalMode === 'AUTO_PUBLISH'
                ? 'border-amber-500/60 bg-amber-500/10'
                : 'border-slate-200 dark:border-white/10'
            }`}
            style={{ backgroundColor: approvalMode === 'AUTO_PUBLISH' ? undefined : 'var(--bg-surface)' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                <Zap className="h-4 w-4 shrink-0" />
                <span>Auto Approval (Hands-Free)</span>
              </div>
              {approvalMode === 'AUTO_PUBLISH' && <Check className="h-4 w-4 text-amber-400 font-bold shrink-0" />}
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              AMAI automatically generates content and publishes directly to Instagram & TikTok at peak times.
            </p>
          </div>
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
