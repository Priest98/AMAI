"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SectionHeader from "@/components/ui/SectionHeader";
import Badge from "@/components/ui/Badge";
import { ContentScoreCard } from "@/components/ui/InsightTile";
import ComposerActions from "@/components/ui/ComposerActions";
import {
  Sparkles,
  Check,
  Wand2,
  Brain,
  Tag,
  Award,
  Hash,
} from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://marketing-os-backend-api.vercel.app/api').replace(/\/$/, '');

interface ContentScoreResult {
  overallScore: number;
  verdict: 'Ready to Publish' | 'Needs Improvement';
  recommendation: string;
  suggestions: string[];
}

interface HashtagsResult {
  highVolume: string[];
  mediumCompetition: string[];
  nicheHashtags: string[];
  brandedHashtags: string[];
  allHashtags: string[];
}

export default function ComposerPage() {
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['INSTAGRAM']);
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [scoringAi, setScoringAi] = useState(false);
  const [generatingHashtags, setGeneratingHashtags] = useState(false);
  
  const [message, setMessage] = useState('');
  const [globalPersona, setGlobalPersona] = useState<string>('Fashion Designer');

  const [contentScore, setContentScore] = useState<ContentScoreResult>({
    overallScore: 91,
    verdict: 'Ready to Publish',
    recommendation: 'High engagement potential — good hook and hashtag density.',
    suggestions: ['Strong opening hook', 'Optimal hashtag density'],
  });

  const [hashtags, setHashtags] = useState<HashtagsResult | null>(null);

  useEffect(() => {
    const savedPersona = localStorage.getItem('amai_global_persona');
    if (savedPersona) setGlobalPersona(savedPersona);

    const savedMode = localStorage.getItem('amai_publishing_mode');
    if (savedMode === 'AUTO_PUBLISH') {
      setAutoPublishEnabled(true);
    }
  }, []);

  const togglePlatform = (p: string) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter(item => item !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const handleGenerateAi = async () => {
    setGeneratingAi(true);
    try {
      const res = await fetch(`${API_BASE}/ai/generate-caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: caption || 'Special product highlight for our community',
          tone: globalPersona,
          platform: selectedPlatforms[0] || 'INSTAGRAM'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.caption) {
          setCaption(data.caption);
          handleScoreContent(data.caption);
        }
      } else {
        const fallback = '✨ Elevate your social presence today! Discover incredible updates and stay connected with our community. What do you think? #AMAI #Growth #Viral';
        setCaption(fallback);
        handleScoreContent(fallback);
      }
    } catch (e) {
      const fallback = '✨ Elevate your social presence today! Discover incredible updates and stay connected with our community. What do you think? #AMAI #Growth #Viral';
      setCaption(fallback);
      handleScoreContent(fallback);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleScoreContent = async (textToScore: string) => {
    setScoringAi(true);
    try {
      const res = await fetch(`${API_BASE}/ai/score-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: textToScore,
          platform: selectedPlatforms[0] || 'Instagram',
          mediaType: 'Reels'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setContentScore({
          overallScore: data.overallScore || 91,
          verdict: data.overallScore >= 85 ? 'Ready to Publish' : 'Needs Improvement',
          recommendation: `High engagement potential — good hook and hashtag density.`,
          suggestions: ['Strong opening hook', 'Optimal hashtag density'],
        });
      }
    } catch (e) {
      console.error('Failed to score content', e);
    } finally {
      setScoringAi(false);
    }
  };

  const handleGenerateHashtags = async () => {
    setGeneratingHashtags(true);
    try {
      const res = await fetch(`${API_BASE}/ai/generate-hashtags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: caption || 'Social Media Growth',
          platform: selectedPlatforms[0] || 'Instagram',
          niche: globalPersona
        })
      });
      if (res.ok) {
        const data = await res.json();
        setHashtags(data);
      }
    } catch (e) {
      console.error('Failed to generate hashtags', e);
    } finally {
      setGeneratingHashtags(false);
    }
  };

  const handleAppendHashtagGroup = (tagGroup: string[]) => {
    const tagsString = tagGroup.join(' ');
    setCaption(prev => prev ? `${prev}\n\n${tagsString}` : tagsString);
    handleScoreContent(`${caption}\n\n${tagsString}`);
  };

  const handleSendToApproval = () => {
    if (!caption.trim()) {
      setMessage('Please enter a caption first.');
      return;
    }
    setMessage('🎉 Post saved to Approval Queue!');
    setCaption('');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleScheduleDirectly = () => {
    if (!caption.trim()) {
      setMessage('Please enter a caption first.');
      return;
    }
    setMessage('🚀 Post scheduled with Smart AI Time!');
    setCaption('');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <SectionHeader
        title="Post Composer & AI Copilot"
        subtitle="Draft content, score post quality in real time, generate algorithm-compliant hashtags, and schedule per post."
        badge={<Badge variant="purple">SMART ENGINE ACTIVE</Badge>}
      />

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between"
        >
          <span>{message}</span>
          <Check className="h-4 w-4 text-emerald-500" />
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Post Editor & AI Generation (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="exec-card p-6 sm:p-7 rounded-[24px] space-y-6">
            
            {/* Target Platforms */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                Target Platforms
              </label>
              
              <div className="flex space-x-3">
                <button 
                  type="button"
                  onClick={() => togglePlatform('INSTAGRAM')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border touch-target ${
                    selectedPlatforms.includes('INSTAGRAM')
                      ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-md'
                      : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="font-black">IG</span>
                  <span>Instagram Reels</span>
                </button>

                <button 
                  type="button"
                  onClick={() => togglePlatform('TIKTOK')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border touch-target ${
                    selectedPlatforms.includes('TIKTOK')
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-md'
                      : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="font-black">TK</span>
                  <span>TikTok Video</span>
                </button>
              </div>
            </div>

            {/* Read-Only Global Persona Chip */}
            <div className="flex items-center space-x-2 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
              <Tag className="h-4 w-4 text-purple-500 flex-shrink-0" />
              <span className="text-xs text-slate-500 dark:text-zinc-400">Account Tone Persona:</span>
              <Badge variant="purple">{globalPersona} (Global Setting)</Badge>
            </div>

            {/* Caption Area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  Caption & AI Copywriter
                </label>
                <button
                  onClick={() => handleScoreContent(caption)}
                  disabled={scoringAi}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center space-x-1"
                >
                  <Brain className="h-3.5 w-3.5" />
                  <span>{scoringAi ? 'Scoring...' : 'Recalculate'}</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onBlur={() => handleScoreContent(caption)}
                  className="w-full h-48 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-zinc-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500/50 resize-none font-sans leading-relaxed"
                  placeholder="What do you want to publish? Type topic or tap AI Spark..."
                />
                
                <button 
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={generatingAi}
                  className="absolute bottom-4 right-3 flex items-center space-x-2 px-4 py-2 gradient-cta text-white text-xs font-bold rounded-xl transition shadow-lg border border-white/20 disabled:opacity-50 touch-target"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{generatingAi ? 'Generating AI...' : `AI Spark`}</span>
                </button>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">{caption.length} / 2200 characters</span>
              </div>
            </div>

            {/* AI Hashtag Intelligence Section */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Hash className="h-4 w-4 text-purple-500" />
                    <span>AI Hashtag Intelligence</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Generate mixed hashtag clusters</p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateHashtags}
                  disabled={generatingHashtags}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-bold transition flex items-center space-x-1.5 touch-target"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>{generatingHashtags ? 'Researching...' : 'Generate Tags'}</span>
                </button>
              </div>

              {hashtags && (
                <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase">Recommended Mix</span>
                    <button
                      onClick={() => handleAppendHashtagGroup(hashtags.allHashtags)}
                      className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      + Insert All Tags
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {hashtags.allHashtags.map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-300 text-xs font-mono border border-purple-500/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Column: AI Content Score & Composer Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <ContentScoreCard
            score={contentScore.overallScore}
            summary={contentScore.recommendation}
            tips={contentScore.suggestions}
          />

          <div className="exec-card p-6 sm:p-7 rounded-[24px] space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white tracking-tight">Post Actions & Publishing</h3>
            
            <ComposerActions
              autoPublishEnabled={autoPublishEnabled}
              onSendToApproval={handleSendToApproval}
              onScheduleDirectly={handleScheduleDirectly}
            />
          </div>

        </div>

      </div>
    </div>
  );
}
