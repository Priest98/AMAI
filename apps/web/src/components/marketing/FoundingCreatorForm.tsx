'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Trophy, AlertCircle, Check } from 'lucide-react';

const TIME_CONSUMING_OPTIONS = [
  'Writing captions & hashtags',
  'Planning & brainstorming video ideas',
  'Manual uploading & scheduling',
  'Analyzing video performance & stats',
  'Editing & post-production',
  'Other workflow friction',
];

const REMOVE_WORKFLOW_OPTIONS = [
  'Auto-publishing & scheduled posts',
  'AI Caption & hashtag drafting',
  'Content calendar management',
  '7-Day TikTok Autopilot mode',
  'Growth & audience recommendations',
  'All of the above',
];

export function FoundingCreatorForm() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    country: 'Nigeria',
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
    timeConsumingPart: 'Writing captions & hashtags',
    videosPerWeek: 5,
    usesExistingTools: '',
    whyJoin: '',
    biggestProblem: '',
    workflowToRemove: 'Auto-publishing & scheduled posts',
    willingToTest7Days: 'YES',
    willingAutopilotChallenge: 'YES',
  });

  const [customTimeConsuming, setCustomTimeConsuming] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const totalSteps = 5;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentStep === 1) {
      if (!formData.fullName.trim() || !formData.email.trim()) {
        setError('Please enter your full name and email address.');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.tiktokUsername.trim() || !formData.tiktokProfileUrl.trim()) {
        setError('Please enter your TikTok username and profile link.');
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.video1.trim()) {
        setError('Please provide at least 1 representative TikTok video URL.');
        return;
      }
    } else if (currentStep === 4) {
      const timeVal = formData.timeConsumingPart === 'Other workflow friction' ? customTimeConsuming : formData.timeConsumingPart;
      if (!timeVal.trim()) {
        setError('Please select or specify what takes the most time in your process.');
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const finalTimeConsuming = formData.timeConsumingPart === 'Other workflow friction' ? customTimeConsuming : formData.timeConsumingPart;

    try {
      let attribution: any = {};
      try {
        const stored = localStorage.getItem('oyinca_attribution');
        if (stored) attribution = JSON.parse(stored);
      } catch {}

      const sampleVideoUrls = [formData.video1, formData.video2, formData.video3].filter(
        (url) => url.trim().length > 0
      );

      const res = await fetch('/api/marketing/creators/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          timeConsumingPart: finalTimeConsuming,
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
            ? 'Application Under Selective Review'
            : 'Application Received'}
        </h2>

        <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--lp-text-secondary)' }}>
          {status === 'ACCEPTED'
            ? 'Your application has been selected for our initial 25 Founding Creators cohort. Our team will reach out via ' +
              result.application.preferredContact +
              ' shortly.'
            : 'We are reviewing applications individually for our initial cohort of 25 creators. We will contact you if selected.'}
        </p>

        <div className="pt-4 border-t text-xs" style={{ borderColor: 'var(--lp-border)', color: 'var(--lp-text-muted)' }}>
          Application ID: <code className="font-mono text-white">{result.application.id}</code>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto text-left space-y-8">
      {/* Step Indicator Header */}
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--lp-border)' }}>
        <div className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: 'var(--lp-cyan)' }}>
          0{currentStep} — 0{totalSteps}
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div
              key={idx}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: currentStep === idx + 1 ? '24px' : '8px',
                background: currentStep >= idx + 1 ? 'var(--lp-cyan)' : 'var(--lp-border)',
              }}
            />
          ))}
        </div>
      </div>

      {error && (
        <div
          className="p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold"
          style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#F87171' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleNext} className="space-y-8">
        {/* STEP 01: ABOUT YOU */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--lp-text-muted)' }}>
                01 / ABOUT YOU
              </span>
              <h2 className="lp-heading text-2xl md:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                Creator Information
              </h2>
            </div>

            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Jordan Reed"
                    className="w-full px-5 py-3.5 rounded-2xl text-base outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jordan@creator.com"
                    className="w-full px-5 py-3.5 rounded-2xl text-base outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                    Country *
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-2xl text-base outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  >
                    <option value="Nigeria">🇳🇬 Nigeria (Primary Market)</option>
                    <option value="United States">🇺🇸 United States</option>
                    <option value="United Kingdom">🇬🇧 United Kingdom</option>
                    <option value="Canada">🇨🇦 Canada</option>
                    <option value="Ghana">🇬🇭 Ghana</option>
                    <option value="South Africa">🇿🇦 South Africa</option>
                    <option value="Kenya">🇰🇪 Kenya</option>
                    <option value="United Arab Emirates">🇦🇪 United Arab Emirates</option>
                    <option value="Germany">🇩🇪 Germany</option>
                    <option value="Other International">Other International</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                    Preferred Contact Channel *
                  </label>
                  <select
                    name="preferredContact"
                    value={formData.preferredContact}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-2xl text-base outline-none"
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
          </div>
        )}

        {/* STEP 02: YOUR TIKTOK */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--lp-text-muted)' }}>
                02 / YOUR TIKTOK
              </span>
              <h2 className="lp-heading text-2xl md:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                Your Channel Details
              </h2>
            </div>

            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                    TikTok Username *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-sm font-mono" style={{ color: 'var(--lp-text-muted)' }}>@</span>
                    <input
                      type="text"
                      name="tiktokUsername"
                      required
                      value={formData.tiktokUsername}
                      onChange={handleChange}
                      placeholder="username"
                      className="w-full pl-9 pr-4 py-3.5 rounded-2xl text-base outline-none"
                      style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                    TikTok Profile URL *
                  </label>
                  <input
                    type="url"
                    name="tiktokProfileUrl"
                    required
                    value={formData.tiktokProfileUrl}
                    onChange={handleChange}
                    placeholder="https://www.tiktok.com/@username"
                    className="w-full px-5 py-3.5 rounded-2xl text-base outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                    Follower Range *
                  </label>
                  <select
                    name="followerRange"
                    value={formData.followerRange}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-2xl text-base outline-none"
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
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                    Average Views *
                  </label>
                  <input
                    type="text"
                    name="averageViews"
                    value={formData.averageViews}
                    onChange={handleChange}
                    placeholder="e.g. 2K–10K"
                    className="w-full px-5 py-3.5 rounded-2xl text-base outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                    Posting Frequency *
                  </label>
                  <select
                    name="postingFrequency"
                    value={formData.postingFrequency}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-2xl text-base outline-none"
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
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                  Content Niche *
                </label>
                <input
                  type="text"
                  name="niche"
                  required
                  value={formData.niche}
                  onChange={handleChange}
                  placeholder="e.g. SaaS Founder, Tech Reviews, Fashion, Fitness"
                  className="w-full px-5 py-3.5 rounded-2xl text-base outline-none"
                  style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 03: YOUR CONTENT */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--lp-text-muted)' }}>
                03 / YOUR CONTENT
              </span>
              <h2 className="lp-heading text-2xl md:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                What do you create?
              </h2>
            </div>

            <div className="space-y-5 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                  Links to 3 Representative TikTok Videos *
                </label>
                <div className="space-y-3">
                  <input
                    type="url"
                    name="video1"
                    required
                    value={formData.video1}
                    onChange={handleChange}
                    placeholder="Video 1 URL"
                    className="w-full px-5 py-3 rounded-2xl text-sm outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                  <input
                    type="url"
                    name="video2"
                    value={formData.video2}
                    onChange={handleChange}
                    placeholder="Video 2 URL (Optional)"
                    className="w-full px-5 py-3 rounded-2xl text-sm outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                  <input
                    type="url"
                    name="video3"
                    value={formData.video3}
                    onChange={handleChange}
                    placeholder="Video 3 URL (Optional)"
                    className="w-full px-5 py-3 rounded-2xl text-sm outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                  How do you currently manage your TikTok content? *
                </label>
                <textarea
                  name="currentWorkflow"
                  required
                  rows={3}
                  value={formData.currentWorkflow}
                  onChange={handleChange}
                  placeholder="Describe your current planning & posting routine..."
                  className="w-full p-4 rounded-2xl text-sm outline-none"
                  style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 04: YOUR PAIN (Interactive Multiple Choice Cards) */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--lp-text-muted)' }}>
                04 / YOUR PAIN
              </span>
              <h2 className="lp-heading text-2xl md:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                Workflow Friction
              </h2>
            </div>

            <div className="space-y-6 pt-2">
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--lp-text-secondary)' }}>
                  What takes the most time in your process? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TIME_CONSUMING_OPTIONS.map((opt) => {
                    const isSelected = formData.timeConsumingPart === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setFormData((prev) => ({ ...prev, timeConsumingPart: opt }))}
                        className="p-4 rounded-2xl text-left border transition-all flex items-center justify-between"
                        style={{
                          background: isSelected ? 'var(--lp-cyan)' : 'var(--lp-bg-soft)',
                          color: isSelected ? '#090D14' : 'var(--lp-text-primary)',
                          borderColor: isSelected ? 'var(--lp-cyan)' : 'var(--lp-border)',
                          fontWeight: isSelected ? 700 : 500,
                        }}
                      >
                        <span className="text-xs sm:text-sm">{opt}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0" style={{ color: '#090D14' }} />}
                      </button>
                    );
                  })}
                </div>

                {formData.timeConsumingPart === 'Other workflow friction' && (
                  <div className="pt-2">
                    <input
                      type="text"
                      value={customTimeConsuming}
                      onChange={(e) => setCustomTimeConsuming(e.target.value)}
                      placeholder="Specify what takes the most time..."
                      className="w-full px-5 py-3 rounded-2xl text-sm outline-none"
                      style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--lp-text-secondary)' }}>
                  What part of your workflow should Oyinca remove? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REMOVE_WORKFLOW_OPTIONS.map((opt) => {
                    const isSelected = formData.workflowToRemove === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setFormData((prev) => ({ ...prev, workflowToRemove: opt }))}
                        className="p-4 rounded-2xl text-left border transition-all flex items-center justify-between"
                        style={{
                          background: isSelected ? 'var(--lp-cyan)' : 'var(--lp-bg-soft)',
                          color: isSelected ? '#090D14' : 'var(--lp-text-primary)',
                          borderColor: isSelected ? 'var(--lp-cyan)' : 'var(--lp-border)',
                          fontWeight: isSelected ? 700 : 500,
                        }}
                      >
                        <span className="text-xs sm:text-sm">{opt}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0" style={{ color: '#090D14' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 05: THE PROGRAM */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--lp-text-muted)' }}>
                05 / THE PROGRAM
              </span>
              <h2 className="lp-heading text-2xl md:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                Program Commitment
              </h2>
            </div>

            <div className="space-y-5 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                  Why do you want to become an Oyinca Founding TikTok Creator? *
                </label>
                <textarea
                  name="whyJoin"
                  required
                  rows={3}
                  value={formData.whyJoin}
                  onChange={handleChange}
                  placeholder="Tell us what excites you about helping build a better TikTok manager..."
                  className="w-full p-4 rounded-2xl text-sm outline-none"
                  style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                    Willing to test Oyinca for 7 days? *
                  </label>
                  <select
                    name="willingToTest7Days"
                    value={formData.willingToTest7Days}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  >
                    <option value="YES">Yes, absolutely</option>
                    <option value="MAYBE">Maybe</option>
                    <option value="NO">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                    Participate in 7-Day Autopilot Challenge? *
                  </label>
                  <select
                    name="willingAutopilotChallenge"
                    value={formData.willingAutopilotChallenge}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  >
                    <option value="YES">Yes, I'm in</option>
                    <option value="MAYBE">Maybe</option>
                    <option value="NO">No</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Bar */}
        <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: 'var(--lp-border)' }}>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-3 rounded-full text-xs font-bold uppercase tracking-wider lp-btn-ghost transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK
            </button>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider lp-btn-primary transition-transform active:scale-95 flex items-center gap-2 ml-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                SUBMITTING...
              </>
            ) : currentStep < totalSteps ? (
              <>
                CONTINUE
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                APPLY TO BECOME A FOUNDING CREATOR
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
