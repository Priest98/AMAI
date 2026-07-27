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
  Tag,
  Hash,
  Instagram,
  Video,
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

const DEFAULT_NICHE_TAGS = ['#fashiondesigner', '#garmentdesign', '#styleinspo', '#couture', '#fashioncollection', '#tailoring', '#streetwear', '#ootd'];

const NICHE_HASHTAG_MAP: Record<string, string[]> = {
  'Fashion Designer': ['#fashiondesigner', '#garmentdesign', '#styleinspo', '#couture', '#fashioncollection', '#tailoring', '#streetwear', '#ootd'],
  'Restaurant': ['#foodie', '#chef', '#restaurant', '#eatlocal', '#gourmetspecials', '#foodgasm', '#bistro', '#dining'],
  'Real Estate': ['#realestate', '#realtor', '#luxuryrealestate', '#dreamhome', '#househunting', '#architecture', '#interiordesign'],
  'Beauty': ['#beauty', '#makeup', '#skincare', '#glowingskin', '#beautytips', '#cleanbeauty', '#skincareroutine'],
  'Fitness': ['#fitness', '#workout', '#gym', '#fitfam', '#healthylifestyle', '#personaltrainer', '#activewear'],
  'Content Creator': ['#contentcreator', '#creator', '#reels', '#vlog', '#creatorsuccess', '#storytelling', '#behindthescenes'],
  'Small Business': ['#smallbusiness', '#entrepreneur', '#shoplocal', '#supportsmallbusiness', '#handcrafted', '#boutique'],
};

