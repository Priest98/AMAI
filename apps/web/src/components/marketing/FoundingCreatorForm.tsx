'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Trophy, AlertCircle, Check } from 'lucide-react';

const HARD_PART_OPTIONS = [
  'Coming up with content ideas',
  'Writing captions',
  'Staying consistent',
  'Planning & scheduling',
  'Managing multiple accounts',
  'Understanding analytics',
  'Finding time',
  'Other',
];

const TIME_OPTIONS = [
  'Coming up with video ideas',
  'Writing captions & hashtags',
  'Planning my content',
  'Uploading & scheduling posts',
  'Checking my performance & analytics',
  'Editing videos',
  'Staying consistent',
  'Other',
];

const TAKE_OFF_PLATE_OPTIONS = [
  'Automatically publish & schedule my posts',
  'Write captions & hashtags',
  'Plan my content calendar',
  'Keep my TikTok running with Autopilot',
  'Give me content & growth recommendations',
  'Everything above',
];

export function FoundingCreatorForm() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    country: 'Nigeria',
    preferredContact: 'WhatsApp',
    tiktokUsername: '',
    followerRange: '5K–10K',
    averageViews: '1K–5K',
    niche: 'Business / Entrepreneurship',
    postingFrequency: 'Daily',
    accountsManagedCount: 1,
    contentType: '',
    video1: '',
    video2: '',
    video3: '',
    hardestParts: ['Staying consistent', 'Planning & scheduling'] as string[],
    customHardestPart: '',
    timeConsumingParts: ['Writing captions & hashtags', 'Uploading & scheduling posts'] as string[],
    customTimePart: '',
    takeOffPlateWishes: ['Automatically publish & schedule my posts', 'Write captions & hashtags'] as string[],
    willingToTest7Days: "Yes, I'm in",
    willingAutopilotChallenge: "Yes, I'm in",
    videoParticipation: "Yes, I'm in",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const totalSteps = 5;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Multi-select toggle helper for array fields
  const toggleArrayOption = (field: 'hardestParts' | 'timeConsumingParts' | 'takeOffPlateWishes', option: string) => {
    setFormData((prev) => {
      const current = [...prev[field]];

      if (field === 'takeOffPlateWishes' && option === 'Everything above') {
        if (current.includes('Everything above')) {
          return { ...prev, takeOffPlateWishes: [] };
        } else {
          return { ...prev, takeOffPlateWishes: [...TAKE_OFF_PLATE_OPTIONS] };
        }
      }

      if (current.includes(option)) {
        const next = current.filter((item) => item !== option && item !== 'Everything above');
        return { ...prev, [field]: next };
      } else {
        const next = [...current, option];
        if (field === 'takeOffPlateWishes' && next.length >= TAKE_OFF_PLATE_OPTIONS.length - 1 && !next.includes('Everything above')) {
          next.push('Everything above');
        }
        return { ...prev, [field]: next };
      }
    });
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
      if (!formData.tiktokUsername.trim()) {
        setError('Please enter your TikTok username.');
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.contentType.trim()) {
        setError('Please briefly describe the kind of content you create.');
        return;
      }
      if (!formData.video1.trim()) {
        setError('Please provide at least 1 TikTok video link you are proud of.');
        return;
      }
      if (formData.hardestParts.length === 0) {
        setError("Please select at least one option for what's hardest about keeping your TikTok running.");
        return;
      }
    } else if (currentStep === 4) {
      if (formData.timeConsumingParts.length === 0) {
        setError('Please select at least one option for what takes up most of your time.');
        return;
      }
      if (formData.takeOffPlateWishes.length === 0) {
        setError('Please select at least one option for what you would love Oyinca to take off your plate.');
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

    const hardestText = formData.hardestParts
      .map((item) => (item === 'Other' && formData.customHardestPart ? formData.customHardestPart : item))
      .join(', ');

    const timeConsumingText = formData.timeConsumingParts
      .map((item) => (item === 'Other' && formData.customTimePart ? formData.customTimePart : item))
      .join(', ');

    const takeOffPlateText = formData.takeOffPlateWishes.join(', ');

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
          fullName: formData.fullName.trim(),
          email: formData.email.toLowerCase().trim(),
          country: formData.country,
          preferredContact: formData.preferredContact,
          tiktokUsername: formData.tiktokUsername.trim(),
          followerRange: formData.followerRange,
          averageViews: formData.averageViews,
          postingFrequency: formData.postingFrequency,
          niche: formData.niche,
          accountsManagedCount: Number(formData.accountsManagedCount),
          sampleVideoUrls,
          currentWorkflow: formData.contentType || 'N/A',
          timeConsumingPart: timeConsumingText || 'N/A',
          videosPerWeek: 5,
          whyJoin: `Hardest: ${hardestText || 'N/A'}`,
          biggestProblem: hardestText || 'N/A',
          workflowToRemove: takeOffPlateText || 'N/A',
          willingToTest7Days: formData.willingToTest7Days,
          willingAutopilotChallenge: formData.willingAutopilotChallenge,
          videoParticipation: formData.videoParticipation,
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

        <h2 className="lp-heading-display text-2xl md:text-3xl font-bold" style={{ color: 'var(--lp-text-primary)' }}>
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
          Application ID: <code className="font-mono" style={{ color: 'var(--lp-text-primary)' }}>{result.application.id}</code>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto text-left space-y-8 sm:space-y-10">
      {/* Subtle Step Progress Header */}
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--lp-border)' }}>
        <div className="text-xs font-mono font-bold tracking-widest text-[#7FB0DB]">
          0{currentStep} / 0{totalSteps}
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div
              key={idx}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: currentStep === idx + 1 ? '28px' : '8px',
                background: currentStep >= idx + 1 ? 'var(--lp-cyan)' : 'var(--lp-border)',
              }}
            />
          ))}
        </div>
      </div>

      {error && (
        <div
          className="p-4 rounded-2xl border flex items-center gap-3 text-xs font-semibold"
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
              <span className="text-xs font-mono uppercase tracking-widest text-[#7FB0DB]">
                01 / ABOUT YOU
              </span>
              <h2 className="lp-heading-display text-3xl sm:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                Creator Information
              </h2>
            </div>

            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Jordan Reed"
                    className="w-full px-5 py-4 rounded-2xl text-base outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jordan@creator.com"
                    className="w-full px-5 py-4 rounded-2xl text-base outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                    Country *
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl text-base outline-none cursor-pointer"
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
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                    Preferred Contact Channel *
                  </label>
                  <select
                    name="preferredContact"
                    value={formData.preferredContact}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl text-base outline-none cursor-pointer"
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

        {/* STEP 02: YOUR TIKTOK (NO PROFILE URL) */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#7FB0DB]">
                02 / YOUR TIKTOK
              </span>
              <h2 className="lp-heading-display text-3xl sm:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                Your Channel Details
              </h2>
            </div>

            <div className="space-y-5 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                  TikTok Username *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-sm font-mono text-slate-400">@</span>
                  <input
                    type="text"
                    name="tiktokUsername"
                    required
                    value={formData.tiktokUsername}
                    onChange={handleChange}
                    placeholder="username"
                    className="w-full pl-9 pr-4 py-4 rounded-2xl text-base outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                    Follower Range *
                  </label>
                  <select
                    name="followerRange"
                    value={formData.followerRange}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl text-base outline-none cursor-pointer"
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
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                    Average Views *
                  </label>
                  <select
                    name="averageViews"
                    value={formData.averageViews}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl text-base outline-none cursor-pointer"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  >
                    <option value="Under 1K">Under 1K</option>
                    <option value="1K–5K">1K–5K</option>
                    <option value="5K–20K">5K–20K</option>
                    <option value="20K–100K">20K–100K</option>
                    <option value="100K+">100K+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                    Posting Frequency *
                  </label>
                  <select
                    name="postingFrequency"
                    value={formData.postingFrequency}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl text-base outline-none cursor-pointer"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  >
                    <option value="Multiple times daily">Multiple times daily</option>
                    <option value="Daily">Daily</option>
                    <option value="3-5 times a week">3-5 times a week</option>
                    <option value="1-2 times a week">1-2 times a week</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                    Content Niche *
                  </label>
                  <input
                    type="text"
                    name="niche"
                    required
                    value={formData.niche}
                    onChange={handleChange}
                    placeholder="e.g. SaaS Founder, Tech Reviews, Fashion, Fitness"
                    className="w-full px-5 py-4 rounded-2xl text-base outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                    TikTok Accounts Managed *
                  </label>
                  <select
                    name="accountsManagedCount"
                    value={formData.accountsManagedCount}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl text-base outline-none cursor-pointer"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  >
                    <option value={1}>1 Account</option>
                    <option value={2}>2 Accounts</option>
                    <option value={3}>3+ Accounts</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 03: YOUR CONTENT */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#7FB0DB]">
                03 / YOUR CONTENT
              </span>
              <h2 className="lp-heading-display text-3xl sm:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                What do you create?
              </h2>
            </div>

            <div className="space-y-6 pt-2">
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: 'var(--lp-text-primary)' }}>
                  What kind of content do you create?
                </label>
                <p className="text-xs mb-2" style={{ color: 'var(--lp-text-secondary)' }}>One or two sentences is enough.</p>
                <textarea
                  name="contentType"
                  required
                  rows={3}
                  value={formData.contentType}
                  onChange={handleChange}
                  placeholder="Describe your primary video style, themes, or creator focus..."
                  className="w-full p-4 rounded-2xl text-sm outline-none leading-relaxed"
                  style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: 'var(--lp-text-primary)' }}>
                  Share 1–3 TikToks you're proud of.
                </label>
                <p className="text-xs mb-2" style={{ color: 'var(--lp-text-secondary)' }}>Paste the links.</p>
                <div className="space-y-3">
                  <input
                    type="url"
                    name="video1"
                    required
                    value={formData.video1}
                    onChange={handleChange}
                    placeholder="TikTok Video 1 Link *"
                    className="w-full px-5 py-3.5 rounded-2xl text-sm outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                  <input
                    type="url"
                    name="video2"
                    value={formData.video2}
                    onChange={handleChange}
                    placeholder="TikTok Video 2 Link (Optional)"
                    className="w-full px-5 py-3.5 rounded-2xl text-sm outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                  <input
                    type="url"
                    name="video3"
                    value={formData.video3}
                    onChange={handleChange}
                    placeholder="TikTok Video 3 Link (Optional)"
                    className="w-full px-5 py-3.5 rounded-2xl text-sm outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-bold mb-1" style={{ color: 'var(--lp-text-primary)' }}>
                  What's the hardest part of keeping your TikTok running?
                </label>
                <p className="text-xs text-[#7FB0DB] font-mono mb-2">Select all that apply.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {HARD_PART_OPTIONS.map((opt) => {
                    const isSelected = formData.hardestParts.includes(opt);
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => toggleArrayOption('hardestParts', opt)}
                        className="p-4 rounded-2xl text-left border transition-all flex items-center justify-between cursor-pointer"
                        style={{
                          background: isSelected ? 'var(--lp-cyan)' : 'var(--lp-bg-soft)',
                          color: isSelected ? '#090D14' : 'var(--lp-text-primary)',
                          borderColor: isSelected ? 'var(--lp-cyan)' : 'var(--lp-border)',
                          fontWeight: isSelected ? 700 : 500,
                        }}
                      >
                        <span className="text-xs sm:text-sm">{opt}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0 text-[#090D14]" />}
                      </button>
                    );
                  })}
                </div>

                {formData.hardestParts.includes('Other') && (
                  <input
                    type="text"
                    value={formData.customHardestPart}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customHardestPart: e.target.value }))}
                    placeholder="Specify what is hardest for you..."
                    className="w-full px-5 py-3.5 rounded-2xl text-sm outline-none mt-2"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 04: WHAT SHOULD OYINCA HANDLE? (MULTI-SELECT) */}
        {currentStep === 4 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#7FB0DB]">
                04 / WHAT SHOULD OYINCA HANDLE?
              </span>
              <h2 className="lp-heading-display text-3xl sm:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                Workflow & Automation
              </h2>
            </div>

            {/* Question 1: What takes up most of your time on TikTok? */}
            <div className="space-y-3">
              <div>
                <h3 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--lp-text-primary)' }}>
                  What takes up most of your time on TikTok?
                </h3>
                <p className="text-xs text-[#7FB0DB] font-mono mt-0.5">Select all that apply.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {TIME_OPTIONS.map((opt) => {
                  const isSelected = formData.timeConsumingParts.includes(opt);
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => toggleArrayOption('timeConsumingParts', opt)}
                      className="p-4 rounded-2xl text-left border transition-all flex items-center justify-between cursor-pointer"
                      style={{
                        background: isSelected ? 'var(--lp-cyan)' : 'var(--lp-bg-soft)',
                        color: isSelected ? '#090D14' : 'var(--lp-text-primary)',
                        borderColor: isSelected ? 'var(--lp-cyan)' : 'var(--lp-border)',
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      <span className="text-xs sm:text-sm">{opt}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-[#090D14]" />}
                    </button>
                  );
                })}
              </div>

              {formData.timeConsumingParts.includes('Other') && (
                <input
                  type="text"
                  value={formData.customTimePart}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customTimePart: e.target.value }))}
                  placeholder="Specify what takes up most of your time..."
                  className="w-full px-5 py-3.5 rounded-2xl text-sm outline-none mt-2"
                  style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                />
              )}
            </div>

            {/* Question 2: What would you love Oyinca to take off your plate? */}
            <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--lp-border)' }}>
              <div>
                <h3 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--lp-text-primary)' }}>
                  What would you love Oyinca to take off your plate?
                </h3>
                <p className="text-xs text-[#7FB0DB] font-mono mt-0.5">Select all that apply.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {TAKE_OFF_PLATE_OPTIONS.map((opt) => {
                  const isSelected = formData.takeOffPlateWishes.includes(opt);
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => toggleArrayOption('takeOffPlateWishes', opt)}
                      className="p-4 rounded-2xl text-left border transition-all flex items-center justify-between cursor-pointer"
                      style={{
                        background: isSelected ? 'var(--lp-cyan)' : 'var(--lp-bg-soft)',
                        color: isSelected ? '#090D14' : 'var(--lp-text-primary)',
                        borderColor: isSelected ? 'var(--lp-cyan)' : 'var(--lp-border)',
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      <span className="text-xs sm:text-sm">{opt}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-[#090D14]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 05: READY TO BUILD WITH US? */}
        {currentStep === 5 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#7FB0DB]">
                05 / READY TO BUILD WITH US?
              </span>
              <h2 className="lp-heading-display text-3xl sm:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                Program Commitment
              </h2>
            </div>

            {/* Question 1: If selected, can you commit to trying Oyinca for 7 days? */}
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--lp-text-primary)' }}>
                If selected, can you commit to trying Oyinca for 7 days?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {["Yes, I'm in", 'Maybe', "I'm not sure yet"].map((opt) => {
                  const isSelected = formData.willingToTest7Days === opt;
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => setFormData((prev) => ({ ...prev, willingToTest7Days: opt }))}
                      className="p-4 rounded-2xl text-left border transition-all flex items-center justify-between cursor-pointer"
                      style={{
                        background: isSelected ? 'var(--lp-cyan)' : 'var(--lp-bg-soft)',
                        color: isSelected ? '#090D14' : 'var(--lp-text-primary)',
                        borderColor: isSelected ? 'var(--lp-cyan)' : 'var(--lp-border)',
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      <span className="text-xs sm:text-sm">{opt}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-[#090D14]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question 2: Would you be interested in joining the 7-Day Autopilot Challenge? */}
            <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--lp-border)' }}>
              <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--lp-text-primary)' }}>
                Would you be interested in joining the 7-Day Autopilot Challenge?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {["Yes, I'm in", 'Maybe', 'Not this time'].map((opt) => {
                  const isSelected = formData.willingAutopilotChallenge === opt;
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => setFormData((prev) => ({ ...prev, willingAutopilotChallenge: opt }))}
                      className="p-4 rounded-2xl text-left border transition-all flex items-center justify-between cursor-pointer"
                      style={{
                        background: isSelected ? 'var(--lp-cyan)' : 'var(--lp-bg-soft)',
                        color: isSelected ? '#090D14' : 'var(--lp-text-primary)',
                        borderColor: isSelected ? 'var(--lp-cyan)' : 'var(--lp-border)',
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      <span className="text-xs sm:text-sm">{opt}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-[#090D14]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question 3: 15-20 Second Video Question */}
            <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--lp-border)' }}>
              <div>
                <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--lp-text-primary)' }}>
                  If selected, would you be open to creating a short 15–20 second video sharing your experience with Oyinca?
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--lp-text-secondary)' }}>Nothing overly produced. Just your honest experience using Oyinca.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {["Yes, I'm in", 'Maybe', 'Not this time'].map((opt) => {
                  const isSelected = formData.videoParticipation === opt;
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => setFormData((prev) => ({ ...prev, videoParticipation: opt }))}
                      className="p-4 rounded-2xl text-left border transition-all flex items-center justify-between cursor-pointer"
                      style={{
                        background: isSelected ? 'var(--lp-cyan)' : 'var(--lp-bg-soft)',
                        color: isSelected ? '#090D14' : 'var(--lp-text-primary)',
                        borderColor: isSelected ? 'var(--lp-cyan)' : 'var(--lp-border)',
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      <span className="text-xs sm:text-sm">{opt}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-[#090D14]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider lp-btn-ghost transition-colors flex items-center gap-2"
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
            className="px-8 py-4 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider lp-btn-primary transition-transform active:scale-95 flex items-center gap-2 ml-auto shadow-xl"
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
                SUBMIT APPLICATION →
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
