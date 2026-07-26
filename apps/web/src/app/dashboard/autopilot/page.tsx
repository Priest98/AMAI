"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Sliders,
  Play,
  Pause,
  Sparkles,
  TrendingUp,
  Calendar,
  Layers,
  HelpCircle,
  Brain,
  BarChart3,
  Award,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  FolderSync,
} from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://marketing-os-backend-api.vercel.app/api').replace(/\/$/, '');

interface AudienceInsights {
  bestPostingDays: string[];
  bestPostingHours: string;
  bestContentType: string;
  bestCaptionLength: string;
  topPerformingHashtags: string[];
  peakEngagementTimes: Array<{ day: string; hour: string; rate: string }>;
  monthlyGrowthRate: string;
}

export default function AutoPilotPage() {
  const [engineActive, setEngineActive] = useState(true);
  
  // Publishing Mode (SMART vs FIXED)
  const [scheduleMode, setScheduleMode] = useState<'SMART' | 'FIXED'>('SMART');
  const [fixedFrequency, setFixedFrequency] = useState<number>(2); // 1, 2, 3, 5 posts/day

  const [defaultTone, setDefaultTone] = useState('Fashion Designer');
  const [targetInstagram, setTargetInstagram] = useState(true);
  const [targetTikTok, setTargetTikTok] = useState(true);
  
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // AI Prediction State
  const [bestTime, setBestTime] = useState({
    formattedTime: 'Wednesday, 7:45 PM',
    confidence: 94,
    reason: 'Historical engagement peaks on Instagram & TikTok during evening hours.',
    peakWindow: '7:30 PM – 8:30 PM (Est. +35% Impressions)',
  });

  const [insights, setInsights] = useState<AudienceInsights>({
    bestPostingDays: ['Wednesday', 'Friday', 'Sunday'],
    bestPostingHours: '7:00 PM – 9:15 PM EST',
    bestContentType: 'Instagram Reels & TikTok Videos (92% completion rate)',
    bestCaptionLength: '120 – 180 characters',
    topPerformingHashtags: ['#AMAI', '#AI', '#ViralContent', '#Creators'],
    peakEngagementTimes: [
      { day: 'Wed', hour: '7:45 PM', rate: '+42% higher reach' },
      { day: 'Fri', hour: '6:30 PM', rate: '+38% higher reach' },
      { day: 'Sun', hour: '8:00 PM', rate: '+29% higher reach' },
    ],
    monthlyGrowthRate: '+24.5% Engagement',
  });

  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
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

    // Fetch AI Best Time Prediction & Audience Insights
    fetchAiPrediction();
  }, []);

  const fetchAiPrediction = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch(`${API_BASE}/ai/best-time?platform=Instagram`);
      if (res.ok) {
        const data = await res.json();
        setBestTime(data);
      }

      const insightsRes = await fetch(`${API_BASE}/ai/audience-insights`);
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setInsights(insightsData);
      }
    } catch (e) {
      console.error('Failed to fetch AI insights', e);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fixed schedule time slot calculation generator
  const getFixedTimes = (count: number) => {
    if (count === 1) return ['6:00 PM'];
    if (count === 2) return ['12:30 PM', '7:45 PM'];
    if (count === 3) return ['9:00 AM', '2:00 PM', '7:45 PM'];
    return ['9:00 AM', '12:30 PM', '3:30 PM', '6:00 PM', '9:00 PM'];
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <span>Smart Publishing Engine</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              AI Powered
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            An adaptive social media engine that learns your account's peak engagement hours and automates publishing.
          </p>
        </div>

        <button
          onClick={fetchAiPrediction}
          disabled={loadingAi}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-white/10 transition touch-target"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
          <span>Recalculate AI Predictions</span>
        </button>
      </div>

      {/* ── Mode Selection Banner (Smart Schedule vs Fixed Schedule) ── */}
      <div className="exec-card p-6 sm:p-8 rounded-[24px] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Publishing Strategy Mode</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Select how AMAI calculates your content distribution schedule.</p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 self-start md:self-auto">
            <button
              onClick={() => setScheduleMode('SMART')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition touch-target ${
                scheduleMode === 'SMART'
                  ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Brain className="h-4 w-4" />
              <span>Mode 2: Smart Schedule (AI Recommended)</span>
            </button>

            <button
              onClick={() => setScheduleMode('FIXED')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition touch-target ${
                scheduleMode === 'FIXED'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-md'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>Mode 1: Fixed Schedule</span>
            </button>
          </div>
        </div>

        {/* Mode Details Display */}
        {scheduleMode === 'SMART' ? (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-indigo-500/10 border border-rose-500/20 space-y-4"
          >
            <div className="flex items-start space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black text-base shadow-lg shadow-rose-500/30 flex-shrink-0">
                ✨
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Smart Adaptive Engine Active
                </p>
                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  AMAI automatically evaluates audience activity, historical engagement, and platform trends to publish at maximum impact. If a post is gaining viral momentum, the AI delays queued posts to prevent cannibalization.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs">
                <span className="text-slate-400 dark:text-zinc-500 font-semibold block text-[10px] uppercase">Next Recommended Slot</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{bestTime.formattedTime}</span>
              </div>

              <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs">
                <span className="text-slate-400 dark:text-zinc-500 font-semibold block text-[10px] uppercase">Peak Engagement Window</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{bestTime.peakWindow}</span>
              </div>

              <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs">
                <span className="text-slate-400 dark:text-zinc-500 font-semibold block text-[10px] uppercase">AI Confidence Score</span>
                <span className="font-extrabold text-purple-600 dark:text-purple-400">{bestTime.confidence}% Optimal Match</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Posts Per Day</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Posts will be evenly distributed throughout peak daylight hours.</p>
              </div>

              <div className="flex items-center space-x-2">
                {[1, 2, 3, 5].map((count) => (
                  <button
                    key={count}
                    onClick={() => setFixedFrequency(count)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition touch-target ${
                      fixedFrequency === count
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {count} / Day
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Scheduled Times:</span>
              <div className="flex flex-wrap gap-2">
                {getFixedTimes(fixedFrequency).map((t, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 font-mono text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-white/10">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Audience Intelligence Insights Dashboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Audience Intelligence Insights */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="exec-card p-6 sm:p-7 rounded-[24px] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Audience Intelligence Insights</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Personalized data models trained on your account history</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {insights.monthlyGrowthRate}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Best Posting Days</span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{insights.bestPostingDays.join(', ')}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Optimal Hours</span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{insights.bestPostingHours}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Top Content Format</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{insights.bestContentType}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Optimal Caption Length</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{insights.bestCaptionLength}</p>
              </div>
            </div>

            {/* Peak Engagement Times List */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Peak Reach Heatmap</h3>
              <div className="space-y-2">
                {insights.peakEngagementTimes.map((slot, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-100/80 dark:bg-white/5 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">{slot.day} at {slot.hour}</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{slot.rate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cloud Sync & Ingestion Sources */}
          <div className="exec-card p-6 sm:p-7 rounded-[24px] space-y-6">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Cloud Ingestion Sync</h2>
            
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
                  onClick={handleCopyWebhook}
                  className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition shadow-md shadow-rose-500/20 flex items-center space-x-1 touch-target flex-shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Engine Power State Toggle */}
        <div className="space-y-6">
          <div className={`exec-card p-7 rounded-[24px] flex flex-col items-center justify-center text-center space-y-6 shadow-xl transition ${
            engineActive
              ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-slate-50 to-white dark:via-zinc-950 dark:to-zinc-950'
              : 'border-slate-200 dark:border-white/10'
          }`}>
            <div className={`h-20 w-20 rounded-3xl flex items-center justify-center shadow-xl transition ${
              engineActive ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'
            }`}>
              <Zap className="h-10 w-10" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                AutoPilot Engine {engineActive ? 'ACTIVE' : 'PAUSED'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                {engineActive
                  ? 'Listening for Google Drive uploads & publishing automatically at AI-predicted peak hours.'
                  : 'Engine is currently paused. Tap below to resume intelligent automated publishing.'}
              </p>
            </div>

            <button 
              onClick={() => setEngineActive(!engineActive)}
              className={`w-full py-3 text-xs font-bold rounded-2xl transition shadow-lg flex items-center justify-center space-x-2 border border-white/20 touch-target ${
                engineActive 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25'
              }`}
            >
              {engineActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{engineActive ? 'Pause AutoPilot Engine' : 'Activate AutoPilot Engine'}</span>
            </button>
          </div>

          {/* AI Niche Preset Selector */}
          <div className="exec-card p-6 rounded-[24px] space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Niche Preset Persona</h3>
            <select 
              value={defaultTone}
              onChange={(e) => setDefaultTone(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500/50 touch-target"
            >
              <option value="Fashion Designer">👗 Fashion Designer</option>
              <option value="Small Business Owner">🛍️ Small Business Owner</option>
              <option value="Food & Agriculture">🍲 Food & Agriculture</option>
              <option value="Viral & Trendy">🚀 Viral & Trendy</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
}