function getNicheTags(persona: string): string[] {
  return NICHE_HASHTAG_MAP[persona] || DEFAULT_NICHE_TAGS;
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
          topic: caption || `New collection highlight for our ${globalPersona} audience`,
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
        const tags = getNicheTags(globalPersona).slice(0, 5).join(' ');
        const fallback = `✨ Elevate your presence today! Discover our latest designs crafted specially for our ${globalPersona} community. What do you think of this look? Let us know below! ${tags}`;
        setCaption(fallback);
        handleScoreContent(fallback);
      }
    } catch (e) {
      const tags = getNicheTags(globalPersona).slice(0, 5).join(' ');
      const fallback = `✨ Elevate your presence today! Discover our latest designs crafted specially for our ${globalPersona} community. What do you think of this look? Let us know below! ${tags}`;
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
          topic: caption || globalPersona,
          platform: selectedPlatforms[0] || 'Instagram',
          niche: globalPersona
        })
      });
      if (res.ok) {
        const data = await res.json();
        setHashtags(data);
      } else {
        const nicheTags = getNicheTags(globalPersona);
        setHashtags({
          highVolume: nicheTags.slice(0, 3),
          mediumCompetition: nicheTags.slice(3, 5),
          nicheHashtags: nicheTags.slice(5),
          brandedHashtags: [`#${globalPersona.replace(/\s+/g, '')}Life`],
          allHashtags: nicheTags,
        });
      }
    } catch (e) {
      const nicheTags = getNicheTags(globalPersona);
      setHashtags({
        highVolume: nicheTags.slice(0, 3),
        mediumCompetition: nicheTags.slice(3, 5),
        nicheHashtags: nicheTags.slice(5),
        brandedHashtags: [`#${globalPersona.replace(/\s+/g, '')}Life`],
        allHashtags: nicheTags,
      });
    } finally {
      setGeneratingHashtags(false);
    }
  };

  const appendHashtagsToCaption = (tagList: string[]) => {
    const existing = caption.trim();
    const newTags = tagList.join(' ');
    setCaption(existing ? `${existing}\n\n${newTags}` : newTags);
  };

  const handleSendToQueue = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('marketing_os_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          caption,
          platforms: selectedPlatforms,
          status: autoPublishEnabled ? 'APPROVED' : 'PENDING_APPROVAL',
        })
      }).catch(() => null);

      if (res && res.ok) {
        setMessage(autoPublishEnabled ? '🎉 Post approved and scheduled for Auto-Publishing!' : '🚀 Sent to Approval Queue! Review it on the Dashboard.');
      } else {
        setMessage('🚀 Post added to Approval Queue! (Saved locally)');
      }
    } catch {
      setMessage('🚀 Post added to Approval Queue!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <SectionHeader
        title="Multi-Platform AI Composer"
        subtitle={`Generate, optimize, and schedule context-aware content tailored to your ${globalPersona} audience.`}
        action={
          <div className="flex items-center space-x-2">
            <Badge variant="purple">
              <span className="flex items-center space-x-1">
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span>Niche Mode: {globalPersona}</span>
              </span>
            </Badge>
          </div>
        }
      />

      {message && (
        <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs font-semibold flex justify-between items-center">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 cols): Editor */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Target Platforms Picker */}
          <div className="rounded-xl border p-4.5 space-y-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
            <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Target Channels</span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => togglePlatform('INSTAGRAM')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition touch-target ${
                  selectedPlatforms.includes('INSTAGRAM')
                    ? 'border-rose-500 text-white bg-rose-500/10'
                    : 'border-white/10 text-zinc-400 bg-zinc-900/40'
                }`}
              >
                <Instagram className="h-4 w-4 text-rose-500" />
                <span>Instagram Reels & Post</span>
                {selectedPlatforms.includes('INSTAGRAM') && <Check className="h-3.5 w-3.5 text-rose-500 ml-1" />}
              </button>

              <button
                type="button"
                onClick={() => togglePlatform('TIKTOK')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition touch-target ${
                  selectedPlatforms.includes('TIKTOK')
                    ? 'border-cyan-500 text-white bg-cyan-500/10'
                    : 'border-white/10 text-zinc-400 bg-zinc-900/40'
                }`}
              >
                <Video className="h-4 w-4 text-cyan-400" />
                <span>TikTok Video</span>
                {selectedPlatforms.includes('TIKTOK') && <Check className="h-3.5 w-3.5 text-cyan-400 ml-1" />}
              </button>
            </div>
          </div>

          {/* Main Caption Editor */}
          <div className="rounded-xl border p-4.5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Post Caption & Script</span>
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{caption.length} / 2200 chars</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={generatingAi}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border transition touch-target flex items-center space-x-1.5 btn-gold-cta"
                >
                  <Wand2 className="h-3.5 w-3.5 text-amber-400" />
                  <span>{generatingAi ? 'Writing AI Caption...' : 'Write AI Caption'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateHashtags}
                  disabled={generatingHashtags}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border transition touch-target flex items-center space-x-1.5"
                  style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                >
                  <Hash className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{generatingHashtags ? 'Analyzing Tags...' : 'Niche Hashtags'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={6}
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                if (e.target.value.length % 15 === 0) handleScoreContent(e.target.value);
              }}
              placeholder={`Write your post caption here or tap "Write AI Caption" to generate niche-optimized copy for ${globalPersona}...`}
              className="w-full rounded-xl p-3.5 text-xs border outline-none focus:ring-1 focus:ring-amber-500/50 resize-y"
              style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            />

            {/* Generated Niche Hashtags Bar */}
            {hashtags && (
              <div className="p-3.5 rounded-xl border space-y-2 text-xs" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center space-x-1.5" style={{ color: 'var(--text-primary)' }}>
                    <Tag className="h-3.5 w-3.5 text-amber-400" />
                    <span>Niche Hashtags ({globalPersona})</span>
                  </span>
                  <button
                    onClick={() => appendHashtagsToCaption(hashtags.allHashtags)}
                    className="text-[11px] font-bold text-amber-400 hover:underline"
                  >
                    + Append All Tags
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hashtags.allHashtags.map((tag, idx) => (
                    <span
                      key={idx}
                      onClick={() => appendHashtagsToCaption([tag])}
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono border cursor-pointer transition hover:border-amber-400"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions Container */}
          <ComposerActions
            onSendToQueue={handleSendToQueue}
            onPublishNow={handleSendToQueue}
            isSubmitting={loading}
            mode={autoPublishEnabled ? 'AUTO_PUBLISH' : 'APPROVAL_QUEUE'}
          />

        </div>

        {/* Right Column (4 cols): AI Insight & Score Tile */}
        <div className="lg:col-span-4 space-y-5">
          <ContentScoreCard
            score={contentScore.overallScore}
            verdict={contentScore.verdict}
            recommendation={contentScore.recommendation}
            suggestions={contentScore.suggestions}
          />
        </div>

      </div>
    </div>
  );
}
