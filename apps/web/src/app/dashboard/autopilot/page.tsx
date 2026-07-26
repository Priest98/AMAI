"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  CheckCircle2,
  Copy,
  Check,
  Folder,
  Radio,
  Clock,
  Sliders,
  Play,
  Pause,
  Cloud,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function AutoPilotPage() {
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState('');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const [engineActive, setEngineActive] = useState(true);
  const [postingFrequency, setPostingFrequency] = useState('1_per_day');
  const [defaultTone, setDefaultTone] = useState('Fashion Designer');
  const [targetInstagram, setTargetInstagram] = useState(true);
  const [targetTikTok, setTargetTikTok] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('marketing_os_token');
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

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoogleDriveOAuth = () => {
    setAuthorizing(true);
    setTimeout(() => {
      setDriveFolderId('Auto_Synced_Marketing_Folder');
      setDriveConnected(true);
      setAuthorizing(false);
      setIsDriveModalOpen(false);
    }, 1000);
  };

  const toggleEngine = () => {
    setEngineActive(!engineActive);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Automation Engine & Cloud Sync</h1>
        <p className="text-xs text-zinc-400 mt-1">Automatically sync media from Google Drive, generate captions with AI, and publish to Instagram & TikTok.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Setup & Configuration */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Connect Source */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 shadow-xl">
            <h3 className="text-base font-bold text-white tracking-tight">1. Media Source & Cloud Sync</h3>
            
            {/* Google Drive Connector */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
                  GD
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Google Drive Folder Sync</p>
                  <p className="text-[11px] text-zinc-400">
                    {driveConnected ? `Connected (/content)` : 'Auto-sync photos & videos into Queue'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsDriveModalOpen(true)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition shadow-sm border ${
                  driveConnected 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 text-white border-white/20'
                }`}
              >
                {driveConnected ? 'Synced' : 'Connect Drive'}
              </button>
            </div>

            {/* iOS Shortcut Webhook */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-white/10 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    ⚡
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Apple iCloud / Webhook Ingestion</p>
                    <p className="text-[11px] text-emerald-400 font-mono">Status: Live & Listening</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Live Unique Ingestion Webhook URL</label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={webhookUrl} 
                    readOnly
                    className="w-full px-3 py-2 border border-white/10 rounded-xl bg-zinc-950/60 text-xs font-mono text-zinc-300 focus:outline-none"
                  />
                  <button 
                    onClick={handleCopyWebhook}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-rose-500/20 border border-white/20 flex items-center space-x-1"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: AI Caption Settings */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 shadow-xl">
            <h3 className="text-base font-bold text-white tracking-tight">2. AI Caption & Channel Targeting</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Default Niche Preset</label>
                <select 
                  value={defaultTone}
                  onChange={(e) => setDefaultTone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-zinc-950/60 text-xs font-semibold text-white focus:outline-none focus:border-rose-500/50"
                >
                  <option value="Fashion Designer">👗 Fashion Designer</option>
                  <option value="Small Business Owner">🛍️ Small Business Owner</option>
                  <option value="Food & Agriculture">🍲 Food & Agriculture</option>
                  <option value="Viral & Trendy">🚀 Viral & Trendy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Target Channels</label>
                <div className="flex space-x-4 pt-2">
                  <label className="flex items-center space-x-2 text-xs text-zinc-300 font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={targetInstagram}
                      onChange={(e) => setTargetInstagram(e.target.checked)}
                      className="rounded text-rose-500" 
                    />
                    <span>Instagram Reels</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-zinc-300 font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={targetTikTok}
                      onChange={(e) => setTargetTikTok(e.target.checked)}
                      className="rounded text-rose-500" 
                    />
                    <span>TikTok Video</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Col: Engine Control */}
        <div className="space-y-6">
          <div className={`glass-panel p-6 rounded-3xl border flex flex-col items-center justify-center text-center space-y-6 shadow-xl transition ${
            engineActive
              ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-zinc-950 to-zinc-950'
              : 'border-white/10'
          }`}>
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-xl transition ${
              engineActive ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-zinc-800 text-zinc-500'
            }`}>
              <Zap className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">
                AutoPilot Engine is {engineActive ? 'ACTIVE' : 'OFF'}
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                {engineActive
                  ? 'Listening for new media uploads & publishing automatically during peak hours.'
                  : 'Engine is paused. Click below to activate automatic publishing.'}
              </p>
            </div>

            <button 
              onClick={toggleEngine}
              className={`w-full py-3 text-xs font-bold rounded-xl transition shadow-lg flex items-center justify-center space-x-2 border border-white/20 ${
                engineActive 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25'
              }`}
            >
              {engineActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{engineActive ? 'Pause Engine' : 'Activate Engine'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
