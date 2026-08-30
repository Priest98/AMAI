'use client';

import React, { useState } from 'react';
import { Loader2, Sparkles, AlertCircle, CheckCircle2, Video, Trophy, Rocket, HelpCircle } from 'lucide-react';

export function FoundingCreatorForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    country: 'United States',
    preferredContact: 'WhatsApp',
    tiktokUsername: '',
    tiktokProfileUrl: '',
    followerRange: '5K–10K',
    averageViews: '1K–5K',
    postingFrequency: 'Daily',
    niche: 'Business / Entrepreneurship',
    accountsManagedCount: 1,
    video1: '',
    video2: '',
    video3: '',
    currentWorkflow: '',
    timeConsumingPart: '',
    videosPerWeek: 5,
    usesExistingTools: '',
    whyJoin: '',
    biggestProblem: '',
    workflowToRemove: '',
    willingToTest7Days: 'YES',
    willingAutopilotChallenge: 'YES',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

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

      const sampleVideoUrls = [formData.video1, formData.video2, formData.video3].filter((url) => url.trim().length > 0);

      const res = await fetch('/api/marketing/creators/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sampleVideoUrls,
          accountsManagedCount: Number(formData.accountsManagedCount),
          videosPerWeek: Number(formData.videosPerWeek),
          utmSource: attribution.utmSource || undefined,
          utmMedium: attribution.utmMedium || undefined,
          utmCampaign: attribution.utmCampaign || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit Founding Creator application.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const status = result.application.status;
    return (
      <div className="w-full max-w-2xl mx-auto p-8 rounded-3xl bg-slate-900/90 border border-purple-500/30 backdrop-blur-xl shadow-2xl text-white text-center space-y-6">
        <div className="inline-flex p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300">
          {status === 'ACCEPTED' ? (
            <Trophy className="w-10 h-10 text-amber-400" />
          ) : status === 'CREATOR_REVIEW' ? (
            <Sparkles className="w-10 h-10 text-purple-400" />
          ) : (
            <Rocket className="w-10 h-10 text-pink-400" />
          )}
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight">
          {status === 'ACCEPTED'
            ? "You're officially an Oyinca Founding TikTok Creator! 🚀"
            : status === 'CREATOR_REVIEW'
            ? "Application Under Priority Review"
            : "Welcome to Oyinca Early Access!"}
        </h2>

        <p className="text-slate-300 text-sm max-w-md mx-auto">
          {status === 'ACCEPTED'
            ? 'Congratulations! Your profile has been selected for our initial 25 Founding Creators cohort. Our team will contact you via ' +
              result.application.preferredContact +
              ' shortly.'
            : status === 'CREATOR_REVIEW'
            ? "We are selectively reviewing your application as we curate our Founding TikTok Creator cohort. We'll be in touch soon!"
            : "While the initial 25 creator cohort is highly selective, you're locked in for Oyinca Early Access priority."}
        </p>

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-400">
          Application reference ID: <code className="text-purple-300 font-mono">{result.application.id}</code>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-purple-500/20 backdrop-blur-xl shadow-2xl text-white space-y-8"
    >
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          First 25 Creators Cohort
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Apply to Become a Founding Creator</h2>
        <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-md mx-auto">
          Help us build the future of AI TikTok management. Applications are selectively reviewed.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Creator Identity */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 border-b border-slate-800 pb-2">
          1. Creator Profile
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name *</label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Jordan Reed"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
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
              placeholder="jordan@creator.com"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Country *</label>
            <input
              type="text"
              name="country"
              required
              value={formData.country}
              onChange={handleChange}
              placeholder="e.g. United States, UK, Canada"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Preferred Contact Channel *</label>
            <select
              name="preferredContact"
              value={formData.preferredContact}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="Telegram">Telegram</option>
              <option value="TikTok DM">TikTok Direct Message</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: TikTok Metrics */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 border-b border-slate-800 pb-2">
          2. TikTok Channel & Metrics
        </h3>

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
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">TikTok Profile URL *</label>
            <input
              type="url"
              name="tiktokProfileUrl"
              required
              value={formData.tiktokProfileUrl}
              onChange={handleChange}
              placeholder="https://www.tiktok.com/@username"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Follower Count Range *</label>
            <select
              name="followerRange"
              value={formData.followerRange}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="Under 1K">Under 1K (Qualified Signal)</option>
              <option value="1K–5K">1K–5K</option>
              <option value="5K–10K">5K–10K</option>
              <option value="10K–50K">10K–50K</option>
              <option value="50K–100K">50K–100K</option>
              <option value="100K–500K">100K–500K</option>
              <option value="500K+">500K+</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Average Views per Video *</label>
            <input
              type="text"
              name="averageViews"
              value={formData.averageViews}
              onChange={handleChange}
              placeholder="e.g. 2K–10K views"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

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
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Content Niche *</label>
          <input
            type="text"
            name="niche"
            required
            value={formData.niche}
            onChange={handleChange}
            placeholder="e.g. SaaS Founder, Tech Reviews, AI Tools, Fashion Tips, Fitness Coaching"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Representative Videos (3 URLs) */}
        <div>
          <label className="block text-xs font-medium text-purple-300 mb-1.5 flex items-center gap-1.5">
            <Video className="w-4 h-4 text-purple-400" />
            Links to 3 Representative TikTok Videos *
          </label>
          <div className="space-y-2">
            <input
              type="url"
              name="video1"
              required
              value={formData.video1}
              onChange={handleChange}
              placeholder="Video 1: https://www.tiktok.com/@user/video/123..."
              className="w-full px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <input
              type="url"
              name="video2"
              required
              value={formData.video2}
              onChange={handleChange}
              placeholder="Video 2: https://www.tiktok.com/@user/video/456..."
              className="w-full px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <input
              type="url"
              name="video3"
              required
              value={formData.video3}
              onChange={handleChange}
              placeholder="Video 3: https://www.tiktok.com/@user/video/789..."
              className="w-full px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Creator Workflow */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 border-b border-slate-800 pb-2">
          3. Content Workflow & Friction
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            How do you currently manage your TikTok content? *
          </label>
          <textarea
            name="currentWorkflow"
            required
            rows={2}
            value={formData.currentWorkflow}
            onChange={handleChange}
            placeholder="e.g. I write hook ideas in Notion, record in batches on Sundays, edit in CapCut, and manually post every evening..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            What takes the most time in your process? *
          </label>
          <textarea
            name="timeConsumingPart"
            required
            rows={2}
            value={formData.timeConsumingPart}
            onChange={handleChange}
            placeholder="e.g. Scripting unique captions, researching trending hashtags, setting up optimal posting schedules..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Section 4: Motivation */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 border-b border-slate-800 pb-2">
          4. Program Motivation
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Why do you want to join the Oyinca Founding TikTok Creator Program? *
          </label>
          <textarea
            name="whyJoin"
            required
            rows={2}
            value={formData.whyJoin}
            onChange={handleChange}
            placeholder="Tell us what excites you about shaping an AI social media manager built for creators..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            If Oyinca could completely remove ONE part of your TikTok workflow, what should it remove? *
          </label>
          <textarea
            name="workflowToRemove"
            required
            rows={2}
            value={formData.workflowToRemove}
            onChange={handleChange}
            placeholder="e.g. Manual publishing & timing, writing captions from scratch, content scheduling..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Section 5: Testing Commitment */}
      <div className="space-y-4 p-5 rounded-2xl bg-purple-950/30 border border-purple-500/30">
        <h3 className="text-sm font-bold uppercase tracking-wider text-purple-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          5. Testing & Autopilot Challenge Commitment
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1.5">
              Willing to test Oyinca for 7 days & give feedback? *
            </label>
            <select
              name="willingToTest7Days"
              value={formData.willingToTest7Days}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-purple-500/40 text-sm text-white focus:outline-none"
            >
              <option value="YES">Yes, absolutely</option>
              <option value="MAYBE">Maybe</option>
              <option value="NO">No</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1.5">
              Participate in #OyincaAutopilot Challenge? *
            </label>
            <select
              name="willingAutopilotChallenge"
              value={formData.willingAutopilotChallenge}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-purple-500/40 text-sm text-white focus:outline-none"
            >
              <option value="YES">Yes, I'm in!</option>
              <option value="MAYBE">Maybe</option>
              <option value="NO">No</option>
            </select>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-base shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting Application...
          </>
        ) : (
          <>
            Submit Founding Creator Application
            <Trophy className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
}
