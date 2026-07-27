"use client";
import React, { useState, useEffect } from 'react';
import SectionHeader from "@/components/ui/SectionHeader";
import Badge from "@/components/ui/Badge";
import { InsightTile } from "@/components/ui/InsightTile";
import {
  Brain,
  BarChart3,
  RefreshCw,
  Tag,
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
  const [globalPersona, setGlobalPersona] = useState('Fashion Designer');
  const [loadingAi, setLoadingAi] = useState(false);

  const [bestTime, setBestTime] = useState({
    formattedTime: 'Wednesday, 7:45 PM',
    compactSummary: 'Best times: Wed 7:45pm · Fri 6:30pm · Sun 8pm',
    reason: 'Historical engagement peaks on Instagram & TikTok during evening hours.',
  });

  const [insights, setInsights] = useState<AudienceInsights>({
    bestPostingDays: ['Wednesday', 'Friday', 'Sunday'],
    bestPostingHours: '7:00 PM – 9:15 PM EST',
    bestContentType: 'Instagram Reels & TikTok Videos',
    bestCaptionLength: '120 – 180 characters',
    topPerformingHashtags: ['#AMAI', '#AI', '#ViralContent', '#Creators'],
    peakEngagementTimes: [
      { day: 'Wed', hour: '7:45 PM', rate: '+42% higher reach' },
      { day: 'Fri', hour: '6:30 PM', rate: '+38% higher reach' },
      { day: 'Sun', hour: '8:00 PM', rate: '+29% higher reach' },
    ],
    monthlyGrowthRate: '+24.5% Engagement',
  });

  useEffect(() => {
    const savedPersona = localStorage.getItem('amai_global_persona');
    if (savedPersona) setGlobalPersona(savedPersona);
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <SectionHeader
        title="Smart Publishing Engine & Audience Insights"
        subtitle="Read-only strategy and audience engagement analytics to inform your content pipeline."
        badge={<Badge variant="purple">READ-ONLY STRATEGY</Badge>}
        action={
          <button
            onClick={fetchAiPrediction}
            disabled={loadingAi}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-white/10 transition touch-target"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
            <span>Recalculate</span>
          </button>
        }
      />

      {/* Single Source of Truth: Compact Peak Reach Summary Line */}
      <div className="exec-card p-6 rounded-[24px] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="section-header-title text-base font-bold">
                Recommended Peak Engagement Hours
              </h2>
              <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                Best times: Wed 7:45pm · Fri 6:30pm · Sun 8pm
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
            <Tag className="h-4 w-4 text-purple-500" />
            <span>Tone Persona:</span>
            <Badge variant="purple">{globalPersona}</Badge>
          </div>
        </div>
      </div>

      {/* Audience Intelligence Insights Grid */}
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
                  <h2 className="section-header-title text-lg font-bold">Audience Intelligence Insights</h2>
                  <p className="section-header-subtitle text-xs">Data models trained on historical account engagement</p>
                </div>
              </div>

              <Badge variant="success">{insights.monthlyGrowthRate}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InsightTile label="Best Posting Days" value={insights.bestPostingDays.join(', ')} />
              <InsightTile label="Optimal Hours" value={insights.bestPostingHours} />
              <InsightTile label="Top Content Format" value={insights.bestContentType} />
              <InsightTile label="Optimal Caption Length" value={insights.bestCaptionLength} />
            </div>
          </div>
        </div>

        {/* Right Column: Information Summary Card */}
        <div className="space-y-6">
          <div className="exec-card p-6 rounded-[24px] space-y-4">
            <h3 className="section-header-title text-xs font-extrabold uppercase tracking-wider">Strategy Summary</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              Use these insights to schedule posts in the Composer. All scheduling choices are configured per post in the Composer interface.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
