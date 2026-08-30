'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, Trophy, CheckCircle2 } from 'lucide-react';

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
      <div className="lp-card p-8 md:p-10 w-full max-w-2xl mx-auto text-center space-y-6">
        <div className="inline-flex p-4 rounded-2xl" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
          <Trophy className="w-10 h-10" />
        </div>

        <h2 className="lp-heading text-2xl md:text-3xl font-bold" style={{ color: 'var(--lp-text-primary)' }}>
          {status === 'ACCEPTED'
            ? "You're officially an Oyinca Founding TikTok Creator!"
            : status === 'CREATOR_REVIEW'
            ? 'Application Under Priority Review'
            : 'Welcome to Oyinca Early Access'}
        </h2>

        <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--lp-text-secondary)' }}>
          {status === 'ACCEPTED'
            ? 'Your application has been selected for our initial 25 Founding Creators cohort. Our team will reach out via ' +
              result.application.preferredContact +
              ' shortly.'
            : status === 'CREATOR_REVIEW'
            ? "We're reviewing your application as we curate our Founding TikTok Creator cohort. We'll be in touch soon!"
            : "While the initial 25 creator cohort is highly selective, you're locked in for Oyinca Early Access."}
        </p>

        <div className="pt-4 border-t text-xs" style={{ borderColor: 'var(--lp-border)', color: 'var(--lp-text-muted)' }}>
          Application ID: <code className="font-mono text-white">{result.application.id}</code>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="lp-card p-6 md:p-10 w-full max-w-2xl mx-auto text-left space-y-8">
      <div className="text-center">
        <h2 className="lp-heading text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--lp-text-primary)' }}>
          APPLY FOR FOUNDING CREATOR COHORT
        </h2>
        <p className="text-xs md:text-sm mt-1.5" style={{ color: 'var(--lp-text-secondary)' }}>
          Help shape the future of TikTok management. Applications are reviewed selectively.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border flex items-center gap-3 text-xs" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Creator Identity */}
      <div className="space-y-4 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-2" style={{ color: 'var(--lp-cyan)', borderColor: 'var(--lp-border)' }}>
          1. Creator Profile
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>Full Name *</label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Jordan Reed"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>Email Address *</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="jordan@creator.com"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>Country *</label>
            <input
              type="text"
              name="country"
              required
              value={formData.country}
              onChange={handleChange}
              placeholder="e.g. United States, UK"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>Preferred Contact Channel *</label>
            <select
              name="preferredContact"
              value={formData.preferredContact}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
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
        <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-2" style={{ color: 'var(--lp-cyan)', borderColor: 'var(--lp-border)' }}>
          2. TikTok Channel & Metrics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>TikTok Username *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm" style={{ color: 'var(--lp-text-muted)' }}>@</span>
              <input
                type="text"
                name="tiktokUsername"
                required
                value={formData.tiktokUsername}
                onChange={handleChange}
                placeholder="username"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>TikTok Profile URL *</label>
            <input
              type="url"
              name="tiktokProfileUrl"
              required
              value={formData.tiktokProfileUrl}
              onChange={handleChange}
              placeholder="https://www.tiktok.com/@username"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>Follower Count Range *</label>
            <select
              name="followerRange"
              value={formData.followerRange}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
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
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>Average Views per Video *</label>
            <input
              type="text"
              name="averageViews"
              value={formData.averageViews}
              onChange={handleChange}
              placeholder="e.g. 2K–10K views"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>Posting Frequency *</label>
            <select
              name="postingFrequency"
              value={formData.postingFrequency}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
            >
              <option value="Multiple times daily">Multiple times daily</option>
              <option value="Daily">Daily</option>
              <option value="3-5 times a week">3-5 times a week</option>
              <option value="1-2 times a week">1-2 times a week</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>Content Niche *</label>
          <input
            type="text"
            name="niche"
            required
            value={formData.niche}
            onChange={handleChange}
            placeholder="e.g. SaaS Founder, Tech Reviews, Fashion, Fitness"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
          />
        </div>

        {/* Representative Videos */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>
            Links to 3 Representative TikTok Videos *
          </label>
          <div className="space-y-2">
            <input
              type="url"
              name="video1"
              required
              value={formData.video1}
              onChange={handleChange}
              placeholder="Video 1 URL"
              className="w-full px-4 py-2 rounded-xl text-xs outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
            />
            <input
              type="url"
              name="video2"
              required
              value={formData.video2}
              onChange={handleChange}
              placeholder="Video 2 URL"
              className="w-full px-4 py-2 rounded-xl text-xs outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
            />
            <input
              type="url"
              name="video3"
              required
              value={formData.video3}
              onChange={handleChange}
              placeholder="Video 3 URL"
              className="w-full px-4 py-2 rounded-xl text-xs outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Workflow */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-2" style={{ color: 'var(--lp-cyan)', borderColor: 'var(--lp-border)' }}>
          3. Content Workflow & Friction
        </h3>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>
            How do you currently manage your TikTok content? *
          </label>
          <textarea
            name="currentWorkflow"
            required
            rows={2}
            value={formData.currentWorkflow}
            onChange={handleChange}
            placeholder="Describe your current planning & posting routine..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>
            What takes the most time in your process? *
          </label>
          <textarea
            name="timeConsumingPart"
            required
            rows={2}
            value={formData.timeConsumingPart}
            onChange={handleChange}
            placeholder="e.g. Writing captions, researching hashtags, staying consistent..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
          />
        </div>
      </div>

      {/* Section 4: Motivation */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-2" style={{ color: 'var(--lp-cyan)', borderColor: 'var(--lp-border)' }}>
          4. Motivation
        </h3>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>
            Why do you want to join the Founding TikTok Creator Program? *
          </label>
          <textarea
            name="whyJoin"
            required
            rows={2}
            value={formData.whyJoin}
            onChange={handleChange}
            placeholder="Tell us what excites you about building a better TikTok manager..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>
            If Oyinca could remove ONE part of your TikTok workflow, what should it remove? *
          </label>
          <textarea
            name="workflowToRemove"
            required
            rows={2}
            value={formData.workflowToRemove}
            onChange={handleChange}
            placeholder="e.g. Manual publishing, writing captions from scratch..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
          />
        </div>
      </div>

      {/* Section 5: Testing Commitment */}
      <div className="space-y-4 p-5 rounded-xl lp-glass">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--lp-cyan)' }}>
          5. Testing & Autopilot Challenge Commitment
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>
              Willing to test Oyinca for 7 days & give feedback? *
            </label>
            <select
              name="willingToTest7Days"
              value={formData.willingToTest7Days}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
            >
              <option value="YES">Yes, absolutely</option>
              <option value="MAYBE">Maybe</option>
              <option value="NO">No</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lp-text-secondary)' }}>
              Participate in 7-Day Autopilot Challenge? *
            </label>
            <select
              name="willingAutopilotChallenge"
              value={formData.willingAutopilotChallenge}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
            >
              <option value="YES">Yes, I'm in</option>
              <option value="MAYBE">Maybe</option>
              <option value="NO">No</option>
            </select>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 px-6 rounded-full text-base font-extrabold lp-btn-primary transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            SUBMITTING APPLICATION...
          </>
        ) : (
          <>
            SUBMIT CREATOR APPLICATION
            <Trophy className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
}
