'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-react';
import { ReferralShareCard } from './ReferralShareCard';

interface EarlyAccessFormProps {
  initialReferralCode?: string;
}

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

const HANDLE_OPTIONS = [
  'Automatically publish & schedule my posts',
  'Write captions & hashtags',
  'Plan my content calendar',
  'Keep my TikTok running with Autopilot',
  'Give me content & growth recommendations',
  'Everything above',
];

const SOURCE_OPTIONS = [
  'TikTok',
  'Friend / Creator',
  'X',
  'Instagram',
  'WhatsApp',
  'Other',
];

export function EarlyAccessForm({ initialReferralCode }: EarlyAccessFormProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    tiktokUsername: '',
    followerRange: '1K–5K',
    niche: 'Business / Entrepreneurship',
    postingFrequency: 'Daily',
    country: 'Nigeria',
    contentType: '',
    timeConsumingParts: ['Writing captions & hashtags', 'Uploading & scheduling posts'] as string[],
    customTimePart: '',
    handleWishes: ['Automatically publish & schedule my posts', 'Write captions & hashtags'] as string[],
    sources: ['TikTok'] as string[],
    customSource: '',
    videoParticipation: "Yes, I'd be happy to",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

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
  const toggleArrayOption = (field: 'timeConsumingParts' | 'handleWishes' | 'sources', option: string) => {
    setFormData((prev) => {
      const current = [...prev[field]];

      if (field === 'handleWishes' && option === 'Everything above') {
        if (current.includes('Everything above')) {
          return { ...prev, handleWishes: [] };
        } else {
          return { ...prev, handleWishes: [...HANDLE_OPTIONS] };
        }
      }

      if (current.includes(option)) {
        const next = current.filter((item) => item !== option && item !== 'Everything above');
        return { ...prev, [field]: next };
      } else {
        const next = [...current, option];
        if (field === 'handleWishes' && next.length >= HANDLE_OPTIONS.length - 1 && !next.includes('Everything above')) {
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
    } else if (currentStep === 4) {
      if (formData.timeConsumingParts.length === 0) {
        setError('Please select at least one option for what takes up most of your time.');
        return;
      }
      if (formData.handleWishes.length === 0) {
        setError('Please select at least one feature you would love Oyinca to handle.');
        return;
      }
    } else if (currentStep === 5) {
      if (formData.sources.length === 0) {
        setError('Please select how you discovered Oyinca.');
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

    const biggestProblemText = formData.timeConsumingParts
      .map((item) => (item === 'Other' && formData.customTimePart ? formData.customTimePart : item))
      .join(', ');

    const automationWishText = formData.handleWishes.join(', ');

    const heardFromText = formData.sources
      .map((item) => (item === 'Other' && formData.customSource ? formData.customSource : item))
      .join(', ');

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
          fullName: formData.fullName.trim(),
          email: formData.email.toLowerCase().trim(),
          tiktokUsername: formData.tiktokUsername.trim(),
          followerRange: formData.followerRange,
          niche: formData.niche,
          postingFrequency: formData.postingFrequency,
          country: formData.country,
          biggestProblem: biggestProblemText || 'N/A',
          automationWish: automationWishText || 'N/A',
          heardFrom: heardFromText || 'TikTok',
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
              <span className="text-xs font-mono uppercase tracking-widest text-[#7E8CA3]">
                01 / ABOUT YOU
              </span>
              <h2 className="lp-heading-display text-3xl sm:text-4xl font-bold text-white mt-2">
                Let's start with the basics.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5">
                Just a few details. We'll take it from here.
              </p>
            </div>

            <div className="space-y-5 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-5 py-4 rounded-2xl text-base outline-none transition-all"
                  style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="alex@creator.com"
                  className="w-full px-5 py-4 rounded-2xl text-base outline-none transition-all"
                  style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 02: YOUR TIKTOK */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#7E8CA3]">
                02 / YOUR TIKTOK
              </span>
              <h2 className="lp-heading-display text-3xl sm:text-4xl font-bold text-white mt-2">
                Tell us about your TikTok.
              </h2>
            </div>

            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="w-full pl-9 pr-4 py-4 rounded-2xl text-base outline-none transition-all"
                      style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                    />
                  </div>
                </div>

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
                    <option value="Under 1K">Under 1K (Getting Started)</option>
                    <option value="1K–5K">1K–5K</option>
                    <option value="5K–10K">5K–10K</option>
                    <option value="10K–50K">10K–50K</option>
                    <option value="50K–100K">50K–100K</option>
                    <option value="100K–500K">100K–500K</option>
                    <option value="500K+">500K+</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
                    Content Niche *
                  </label>
                  <select
                    name="niche"
                    value={formData.niche}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl text-base outline-none cursor-pointer"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
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
                    <option value="Occasional">Occasional</option>
                  </select>
                </div>
              </div>

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
            </div>
          </div>
        )}

        {/* STEP 03: YOUR CONTENT */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#7E8CA3]">
                03 / YOUR CONTENT
              </span>
              <h2 className="lp-heading-display text-3xl sm:text-4xl font-bold text-white mt-2">
                What kind of content do you create?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5">
                One or two sentences is enough.
              </p>
            </div>

            <div className="pt-2">
              <textarea
                name="contentType"
                required
                rows={4}
                value={formData.contentType}
                onChange={handleChange}
                placeholder="e.g. Talking-head videos explaining business strategies, product breakdowns, and daily founder vlogs..."
                className="w-full p-5 rounded-2xl text-base outline-none leading-relaxed transition-all"
                style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
              />
            </div>
          </div>
        )}

        {/* STEP 04: WHAT SHOULD OYINCA HANDLE? (MULTI-SELECT) */}
        {currentStep === 4 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#7E8CA3]">
                04 / WHAT SHOULD OYINCA HANDLE?
              </span>
              <h2 className="lp-heading-display text-3xl sm:text-4xl font-bold text-white mt-2">
                Your TikTok Workflow
              </h2>
            </div>

            {/* Question 1: What takes up most of your time on TikTok? */}
            <div className="space-y-3">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
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
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  What would you love Oyinca to take off your plate?
                </h3>
                <p className="text-xs text-[#7FB0DB] font-mono mt-0.5">Select all that apply.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {HANDLE_OPTIONS.map((opt) => {
                  const isSelected = formData.handleWishes.includes(opt);
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => toggleArrayOption('handleWishes', opt)}
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

        {/* STEP 05: JOINING EARLY */}
        {currentStep === 5 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#7E8CA3]">
                05 / JOINING EARLY
              </span>
              <h2 className="lp-heading-display text-3xl sm:text-4xl font-bold text-white mt-2">
                Discovery & Feedback
              </h2>
            </div>

            {/* Question 1: How did you find Oyinca? (MULTI-SELECT) */}
            <div className="space-y-3">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  How did you find Oyinca?
                </h3>
                <p className="text-xs text-[#7FB0DB] font-mono mt-0.5">Select all that apply.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {SOURCE_OPTIONS.map((src) => {
                  const isSelected = formData.sources.includes(src);
                  return (
                    <button
                      type="button"
                      key={src}
                      onClick={() => toggleArrayOption('sources', src)}
                      className="p-4 rounded-2xl text-left border transition-all flex items-center justify-between cursor-pointer"
                      style={{
                        background: isSelected ? 'var(--lp-cyan)' : 'var(--lp-bg-soft)',
                        color: isSelected ? '#090D14' : 'var(--lp-text-primary)',
                        borderColor: isSelected ? 'var(--lp-cyan)' : 'var(--lp-border)',
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      <span className="text-xs sm:text-sm">{src}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-[#090D14]" />}
                    </button>
                  );
                })}
              </div>

              {formData.sources.includes('Other') && (
                <input
                  type="text"
                  value={formData.customSource}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customSource: e.target.value }))}
                  placeholder="Specify how you discovered Oyinca..."
                  className="w-full px-5 py-3.5 rounded-2xl text-sm outline-none mt-2"
                  style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                />
              )}
            </div>

            {/* Question 2: 15-20 Second Video Question */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  If you join early, would you be open to sharing a short 15–20 second video about your experience with Oyinca?
                </h3>
                <p className="text-xs text-slate-400 mt-1">Nothing polished — just your honest experience.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {["Yes, I'd be happy to", 'Maybe', 'Not right now'].map((opt) => {
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
                JOIN EARLY ACCESS →
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
