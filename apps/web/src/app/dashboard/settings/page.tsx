"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { brandFetch, getCurrentUser } from '@/lib/api';
import { getBillingSummary, startCheckout, openBillingPortal, formatBytes, BillingSummary } from '@/lib/billing';
import UsageBar from '@/components/billing/UsageBar';
import { useOnboarding } from '@/components/onboarding/OnboardingContext';
import {
  Building,
  User,
  Check,
  Zap,
  LifeBuoy,
  RotateCcw,
  Brain,
  CreditCard,
  Sparkles,
  Wand2,
  Zap as ZapIcon,
  Building2,
} from 'lucide-react';

type ApprovalMode = 'MANUAL' | 'AUTO';

/**
 * Emoji is kept separate from the label (it used to be baked into one
 * string) so each persona can render as a real card with its own icon slot
 * and title, and so the selected persona can explain what picking it
 * actually changes. `tone` is the value sent to the API and must not change.
 */
const PERSONAS = [
  { emoji: '👗', label: 'Fashion Designer', tone: 'Fashion Designer', effect: 'fashion-focused vocabulary, styling angles and trend-led hashtags' },
  { emoji: '🛍️', label: 'Small Business Owner', tone: 'Small Business', effect: 'approachable, community-minded language and local discovery hashtags' },
  { emoji: '🍽️', label: 'Restaurant / Bistro', tone: 'Restaurant', effect: 'appetite-led descriptions, menu framing and food discovery hashtags' },
  { emoji: '🏡', label: 'Real Estate & Realty', tone: 'Real Estate', effect: 'property-led detail, location framing and buyer-intent hashtags' },
  { emoji: '💄', label: 'Beauty & Skincare', tone: 'Beauty', effect: 'results-led language, routine framing and beauty discovery hashtags' },
  { emoji: '💪', label: 'Fitness & Health', tone: 'Fitness', effect: 'motivational language, progress framing and fitness community hashtags' },
];

interface BusinessBrain {
  businessDescription: string | null;
  targetAudience: string | null;
  brandVoice: string | null;
  brandPersonality: string[];
  contentPillars: string[];
  goals: string[];
  competitiveContext: string | null;
  avoidTopics: string[];
  websiteUrl: string | null;
}

const EMPTY_BRAIN: BusinessBrain = {
  businessDescription: '',
  targetAudience: '',
  brandVoice: '',
  brandPersonality: [],
  contentPillars: [],
  goals: [],
  competitiveContext: '',
  avoidTopics: [],
  websiteUrl: '',
};

