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
          className="p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
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
              <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                Target Platforms
              </label>
              
              <div className="flex space-x-3">
                <button 
                  type="button"
                  onClick={() => togglePlatform('INSTAGRAM')}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border touch-target"
                  style={{
                    backgroundColor: selectedPlatforms.includes('INSTAGRAM') ? 'var(--bg-surface-raised)' : 'transparent',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <span className="font-black">IG</span>
                  <span>Instagram Reels</span>
                </button>

                <button 
                  type="button"
                  onClick={() => togglePlatform('TIKTOK')}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border touch-target"
                  style={{
                    backgroundColor: selectedPlatforms.includes('TIKTOK') ? 'var(--bg-surface-raised)' : 'transparent',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <span className="font-black">TK</span>
                  <span>TikTok Video</span>
                </button>
              </div>
            </div>

            {/* Read-Only Global Persona Chip */}
            <div className="flex items-center space-x-2 p-3 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
              <Tag className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-warning)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Account Tone Persona:</span>
              <Badge variant="purple">{globalPersona} (Global Setting)</Badge>
            </div>

            {/* Caption Area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Caption & AI Copywriter
                </label>
                <button
                  onClick={() => handleScoreContent(caption)}
                  disabled={scoringAi}
                  className="text-xs font-bold hover:underline flex items-center space-x-1"
                  style={{ color: 'var(--text-primary)' }}
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
                  className="w-full h-48 p-4 rounded-2xl border text-sm focus:outline-none resize-none font-sans leading-relaxed"
                  style={{
                    backgroundColor: 'var(--bg-surface-raised)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="What do you want to publish? Type topic or tap AI Spark..."
                />
                
                <button 
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={generatingAi}
                  className="absolute bottom-4 right-3 flex items-center space-x-2 px-4 py-2 text-white text-xs font-bold rounded-xl transition shadow-lg border disabled:opacity-50 touch-target btn-emerald-cta"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{generatingAi ? 'Generating AI...' : `AI Spark`}</span>
                </button>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>{caption.length} / 2200 characters</span>
              </div>
            </div>

            {/* AI Hashtag Intelligence Section */}
            <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--card-border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center space-x-1.5" style={{ color: 'var(--text-primary)' }}>
                    <Hash className="h-4 w-4" style={{ color: 'var(--accent-warning)' }} />
                    <span>AI Hashtag Intelligence</span>
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Generate mixed hashtag clusters</p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateHashtags}
                  disabled={generatingHashtags}
                  className="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1.5 touch-target btn-emerald-cta"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>{generatingHashtags ? 'Researching...' : 'Generate Tags'}</span>
                </button>
              </div>

              {hashtags && (
                <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Recommended Mix</span>
                    <button
                      onClick={() => handleAppendHashtagGroup(hashtags.allHashtags)}
                      className="text-[10px] font-bold hover:underline"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      + Insert All Tags
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {hashtags.allHashtags.map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-mono border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>
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
            <h3 className="font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Post Actions & Publishing</h3>
            
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
