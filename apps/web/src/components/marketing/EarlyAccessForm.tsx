'use client';

import React, { useState } from 'react';
import { ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { ReferralShareCard } from './ReferralShareCard';

interface EarlyAccessFormProps {
  initialReferralCode?: string;
}

export function EarlyAccessForm({ initialReferralCode }: EarlyAccessFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    tiktokUsername: '',
    tiktokProfileUrl: '',
    followerRange: '1K–5K',
    niche: 'Business / Entrepreneurship',
    postingFrequency: 'Daily',
    country: 'United States',
    biggestProblem: '',
    automationWish: '',
    heardFrom: 'TikTok',
    preferredNextPlatform: 'Instagram',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let attribution: any = {};
      try {
        const stored = localStorage.getItem('oyinca_attribution');
        if (stored) attribution = JSON.parse(stored);
      } catch {}

      const res = await fetch('/api/marketing/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          referralCode: initialReferralCode || attribution.referralCode || undefined,
          utmSource: attribution.utmSource || undefined,
          utmMedium: attribution.utmMedium || undefined,
          utmCampaign: attribution.utmCampaign || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to register for Early Access.');
      }

      setSuccessResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (successResult) {
    return (
      <ReferralShareCard
        fullName={successResult.signup.fullName}
        position={successResult.signup.position}
        totalSignups={successResult.totalCount}
        referralCode={successResult.signup.referralCode}
        referralCount={successResult.signup.referralCount || 0}
        rewardTier={successResult.signup.rewardTier || 'NONE'}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl mx-auto p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-purple-500/20 backdrop-blur-xl shadow-2xl text-white space-y-6"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          TikTok-First Early Access Queue
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Reserve Your Spot</h2>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Join creators putting repetitive TikTok management on AI autopilot.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Name & Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name *</label>
          <input
            type="text"
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            placeholder="e.g. Alex Morgan"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address *</label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="alex@creator.com"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Grid: TikTok Handle & Profile URL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">TikTok Username *</label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-sm text-slate-500">@</span>
            <input
              type="text"
              name="tiktokUsername"
              required
              value={formData.tiktokUsername}
              onChange={handleChange}
              placeholder="username"
              className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">TikTok Profile Link (Optional)</label>
          <input
            type="url"
            name="tiktokProfileUrl"
            value={formData.tiktokProfileUrl}
            onChange={handleChange}
            placeholder="https://tiktok.com/@username"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Grid: Follower Range & Niche */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">TikTok Follower Range *</label>
          <select
            name="followerRange"
            value={formData.followerRange}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="Under 1K">Under 1K (Getting Started)</option>
            <option value="1K–5K">1K–5K</option>
            <option value="5K–10K">5K–10K</option>
            <option value="10K–50K">10K–50K</option>
            <option value="50K–100K">50K–100K</option>
            <option value="100K–500K">100K–500K</option>
            <option value="500K+">500K+</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Primary Niche *</label>
          <select
            name="niche"
            value={formData.niche}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="Business / Entrepreneurship">Business / Entrepreneurship</option>
            <option value="Marketing / Growth">Marketing / Growth</option>
            <option value="Personal Brand">Personal Brand</option>
            <option value="Tech / AI">Tech / AI</option>
            <option value="Fashion / Lifestyle">Fashion / Lifestyle</option>
            <option value="Beauty / Skincare">Beauty / Skincare</option>
            <option value="Education / Coaching">Education / Coaching</option>
            <option value="Fitness / Wellness">Fitness / Wellness</option>
            <option value="Food / Cooking">Food / Cooking</option>
            <option value="Other Creator Niche">Other Creator Niche</option>
          </select>
        </div>
      </div>

      {/* Grid: Posting Frequency & Country */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Posting Frequency *</label>
          <select
            name="postingFrequency"
            value={formData.postingFrequency}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="Multiple times daily">Multiple times daily</option>
            <option value="Daily">Daily</option>
            <option value="3-5 times a week">3-5 times a week</option>
            <option value="1-2 times a week">1-2 times a week</option>
            <option value="Occasional">Occasional</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Country *</label>
          <input
            type="text"
            name="country"
            required
            value={formData.country}
            onChange={handleChange}
            placeholder="e.g. United States, Nigeria, UK"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Biggest Problem */}
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          Biggest TikTok management problem right now? *
        </label>
        <textarea
          name="biggestProblem"
          required
          rows={2}
          value={formData.biggestProblem}
          onChange={handleChange}
          placeholder="e.g. Scripting hooks takes hours, hashtag research is manual, staying consistent while running a business..."
          className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* What to Automate */}
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          What would you most want Oyinca to automate for you? *
        </label>
        <textarea
          name="automationWish"
          required
          rows={2}
          value={formData.automationWish}
          onChange={handleChange}
          placeholder="e.g. Generating high-converting captions, picking peak posting times, auto-scheduling videos..."
          className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Grid: How heard & Optional Platform Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">How did you hear about Oyinca? *</label>
          <select
            name="heardFrom"
            value={formData.heardFrom}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="TikTok">TikTok Video / Creator</option>
            <option value="X / Twitter">X / Twitter</option>
            <option value="Instagram">Instagram</option>
            <option value="Friend / Referral">Friend Referral</option>
            <option value="Search Engine">Search Engine</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-purple-300 mb-1.5">
            Platform to support next? (Optional)
          </label>
          <select
            name="preferredNextPlatform"
            value={formData.preferredNextPlatform}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-purple-500/30 text-sm text-white focus:outline-none focus:border-purple-400"
          >
            <option value="Instagram">Instagram</option>
            <option value="YouTube Shorts">YouTube Shorts</option>
            <option value="X">X (Twitter)</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Facebook">Facebook</option>
          </select>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-base shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Reserving Your Spot...
          </>
        ) : (
          <>
            Get Early Access
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
}
