'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-react';
import { ReferralShareCard } from './ReferralShareCard';

interface EarlyAccessFormProps {
  initialReferralCode?: string;
}

const PROBLEM_OPTIONS = [
  'Consistency & posting daily',
  'Writing engaging captions & hashtags',
  'Spending too much time manually posting',
  'Brainstorming video ideas',
  'Tracking performance & analytics',
  'Other workflow challenge',
];

const WISH_OPTIONS = [
  'Auto-publishing & scheduling posts',
  'AI Caption & hashtag generation',
  'Content calendar planning',
  '7-Day TikTok Autopilot mode',
  'Growth & audience recommendations',
  'All of the above',
];

export function EarlyAccessForm({ initialReferralCode }: EarlyAccessFormProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    tiktokUsername: '',
    tiktokProfileUrl: '',
    followerRange: '1K–5K',
    niche: 'Business / Entrepreneurship',
    postingFrequency: 'Daily',
    country: 'Nigeria',
    biggestProblem: 'Consistency & posting daily',
    automationWish: 'Auto-publishing & scheduling posts',
    heardFrom: 'TikTok',
    preferredNextPlatform: 'Instagram',
  });

  const [customProblem, setCustomProblem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const totalSteps = 5;

  // Prevent auto-scrolling to middle of page on initial render
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
      if (!formData.tiktokUsername.trim()) {
        setError('Please enter your TikTok username.');
        return;
      }
    } else if (currentStep === 3) {
      const problemValue = formData.biggestProblem === 'Other workflow challenge' ? customProblem : formData.biggestProblem;
      if (!problemValue.trim()) {
        setError('Please select or specify your biggest TikTok management problem.');
        return;
      }
    } else if (currentStep === 4) {
      if (!formData.automationWish.trim()) {
        setError('Please select what you would most want Oyinca to handle for you.');
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

    const problemValue = formData.biggestProblem === 'Other workflow challenge' ? customProblem : formData.biggestProblem;

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
          biggestProblem: problemValue,
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
                Let's start with the basics.
              </h2>
              <p className="text-xs md:text-sm mt-1.5" style={{ color: 'var(--lp-text-secondary)' }}>
                Just a few details. We'll take it from here.
              </p>
            </div>

            <div className="space-y-5 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-5 py-3.5 rounded-2xl text-base outline-none transition-all"
                  style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="alex@creator.com"
                  className="w-full px-5 py-3.5 rounded-2xl text-base outline-none transition-all"
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
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--lp-text-muted)' }}>
                02 / YOUR TIKTOK
              </span>
              <h2 className="lp-heading text-2xl md:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                Tell us about your TikTok.
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
                      className="w-full pl-9 pr-4 py-3.5 rounded-2xl text-base outline-none transition-all"
                      style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                    />
                  </div>
                </div>

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
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                    Primary Niche *
                  </label>
                  <select
                    name="niche"
                    value={formData.niche}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-2xl text-base outline-none"
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
                    <option value="Occasional">Occasional</option>
                  </select>
                </div>
              </div>

              {/* Country Select (Nigeria Primary) */}
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
            </div>
          </div>
        )}

        {/* STEP 03: YOUR WORKFLOW (Multiple Choice Card Design) */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--lp-text-muted)' }}>
                03 / YOUR WORKFLOW
              </span>
              <h2 className="lp-heading text-2xl md:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                Where does TikTok take the most time?
              </h2>
            </div>

            <div className="space-y-4 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--lp-text-secondary)' }}>
                What is the biggest problem you have managing your TikTok right now? *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROBLEM_OPTIONS.map((opt) => {
                  const isSelected = formData.biggestProblem === opt;
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => setFormData((prev) => ({ ...prev, biggestProblem: opt }))}
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

              {formData.biggestProblem === 'Other workflow challenge' && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={customProblem}
                    onChange={(e) => setCustomProblem(e.target.value)}
                    placeholder="Specify your specific workflow challenge..."
                    className="w-full px-5 py-3 rounded-2xl text-sm outline-none"
                    style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 04: OYINCA (Multiple Choice Card Design) */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--lp-text-muted)' }}>
                04 / OYINCA
              </span>
              <h2 className="lp-heading text-2xl md:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                What should Oyinca take off your plate?
              </h2>
            </div>

            <div className="space-y-4 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--lp-text-secondary)' }}>
                What would you most want Oyinca to handle for you? *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WISH_OPTIONS.map((opt) => {
                  const isSelected = formData.automationWish === opt;
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => setFormData((prev) => ({ ...prev, automationWish: opt }))}
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
        )}

        {/* STEP 05: DISCOVERY & FINISH (High-Contrast Buttons) */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--lp-text-muted)' }}>
                05 / DISCOVERY
              </span>
              <h2 className="lp-heading text-2xl md:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
                How did you find Oyinca?
              </h2>
            </div>

            <div className="space-y-5 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--lp-text-secondary)' }}>
                  Acquisition Channel *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['TikTok', 'Friend / Creator', 'X / Twitter', 'Instagram', 'WhatsApp', 'Other'].map((channel) => {
                    const isSelected = formData.heardFrom === channel;
                    return (
                      <button
                        type="button"
                        key={channel}
                        onClick={() => setFormData((prev) => ({ ...prev, heardFrom: channel }))}
                        className="p-3.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between"
                        style={{
                          background: isSelected ? 'var(--lp-cyan)' : 'var(--lp-bg-soft)',
                          color: isSelected ? '#090D14' : 'var(--lp-text-primary)',
                          borderColor: isSelected ? 'var(--lp-cyan)' : 'var(--lp-border)',
                        }}
                      >
                        <span>{channel}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: '#090D14' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
                  Which platform should Oyinca support next? (Optional)
                </label>
                <select
                  name="preferredNextPlatform"
                  value={formData.preferredNextPlatform}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-2xl text-base outline-none"
                  style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                >
                  <option value="Instagram">Instagram</option>
                  <option value="YouTube Shorts">YouTube Shorts</option>
                  <option value="X">X (Twitter)</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Facebook">Facebook</option>
                </select>
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
                JOIN EARLY ACCESS
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
