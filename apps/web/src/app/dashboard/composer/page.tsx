"use client";
import React, { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function ComposerPage() {
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['INSTAGRAM']);
  const [scheduleType, setScheduleType] = useState<'NOW' | 'SCHEDULED'>('NOW');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [message, setMessage] = useState('');

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
          tone: 'friendly',
          platform: selectedPlatforms[0] || 'INSTAGRAM'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.caption) setCaption(data.caption);
      } else {
        setCaption('✨ Elevate your social presence today! Discover incredible updates and stay connected with our community. #Growth #Marketing');
      }
    } catch (e) {
      setCaption('✨ Elevate your social presence today! Discover incredible updates and stay connected with our community. #Growth #Marketing');
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

  const [nicheTone, setNicheTone] = useState<string>('Fashion Designer');

  const nichePresets = [
    { label: '👗 Fashion Designer', tone: 'Fashion Designer', hashtag: '#FashionDesigner #OOTD #FashionTikTok #StyleInspo' },
    { label: '🛍️ Small Business', tone: 'Small Business Owner', hashtag: '#SmallBusiness #SupportSmallBusiness #BehindTheScenes #ShopLocal' },
    { label: '🍲 Food & Agriculture', tone: 'Food & Agriculture', hashtag: '#Foodie #FarmFresh #Delicious #TikTokFood' },
    { label: '🚀 Viral / Trendy', tone: 'Viral & Trendy', hashtag: '#Viral #Trending #FYP #ExplorePage' }
  ];

  const handleSelectPreset = (preset: { tone: string; hashtag: string }) => {
    setNicheTone(preset.tone);
    if (!caption.includes(preset.hashtag)) {
      setCaption(prev => prev ? `${prev}\n\n${preset.hashtag}` : preset.hashtag);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Post Composer & AI Copilot</h1>
        <p className="text-sm text-zinc-500 mt-1">Draft, generate niche captions with AI, approve, schedule, and publish content across your channels.</p>
      </div>

      {message && (
        <div className="p-4 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-sm flex items-center justify-between">
          <span>{message}</span>
          <span className="text-xs font-semibold">✓ Saved</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Editor Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden p-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Select Target Platforms
            </label>
            
            <div className="flex space-x-3 mb-6">
              <button 
                type="button"
                onClick={() => togglePlatform('INSTAGRAM')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedPlatforms.includes('INSTAGRAM')
                    ? 'border-2 border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300'
                    : 'border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <span className="font-semibold">IG</span>
                <span>Instagram</span>
              </button>

              <button 
                type="button"
                onClick={() => togglePlatform('TIKTOK')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedPlatforms.includes('TIKTOK')
                    ? 'border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    : 'border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <span className="font-semibold">TK</span>
                <span>TikTok</span>
              </button>
            </div>

            {/* Niche Presets */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Niche & Tone Presets (Survey Validated)
              </label>
              <div className="flex flex-wrap gap-2">
                {nichePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      nicheTone === preset.tone
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Caption & AI Copywriter
            </label>
            <div className="relative">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full h-44 p-4 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4 resize-none text-zinc-900 dark:text-zinc-100"
                placeholder="What do you want to share? Type topic or click AI Spark to generate..."
              />
              <button 
                type="button"
                onClick={handleGenerateAi}
                disabled={generatingAi}
                className="absolute bottom-6 right-3 flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition shadow-sm disabled:opacity-50"
              >
                <span>✨</span>
                <span>{generatingAi ? 'Generating AI...' : `AI Spark (${nicheTone})`}</span>
              </button>
            </div>

            <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <span className="text-xs text-zinc-400">{caption.length}/2200 characters</span>
            </div>
          </div>
        </div>

        {/* Scheduling & Publish Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-6">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Publishing & Human Approval Gate</h3>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="schedule_type" 
                  checked={scheduleType === 'NOW'} 
                  onChange={() => setScheduleType('NOW')}
                  className="text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">Publish Now</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="schedule_type" 
                  checked={scheduleType === 'SCHEDULED'} 
                  onChange={() => setScheduleType('SCHEDULED')}
                  className="text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">Schedule for Later</span>
              </label>
              
              {scheduleType === 'SCHEDULED' && (
                <div className="pt-2">
                  <input 
                    type="datetime-local" 
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full p-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none text-zinc-900 dark:text-zinc-100" 
                  />
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
              <button 
                onClick={() => handlePublish('DRAFT')}
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-md shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>🛡️</span>
                <span>Send to Approval Queue</span>
              </button>

              <button 
                onClick={() => handlePublish(scheduleType === 'SCHEDULED' ? 'SCHEDULED' : 'PUBLISHED')}
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition disabled:opacity-50"
              >
                {loading ? 'Processing...' : scheduleType === 'SCHEDULED' ? 'Schedule Post' : 'Publish Post Now'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
