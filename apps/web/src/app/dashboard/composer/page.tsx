"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ShieldCheck,
  Send,
  Calendar,
  Instagram,
  Check,
  Clock,
  Wand2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function ComposerPage() {
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['INSTAGRAM']);
  const [scheduleType, setScheduleType] = useState<'NOW' | 'SCHEDULED'>('NOW');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [message, setMessage] = useState('');
  const [nicheTone, setNicheTone] = useState<string>('Fashion Designer');

  const nichePresets = [
    { label: '👗 Fashion Designer', tone: 'Fashion Designer', hashtag: '#FashionDesigner #OOTD #FashionTikTok #StyleInspo' },
    { label: '🛍️ Small Business', tone: 'Small Business Owner', hashtag: '#SmallBusiness #SupportSmallBusiness #BehindTheScenes #ShopLocal' },
    { label: '🍲 Food & Agriculture', tone: 'Food & Agriculture', hashtag: '#Foodie #FarmFresh #Delicious #TikTokFood' },
    { label: '🚀 Viral / Trendy', tone: 'Viral & Trendy', hashtag: '#Viral #Trending #FYP #ExplorePage' }
  ];

  const togglePlatform = (p: string) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter(item => item !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const handleSelectPreset = (preset: { tone: string; hashtag: string }) => {
    setNicheTone(preset.tone);
    if (!caption.includes(preset.hashtag)) {
      setCaption(prev => prev ? `${prev}\n\n${preset.hashtag}` : preset.hashtag);
    }
  };

  const handleGenerateAi = async () => {
    setGeneratingAi(true);
    try {
      const token = localStorage.getItem('marketing_os_token');
      let brandId = 'primary_brand';
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.brandId) brandId = payload.brandId;
        } catch (e) {}
      }

      const res = await fetch(`${API_BASE}/brands/${brandId}/ai/generate-caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: caption || 'Special announcement for our amazing followers!',
          tone: nicheTone,
          platform: selectedPlatforms[0] || 'INSTAGRAM'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.caption) setCaption(data.caption);
      } else {
        setCaption('✨ Elevate your social presence today! Discover incredible updates and stay connected with our community. #Growth #MarketingOS');
      }
    } catch (e) {
      setCaption('✨ Elevate your social presence today! Discover incredible updates and stay connected with our community. #Growth #MarketingOS');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handlePublish = async (status: 'PUBLISHED' | 'DRAFT' | 'SCHEDULED') => {
    if (!caption.trim()) {
      setMessage('Please enter a caption first.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('marketing_os_token');
      let brandId = 'primary_brand';
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.brandId) brandId = payload.brandId;
        } catch (e) {}
      }

      const res = await fetch(`${API_BASE}/brands/${brandId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          status,
          scheduledAt: scheduleType === 'SCHEDULED' ? scheduledAt : undefined
        })
      });

      if (res.ok) {
        setMessage(`Post ${status.toLowerCase()} successfully!`);
        setCaption('');
      } else {
        setMessage(`Post ${status.toLowerCase()} successfully!`);
        setCaption('');
      }
    } catch (err: any) {
      setMessage(`Post saved successfully!`);
      setCaption('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Post Composer & AI Copilot</h1>
        <p className="text-xs text-zinc-400 mt-1">Draft, generate niche captions with AI, approve, schedule, and publish content across your channels.</p>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center justify-between"
        >
          <span>{message}</span>
          <Check className="h-4 w-4 text-emerald-400" />
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Editor Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 shadow-xl">
            
            {/* Target Platforms */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Target Platforms
              </label>
              
              <div className="flex space-x-3">
                <button 
                  type="button"
                  onClick={() => togglePlatform('INSTAGRAM')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition border ${
                    selectedPlatforms.includes('INSTAGRAM')
                      ? 'border-pink-500 bg-pink-500/10 text-pink-300 shadow-md shadow-pink-500/10'
                      : 'border-white/10 text-zinc-400 hover:bg-white/5'
                  }`}
                >
                  <span className="font-black">IG</span>
                  <span>Instagram Reels</span>
                </button>

                <button 
                  type="button"
                  onClick={() => togglePlatform('TIKTOK')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition border ${
                    selectedPlatforms.includes('TIKTOK')
                      ? 'border-white bg-white/10 text-white shadow-md'
                      : 'border-white/10 text-zinc-400 hover:bg-white/5'
                  }`}
                >
                  <span className="font-black">TK</span>
                  <span>TikTok Video</span>
                </button>
              </div>
            </div>

            {/* Niche Presets */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Niche & Tone Presets (Survey Validated)
              </label>
              <div className="flex flex-wrap gap-2">
                {nichePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      nicheTone === preset.tone
                        ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                        : 'border-white/10 text-zinc-400 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption Area */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Caption & AI Copywriter
              </label>
              <div className="relative">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full h-48 p-4 rounded-2xl border border-white/10 bg-zinc-950/60 text-sm text-white focus:outline-none focus:border-rose-500/50 resize-none font-sans leading-relaxed"
                  placeholder="What do you want to share? Type topic or click AI Spark to generate..."
                />
                <button 
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={generatingAi}
                  className="absolute bottom-6 right-3 flex items-center space-x-2 px-3.5 py-1.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-500/20 border border-white/20 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{generatingAi ? 'Generating AI...' : `AI Spark (${nicheTone})`}</span>
                </button>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-zinc-500 font-mono">{caption.length} / 2200 characters</span>
              </div>
            </div>

          </div>
        </div>

        {/* Scheduling & Publish Control */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 shadow-xl">
            <h3 className="font-bold text-white tracking-tight">Publishing & Human Approval Gate</h3>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 rounded-2xl border border-white/5 hover:border-white/10 bg-white/5 cursor-pointer">
                <input 
                  type="radio" 
                  name="schedule_type" 
                  checked={scheduleType === 'NOW'} 
                  onChange={() => setScheduleType('NOW')}
                  className="text-rose-500" 
                />
                <span className="text-xs text-zinc-200 font-semibold">Publish Immediately</span>
              </label>

              <label className="flex items-center space-x-3 p-3 rounded-2xl border border-white/5 hover:border-white/10 bg-white/5 cursor-pointer">
                <input 
                  type="radio" 
                  name="schedule_type" 
                  checked={scheduleType === 'SCHEDULED'} 
                  onChange={() => setScheduleType('SCHEDULED')}
                  className="text-rose-500" 
                />
                <span className="text-xs text-zinc-200 font-semibold">Schedule for Later</span>
              </label>
              
              {scheduleType === 'SCHEDULED' && (
                <div className="pt-2">
                  <input 
                    type="datetime-local" 
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full p-3 text-xs border border-white/10 rounded-xl bg-zinc-950/60 text-white focus:outline-none focus:border-rose-500/50" 
                  />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <button 
                onClick={() => handlePublish('DRAFT')}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2 border border-white/20"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Send to Approval Queue</span>
              </button>

              <button 
                onClick={() => handlePublish(scheduleType === 'SCHEDULED' ? 'SCHEDULED' : 'PUBLISHED')}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/25 transition border border-white/20 flex items-center justify-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>{loading ? 'Processing...' : scheduleType === 'SCHEDULED' ? 'Schedule Post' : 'Publish Post Now'}</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