/** "a, b,  c" -> ["a", "b", "c"] -- trims, drops empties, keeps input forgiving. */
function parseTagList(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * One labelled field. Extracted so every Business Brain input gets the same
 * label -> helper -> control rhythm and the same accessibility wiring
 * (htmlFor/id plus aria-describedby pointing at the helper) rather than each
 * field re-implementing it. Previously the placeholder was carrying the
 * explanation, which is what made the form read as a questionnaire: the
 * purpose of a field vanished the moment you started typing in it.
 */
function BrainField({
  id,
  label,
  helper,
  optional,
  children,
}: {
  id: string;
  label: string;
  helper?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <label htmlFor={id} className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {label}
        </label>
        {optional && (
          <span className="text-caption" style={{ color: 'var(--text-muted)' }}>Optional</span>
        )}
      </div>
      {helper && (
        <p id={`${id}-helper`} className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {helper}
        </p>
      )}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

/** Groups related fields under a quiet section heading so the form scans as three short blocks instead of one wall of inputs. */
function BrainSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <h4 className="text-overline" style={{ color: 'var(--text-muted)' }}>{title}</h4>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'publishing';
  const [activeTab, setActiveTab] = useState<'publishing' | 'brain' | 'billing' | 'profile' | 'help'>(
    ['publishing', 'brain', 'billing', 'profile', 'help'].includes(initialTab) ? initialTab : 'publishing',
  );
  const onboarding = useOnboarding();

  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<'PRO' | 'AGENCY' | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    getBillingSummary()
      .then(setBilling)
      .catch(() => {})
      .finally(() => setBillingLoading(false));
  }, []);

  const handleUpgrade = async (plan: 'PRO' | 'AGENCY') => {
    setCheckoutLoading(plan);
    try {
      await startCheckout(plan);
    } catch (e: any) {
      flash(e.message || 'Could not start checkout.');
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } catch (e: any) {
      flash(e.message || 'Could not open billing portal.');
      setPortalLoading(false);
    }
  };
  const [approvalMode, setApprovalModeState] = useState<ApprovalMode>('MANUAL');
  const [globalPersona, setGlobalPersona] = useState<string>('Fashion Designer');
  const [userEmail, setUserEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const [brain, setBrain] = useState<BusinessBrain>(EMPTY_BRAIN);
  const [brainSaving, setBrainSaving] = useState(false);
  // Tag-list fields are edited as free text and only parsed into arrays on
  // save/blur, so typing "fitness, nutrit" doesn't fight the user mid-word.
  const [personalityText, setPersonalityText] = useState('');
  const [pillarsText, setPillarsText] = useState('');
  const [goalsText, setGoalsText] = useState('');
  const [avoidText, setAvoidText] = useState('');

  const [contentIdeas, setContentIdeas] = useState<{ pillar: string | null; idea: string; why: string }[] | null>(null);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasMessage, setIdeasMessage] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setUserEmail(user.email);

    Promise.all([
      brandFetch<{ approvalMode: ApprovalMode; defaultTone: string }>('/engine/state'),
      brandFetch<BusinessBrain>('/business-brain'),
    ])
      .then(([cfg, brainData]) => {
        setApprovalModeState(cfg.approvalMode);
        if (cfg.defaultTone) setGlobalPersona(cfg.defaultTone);

        setBrain(brainData);
        setPersonalityText((brainData.brandPersonality || []).join(', '));
        setPillarsText((brainData.contentPillars || []).join(', '));
        setGoalsText((brainData.goals || []).join(', '));
        setAvoidText((brainData.avoidTopics || []).join(', '));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveBrain = async () => {
    setBrainSaving(true);
    try {
      const dto = {
        businessDescription: brain.businessDescription || null,
        targetAudience: brain.targetAudience || null,
        brandVoice: brain.brandVoice || null,
        competitiveContext: brain.competitiveContext || null,
        websiteUrl: brain.websiteUrl || null,
        brandPersonality: parseTagList(personalityText),
        contentPillars: parseTagList(pillarsText),
        goals: parseTagList(goalsText),
        avoidTopics: parseTagList(avoidText),
        brainSetupCompleted: true,
      };
      const updated = await brandFetch<BusinessBrain>('/business-brain', { method: 'PATCH', body: JSON.stringify(dto) });
      setBrain(updated);
      flash('Changes saved. AMAI will use this for every new caption and hashtag set.');
    } catch (e: any) {
      flash("Couldn't save changes. Try again.");
    } finally {
      setBrainSaving(false);
    }
  };

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  /**
   * P1 AI content intelligence: concrete ideas grounded in whatever's
   * actually saved to the Business Brain right now. Saves first if there
   * are unsaved edits, so ideas are never generated from stale context.
   */
  const handleGetContentIdeas = async () => {
    setIdeasLoading(true);
    setIdeasMessage('');
    try {
      await saveBrain();
      const result = await brandFetch<{ ideas: { pillar: string | null; idea: string; why: string }[]; reason?: string }>(
        '/business-brain/content-ideas',
        { method: 'POST', body: JSON.stringify({}) },
      );
      setContentIdeas(result.ideas);
      if (result.ideas.length === 0) {
        setIdeasMessage(result.reason || "Couldn't generate ideas right now. Try again in a moment.");
      }
    } catch (e: any) {
      setContentIdeas(null);
      setIdeasMessage(e.message || "Couldn't generate content ideas. Try again.");
    } finally {
      setIdeasLoading(false);
    }
  };

  const handleTogglePublishingMode = async (mode: ApprovalMode) => {
    setApprovalModeState(mode);
    try {
      await brandFetch('/engine/approval-mode', { method: 'PATCH', body: JSON.stringify({ approvalMode: mode }) });
      flash(`Approval mode updated to ${mode === 'AUTO' ? 'Auto Approval' : 'Manual Approval'}.`);
    } catch (e: any) {
      flash(e.message || 'Could not update approval mode.');
    }
  };

  const handlePersonaSelect = async (tone: string) => {
    setGlobalPersona(tone);
    try {
      await brandFetch('/engine/config', { method: 'PATCH', body: JSON.stringify({ defaultTone: tone }) });
      flash('Persona updated.');
    } catch (e: any) {
      flash(e.message || 'Could not update persona.');
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>Loading settings…</div>;
  }

  // page-shell caps the measure at 960px (up from max-w-4xl / 896px) so
  // large monitors get a bit more usable width without the content
  // stretching into an uncomfortable reading line. Bottom padding now comes
  // from the dashboard layout, which accounts for the fixed mobile tab bar,
  // so it isn't duplicated here.
  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Approval mode, brand persona, and your account.</p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-[var(--radius-lg)] border text-xs font-semibold flex items-center space-x-2"
            style={{ backgroundColor: 'var(--accent-success-subtle)', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}
          >
            <Check className="h-4 w-4" />
            <span>{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation
          Five tabs previously shared one flex row with flex-1 + truncate, so
          on anything narrow the labels were clipped to a few characters and
          the hit areas shrank below a comfortable tap. Now the row scrolls
          horizontally on small screens (tabs keep their full label and a
          real tap target) and only stretches to fill the row from md up,
          where there's genuinely space for five equal tabs. */}
      <div
        className="surface-tile p-1.5 flex gap-1.5 overflow-x-auto md:overflow-visible scrollbar-none"
        role="tablist"
        aria-label="Settings sections"
      >
        {[
          { id: 'publishing', label: 'Approval & Persona', icon: Zap },
          { id: 'brain', label: 'Business Brain', icon: Brain },
          { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'help', label: 'Help & Support', icon: LifeBuoy },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id as any)}
              className="relative shrink-0 md:shrink md:flex-1 py-2.5 px-3.5 rounded-[var(--radius-md)] text-body-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 touch-target whitespace-nowrap"
              style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {isActive && (
                <motion.div
                  layoutId="settingsTabPill"
                  className="absolute inset-0 rounded-[var(--radius-md)]"
                  style={{ backgroundColor: 'var(--bg-surface-raised)', boxShadow: 'var(--elevation-1)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="h-4 w-4 relative z-10 shrink-0" style={{ color: isActive ? 'var(--accent-secondary)' : 'var(--text-muted)' }} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'publishing' && (
        <div className="space-y-6">
          <div className="exec-card card-pad space-y-5">
            <div>
              <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Approval Mode</h3>
              <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Control whether AMAI-prepared posts require your review before publishing.</p>
            </div>

            {/* Two real choice cards rather than compressed rows: the title
                gets its own line at a readable weight, the description sits
                a clear step below it, and the selected state is a ring plus
                a labelled dot instead of a bare 8px pip. Stacks on mobile. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Approval mode">
              {([
                {
                  mode: 'MANUAL' as const,
                  title: 'Manual Approval',
                  hint: 'Default',
                  desc: 'Review every post before it goes live. Posts wait in your Approval Queue.',
                  accent: 'var(--accent-success)',
                  subtle: 'var(--accent-success-subtle)',
                },
                {
                  mode: 'AUTO' as const,
                  title: 'Auto Approval',
                  hint: null,
                  desc: 'AMAI publishes automatically during AI-selected peak engagement windows.',
                  accent: 'var(--accent-warning)',
                  subtle: 'var(--accent-warning-subtle)',
                },
              ]).map((opt) => {
                const active = approvalMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => handleTogglePublishingMode(opt.mode)}
                    className="text-left p-5 rounded-[var(--radius-lg)] border transition-all duration-200 h-full flex flex-col"
                    style={active
                      ? { borderColor: opt.accent, backgroundColor: opt.subtle, boxShadow: `0 0 0 1px ${opt.accent}` }
                      : { borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-body font-bold" style={{ color: 'var(--text-primary)' }}>
                        {opt.title}
                      </span>
                      <span
                        className="h-4 w-4 shrink-0 mt-0.5 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: active ? opt.accent : 'var(--card-border)' }}
                      >
                        {active && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: opt.accent }} />}
                      </span>
                    </div>
                    {opt.hint && (
                      <span className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>{opt.hint}</span>
                    )}
                    <p className="text-body-sm leading-relaxed mt-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="exec-card card-pad space-y-5">
            <div>
              <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Brand Persona</h3>
              <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Sets the tone, vocabulary, and hashtags AMAI uses when writing captions.</p>
            </div>

            {/* 1 col mobile / 2 tablet / 3 desktop, each a comfortably
                tappable card with a dedicated icon slot rather than a
                compact text pill. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="radiogroup" aria-label="Brand persona">
              {PERSONAS.map((persona) => {
                const active = globalPersona === persona.tone;
                return (
                  <button
                    key={persona.tone}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => handlePersonaSelect(persona.tone)}
                    className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border transition-all duration-200 text-left touch-target"
                    style={active
                      ? { borderColor: 'var(--accent-secondary)', backgroundColor: 'var(--accent-secondary-subtle)', boxShadow: '0 0 0 1px var(--accent-secondary)' }
                      : { borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)' }}
                  >
                    <span className="text-lg leading-none shrink-0" aria-hidden="true">{persona.emoji}</span>
                    <span
                      className="text-body-sm font-bold leading-snug"
                      style={{ color: active ? 'var(--accent-secondary)' : 'var(--text-primary)' }}
                    >
                      {persona.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tells the user what the choice actually does, so the persona
                reads as a real AI configuration rather than a cosmetic tag. */}
            {(() => {
              const selected = PERSONAS.find((p) => p.tone === globalPersona);
              if (!selected) return null;
              return (
                <div
                  className="flex items-start gap-2.5 p-3.5 rounded-[var(--radius-md)] border"
                  style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)' }}
                >
                  <Wand2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--accent-secondary)' }} />
                  <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.label}</span>{' '}
                    selected. AMAI will use {selected.effect} when generating your posts.
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {activeTab === 'brain' && (
        <div className="space-y-6">
          <div className="exec-card card-pad space-y-5">
            <div>
              <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Business Brain</h3>
              <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                Tell AMAI about your business once. It uses this context to create better content and recommendations.
              </p>
            </div>

            {/* NOTE -- "Let AMAI fill this in" (spec §6) is intentionally NOT
                implemented here. It needs a real backend route
                (POST /brands/:brandId/business-brain/suggest) plus a generic
                text-generation method on AiService, which currently only
                exposes analyzeImage / generateCaption / generateHashtags /
                predictBestPostingTime. That is backend work, and the brief
                for this pass says not to change backend logic. Shipping the
                button without the route would give users a control that
                always errors, so the UI is left out until the endpoint
                exists rather than faked. */}

            {/* Three short groups instead of one uninterrupted column of ten
                inputs. Only the first group is needed to make AMAI useful --
                everything after it is explicitly optional, so the form reads
                as a few minutes of work rather than a questionnaire. */}
            <div className="space-y-8">
              <BrainSection title="About your business">
                <BrainField
                  id="bb-description"
                  label="What does your business do?"
                  helper="Tell AMAI what you sell and who you serve."
                >
                  <textarea
                    id="bb-description"
                    aria-describedby="bb-description-helper"
                    className="input-field w-full min-h-[76px] px-3.5 py-2.5"
                    placeholder="e.g. We make handmade leather bags."
                    value={brain.businessDescription || ''}
                    onChange={(e) => setBrain({ ...brain, businessDescription: e.target.value })}
                  />
                </BrainField>

                <BrainField
                  id="bb-audience"
                  label="Who's your target audience?"
                  helper="Describe the people you want to reach."
                >
                  <textarea
                    id="bb-audience"
                    aria-describedby="bb-audience-helper"
                    className="input-field w-full min-h-[64px] px-3.5 py-2.5"
                    placeholder="e.g. Professionals who value quality."
                    value={brain.targetAudience || ''}
                    onChange={(e) => setBrain({ ...brain, targetAudience: e.target.value })}
                  />
                </BrainField>

                <BrainField id="bb-website" label="Website URL" optional helper="Used for extra context. Leave blank if you don't have one.">
                  <input
                    id="bb-website"
                    aria-describedby="bb-website-helper"
                    type="url"
                    inputMode="url"
                    className="input-field w-full h-11 px-3.5"
                    placeholder="https://yourbusiness.com"
                    value={brain.websiteUrl || ''}
                    onChange={(e) => setBrain({ ...brain, websiteUrl: e.target.value })}
                  />
                </BrainField>
              </BrainSection>

              <BrainSection title="Your brand">
                <BrainField id="bb-voice" label="Brand voice" optional helper="How should AMAI sound when writing for you?">
                  <input
                    id="bb-voice"
                    aria-describedby="bb-voice-helper"
                    type="text"
                    className="input-field w-full h-11 px-3.5"
                    placeholder="e.g. Calm, confident, playful"
                    value={brain.brandVoice || ''}
                    onChange={(e) => setBrain({ ...brain, brandVoice: e.target.value })}
                  />
                </BrainField>

                <BrainField id="bb-personality" label="Brand personality" optional helper="A few words that describe your brand. Separate with commas.">
                  <input
                    id="bb-personality"
                    aria-describedby="bb-personality-helper"
                    type="text"
                    className="input-field w-full h-11 px-3.5"
                    placeholder="e.g. Witty, premium, confident"
                    value={personalityText}
                    onChange={(e) => setPersonalityText(e.target.value)}
                  />
                </BrainField>

                <BrainField id="bb-avoid" label="Never mention" optional helper="Topics AMAI should always stay away from.">
                  <input
                    id="bb-avoid"
                    aria-describedby="bb-avoid-helper"
                    type="text"
                    className="input-field w-full h-11 px-3.5"
                    placeholder="e.g. Competitor names, pricing"
                    value={avoidText}
                    onChange={(e) => setAvoidText(e.target.value)}
                  />
                </BrainField>
              </BrainSection>

              <BrainSection title="Your content">
                <BrainField id="bb-pillars" label="Content pillars" optional helper="The themes you post about. AMAI tags each post with the closest match.">
                  <input
                    id="bb-pillars"
                    aria-describedby="bb-pillars-helper"
                    type="text"
                    className="input-field w-full h-11 px-3.5"
                    placeholder="e.g. Product tips, customer stories, behind the scenes"
                    value={pillarsText}
                    onChange={(e) => setPillarsText(e.target.value)}
                  />
                </BrainField>

                <BrainField id="bb-goals" label="Current goals" optional helper="What you want your content to achieve right now.">
                  <input
                    id="bb-goals"
                    aria-describedby="bb-goals-helper"
                    type="text"
                    className="input-field w-full h-11 px-3.5"
                    placeholder="e.g. Grow followers, drive sales"
                    value={goalsText}
                    onChange={(e) => setGoalsText(e.target.value)}
                  />
                </BrainField>

                <BrainField id="bb-competitive" label="Competitive context" optional helper="What makes you different from others in your space.">
                  <textarea
                    id="bb-competitive"
                    aria-describedby="bb-competitive-helper"
                    className="input-field w-full min-h-[64px] px-3.5 py-2.5"
                    placeholder="e.g. We're the only local brand doing custom fits."
                    value={brain.competitiveContext || ''}
                    onChange={(e) => setBrain({ ...brain, competitiveContext: e.target.value })}
                  />
                </BrainField>
              </BrainSection>
            </div>

            {/* Content idea suggestions -- grounded in the Business Brain
                context above, not generic advice. Empty by default; only
                populated once the user asks, so this never looks like AMAI
                is claiming to have already generated something. */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-5">
                <div>
                  <h4 className="text-body font-bold" style={{ color: 'var(--text-primary)' }}>Content ideas</h4>
                  <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    A few concrete post ideas based on your business, audience and pillars above.
                  </p>
                </div>
                <button
                  onClick={handleGetContentIdeas}
                  disabled={ideasLoading}
                  className="btn-secondary px-4 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold touch-target flex items-center gap-2 disabled:opacity-60"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {ideasLoading ? 'Thinking…' : 'Get content ideas'}
                </button>
              </div>

              {ideasMessage && (
                <p className="text-caption mt-3" style={{ color: 'var(--text-secondary)' }}>{ideasMessage}</p>
              )}

              {contentIdeas && contentIdeas.length > 0 && (
                <ul className="mt-4 space-y-2.5">
                  {contentIdeas.map((idea, i) => (
                    <li key={i} className="surface-tile p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{idea.idea}</p>
                        {idea.pillar && (
                          <span className="text-caption font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 14%, transparent)', color: 'var(--accent-secondary)' }}>
                            {idea.pillar}
                          </span>
                        )}
                      </div>
                      {idea.why && (
                        <p className="text-caption mt-1.5" style={{ color: 'var(--text-muted)' }}>{idea.why}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Save row. Status is announced next to the button rather than
                only via the page-level toast, so the outcome is visible right
                where the action happened. */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={saveBrain}
                disabled={brainSaving}
                className="btn-primary-gradient px-5 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold flex items-center gap-2 touch-target disabled:opacity-60"
              >
                <Brain className="h-4 w-4" />
                <span>{brainSaving ? 'Saving…' : 'Save changes'}</span>
              </button>
              <span aria-live="polite" className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
                {brainSaving ? 'Saving your changes…' : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          {billingLoading && (
            <div className="exec-card p-8 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>Loading billing…</div>
          )}

          {!billingLoading && billing && (
            <>
              {billing.status === 'PAST_DUE' && (
                <div className="exec-card p-4 flex items-center justify-between gap-4" style={{ borderColor: 'var(--accent-warning)', backgroundColor: 'var(--accent-warning-subtle)' }}>
                  <div>
                    <p className="text-xs font-extrabold" style={{ color: 'var(--accent-warning)' }}>We couldn't process your {billing.entitlements.displayName} payment.</p>
                    <p className="text-caption mt-0.5" style={{ color: 'var(--text-secondary)' }}>Update your payment method to keep {billing.entitlements.displayName} features active.</p>
                  </div>
                  <button onClick={handleManageBilling} disabled={portalLoading} className="btn-primary-gradient px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold whitespace-nowrap touch-target disabled:opacity-60">
                    {portalLoading ? 'Opening…' : 'Update Billing'}
                  </button>
                </div>
              )}

              <div className="exec-card card-pad space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>{billing.entitlements.displayName} Plan</h3>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: billing.status === 'ACTIVE' ? 'var(--accent-success-subtle)' : 'var(--accent-warning-subtle)',
                          color: billing.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--accent-warning)',
                        }}
                      >
                        {billing.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{billing.entitlements.tagline}</p>
                    {billing.plan !== 'FREE' && billing.currentPeriodEnd && (
                      <p className="text-caption mt-2" style={{ color: 'var(--text-muted)' }}>
                        {billing.cancelAtPeriodEnd
                          ? `Your ${billing.entitlements.displayName} plan will remain active until ${new Date(billing.currentPeriodEnd).toLocaleDateString()}.`
                          : `Renews ${new Date(billing.currentPeriodEnd).toLocaleDateString()}.`}
                      </p>
                    )}
                  </div>
                  {billing.plan !== 'FREE' && (
                    <button onClick={handleManageBilling} disabled={portalLoading} className="btn-secondary px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold whitespace-nowrap touch-target disabled:opacity-60">
                      {portalLoading ? 'Opening…' : 'Manage Billing'}
                    </button>
                  )}
                </div>

                <div className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
                  <UsageBar label="AI Generations" used={billing.usage.aiGenerations.used} limit={billing.usage.aiGenerations.limit} planName={billing.entitlements.displayName} />
                  <UsageBar label="Posts" used={billing.usage.posts.used} limit={billing.usage.posts.limit} planName={billing.entitlements.displayName} />
                  <UsageBar label="Storage" used={billing.usage.storage.used} limit={billing.usage.storage.limit} formatValue={formatBytes} planName={billing.entitlements.displayName} />
                  <UsageBar label="Social accounts" used={billing.usage.socialAccounts.used} limit={billing.usage.socialAccounts.limit} planName={billing.entitlements.displayName} />
                  {/* Only meaningful on a plan that allows more than one
                      client -- showing "1 / 1" to a Pro user is noise. */}
                  {billing.entitlements.maxBrands !== 1 && (
                    <UsageBar label="Clients" used={billing.usage.clients.used} limit={billing.usage.clients.limit} planName={billing.entitlements.displayName} />
                  )}
                </div>
              </div>

              {billing.plan !== 'AGENCY' && (
                <div className="exec-card card-pad space-y-5">
                  <div>
                    <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Upgrade your plan</h3>
                    <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>More capacity, more automation, more intelligence.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {billing.plan === 'FREE' && (
                      <div className="p-4 rounded-[var(--radius-lg)] border" style={{ borderColor: 'var(--accent-warning)', backgroundColor: 'var(--accent-warning-subtle)' }}>
                        {/* Zap, not Sparkles: billing should read as capability
                            and speed, not as a gamified reward. */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <ZapIcon className="h-3.5 w-3.5" style={{ color: 'var(--accent-warning)' }} />
                          <span className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>Pro</span>
                        </div>
                        <p className="text-caption mb-3" style={{ color: 'var(--text-secondary)' }}>3 accounts, advanced AutoPilot, AI recommendations, content repurposing.</p>
                        <button onClick={() => handleUpgrade('PRO')} disabled={checkoutLoading !== null} className="btn-primary-gradient w-full px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold touch-target disabled:opacity-60">
                          {checkoutLoading === 'PRO' ? 'Redirecting…' : 'Start Pro'}
                        </button>
                      </div>
                    )}
                    <div className="p-4 rounded-[var(--radius-lg)] border" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)' }}>
                      {/* Building2 reads as "multiple client workspaces", which
                          is what the Agency tier actually is. */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building2 className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>Agency</span>
                      </div>
                      <p className="text-caption mb-3" style={{ color: 'var(--text-secondary)' }}>Multiple client workspaces, team members, agency overview, white-label.</p>
                      <button onClick={() => handleUpgrade('AGENCY')} disabled={checkoutLoading !== null} className="btn-secondary w-full px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold touch-target disabled:opacity-60">
                        {checkoutLoading === 'AGENCY' ? 'Redirecting…' : 'Start Agency'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="exec-card card-pad space-y-5">
          <div className="space-y-4">
            <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Your Account</h3>
            <div>
              <label className="block text-overline mb-2" style={{ color: 'var(--text-muted)' }}>Email Address</label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="input-field w-full opacity-70 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'help' && (
        <div className="exec-card card-pad space-y-5">
          <div className="space-y-1">
            <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Help & Support</h3>
            <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>New to AMAI, or just want a refresher? Replay the guided product tour any time.</p>
          </div>
          <button
            onClick={() => onboarding?.restartTour()}
            className="btn-primary-gradient px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-bold flex items-center space-x-2 touch-target"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Replay Product Tour</span>
          </button>
        </div>
      )}
    </div>
  );
}
