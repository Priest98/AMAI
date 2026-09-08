"use client";

import React, { useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Gem, ArrowRight, ArrowLeft } from 'lucide-react';

/** Subset of UpdateBusinessBrainDto this wizard actually captures -- the
 * fields BusinessBrainService.buildPromptContext needs most to turn a
 * caption from generic to specific. Everything else (writing samples,
 * competitors, banned phrases, products...) stays a Settings > Business
 * Brain job, same as before this wizard existed. */
export interface BrainCaptureResult {
  businessDescription: string;
  targetAudience: string;
  brandVoice: string;
  brandPersonality: string[];
  contentPillars: string[];
}

interface BrainCaptureWizardProps {
  onSave: (partial: Partial<BrainCaptureResult>) => Promise<void>;
  onFinish: (result: BrainCaptureResult) => Promise<void>;
  onSkip: (partial: Partial<BrainCaptureResult>) => Promise<void>;
}

function parseTagList(text: string): string[] {
  return text.split(',').map((s) => s.trim()).filter(Boolean);
}

const TOTAL_SCREENS = 5; // intro + 4 question screens

export default function BrainCaptureWizard({ onFinish, onSkip, onSave }: BrainCaptureWizardProps) {
  const [screen, setScreen] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const busy = useRef(false);
  const runSave = async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setSaveError('');
    try { await action(); }
    catch { setSaveError('Your details could not be saved. They are still here. Check your connection and try again.'); }
    finally { busy.current = false; setSaving(false); }
  };
  const [businessDescription, setBusinessDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [brandPersonalityText, setBrandPersonalityText] = useState('');
  const [contentPillarsText, setContentPillarsText] = useState('');

  const currentSnapshot = (): BrainCaptureResult => ({
    businessDescription: businessDescription.trim(),
    targetAudience: targetAudience.trim(),
    brandVoice: brandVoice.trim(),
    brandPersonality: parseTagList(brandPersonalityText),
    contentPillars: parseTagList(contentPillarsText),
  });

  const handleSkip = () => runSave(() => onSkip(currentSnapshot()));
  const goNext = () => runSave(async () => { await onSave(currentSnapshot()); setScreen((s) => Math.min(s + 1, TOTAL_SCREENS - 1)); });
  const goBack = () => setScreen((s) => Math.max(s - 1, 0));
  const handleFinish = () => runSave(() => onFinish(currentSnapshot()));

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="oy-dialog-overlay" />
        <Dialog.Content className="oy-dialog" aria-describedby="capture-description"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}>
          <Dialog.Title className="sr-only">Teach Oyinca about your brand</Dialog.Title>
          <p id="capture-description" className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Your answers are saved when you continue. You can update them in Settings.</p>
          {saveError && <p role="alert" className="text-sm mb-4" style={{ color: 'var(--accent-error)' }}>{saveError}</p>}
          <p role="status" className="text-sm mb-2">{saving ? 'Saving your details…' : screen > 0 ? `Question ${screen} of 4` : ''}</p>
          <fieldset disabled={saving} aria-busy={saving} className="min-w-0 disabled:opacity-70">
          {/* Ambient brand glow, same treatment as the old welcome modal. */}
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl opacity-30"
            style={{ background: 'var(--gradient-primary-cta)' }}
          />

          <div className="relative space-y-5">
            <div className="flex items-center justify-between">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: 'var(--gradient-primary-cta)' }}>
                <Gem className="h-7 w-7" />
              </div>
              {screen > 0 && (
                <div className="flex items-center gap-1.5" aria-label={`Step ${screen} of ${TOTAL_SCREENS - 1}`}>
                  {Array.from({ length: TOTAL_SCREENS - 1 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: i === screen - 1 ? '20px' : '6px',
                        backgroundColor: i <= screen - 1 ? 'var(--accent-primary, #7c3aed)' : 'var(--card-border)',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {screen === 0 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Hi, I&rsquo;m Oyinca
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    I&rsquo;m your AI Social Media Manager. Before I write a single caption, I want to actually
                    understand your business, so what I create sounds like you, not something generic.
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Four quick questions, about two minutes. You can always change these later in Settings.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    onClick={goNext}
                    className="flex-1 py-3.5 px-6 rounded-2xl text-white font-bold text-sm shadow-xl transition flex items-center justify-center space-x-2 touch-target"
                    style={{ background: 'var(--gradient-primary-cta)', boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)' }}
                  >
                    <span>Let&rsquo;s do this</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleSkip}
                    className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm border transition touch-target"
                    style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {screen === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>What does your business do?</h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tell me what you sell and who you serve.</p>
                </div>
                <textarea
                  autoFocus
                  rows={3}
                  aria-label="Business description"
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="e.g. We make handmade leather bags for people who want something that lasts."
                  className="w-full rounded-2xl border px-4 py-3 text-base resize-none"
                  style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }}
                />
                <StepNav onBack={goBack} onNext={goNext} onSkip={handleSkip} />
              </div>
            )}

            {screen === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Who&rsquo;s your audience?</h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Describe the people you want to reach.</p>
                </div>
                <textarea
                  autoFocus
                  rows={3}
                  aria-label="Target audience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Busy professionals in their 20s-30s who value quality over trends."
                  className="w-full rounded-2xl border px-4 py-3 text-base resize-none"
                  style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }}
                />
                <StepNav onBack={goBack} onNext={goNext} onSkip={handleSkip} />
              </div>
            )}

            {screen === 3 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>What&rsquo;s your brand&rsquo;s voice?</h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>How should I sound when I write for you?</p>
                </div>
                <input
                  autoFocus
                  type="text"
                  aria-label="Brand voice"
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  placeholder="e.g. Calm, confident, a little playful"
                  className="w-full rounded-2xl border px-4 py-3 text-base"
                  style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }}
                />
                <input
                  type="text"
                  aria-label="Brand personality (optional)"
                  value={brandPersonalityText}
                  onChange={(e) => setBrandPersonalityText(e.target.value)}
                  placeholder="A few personality words, comma-separated (optional)"
                  className="w-full rounded-2xl border px-4 py-3 text-base"
                  style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }}
                />
                <StepNav onBack={goBack} onNext={goNext} onSkip={handleSkip} />
              </div>
            )}

            {screen === 4 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>What do you usually post about?</h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>The themes you post about, comma-separated. I&rsquo;ll tag each post with its closest match.</p>
                </div>
                <input
                  autoFocus
                  type="text"
                  aria-label="Content themes"
                  value={contentPillarsText}
                  onChange={(e) => setContentPillarsText(e.target.value)}
                  placeholder="e.g. Product tips, customer stories, behind the scenes"
                  className="w-full rounded-2xl border px-4 py-3 text-base"
                  style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }}
                />
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={goBack}
                    className="py-3.5 px-5 rounded-2xl font-bold text-sm border transition touch-target flex items-center gap-1.5"
                    style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleFinish}
                    className="flex-1 py-3.5 px-6 rounded-2xl text-white font-bold text-sm shadow-xl transition flex items-center justify-center space-x-2 touch-target"
                    style={{ background: 'var(--gradient-primary-cta)', boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)' }}
                  >
                    <span>Connect your account</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={handleSkip}
                  className="w-full touch-target text-center text-sm font-semibold pt-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Skip for now
                </button>
              </div>
            )}
          </div>
          </fieldset>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StepNav({ onBack, onNext, onSkip }: { onBack: () => void; onNext: () => Promise<void>; onSkip: () => void }) {
  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="py-3.5 px-5 rounded-2xl font-bold text-sm border transition touch-target flex items-center gap-1.5"
          style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3.5 px-6 rounded-2xl text-white font-bold text-sm shadow-xl transition flex items-center justify-center space-x-2 touch-target"
          style={{ background: 'var(--gradient-primary-cta)', boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)' }}
        >
          <span>Next</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <button
        onClick={onSkip}
        className="w-full touch-target text-center text-sm font-semibold pt-1"
        style={{ color: 'var(--text-muted)' }}
      >
        Skip for now
      </button>
    </div>
  );
}
