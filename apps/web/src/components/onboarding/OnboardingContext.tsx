"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch, brandFetch } from '@/lib/api';
import { TOUR_STEPS, TOTAL_STEPS, TourStep } from './tourSteps';
import TourOverlay from './TourOverlay';
import BrainCaptureWizard, { BrainCaptureResult } from './BrainCaptureWizard';

// 'welcome' is gone as an automatic first-run phase -- replaced by
// 'capturing' (see BrainCaptureWizard). The mechanical click-through
// product tour ('touring') is no longer triggered automatically, but stays
// fully intact and reachable on demand via Settings > Help & Support >
// "Replay tour" (restartTour below), for anyone who still wants the
// guided walkthrough of the UI itself.
type Phase = 'loading' | 'idle' | 'capturing' | 'touring';

interface OnboardingContextValue {
  phase: Phase;
  currentStep: TourStep;
  stepIndex: number;
  totalSteps: number;
  startTour: () => void;
  skipTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  restartTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  return useContext(OnboardingContext);
}

interface MeResponse {
  onboardingCompleted?: boolean;
  onboardingSkipped?: boolean;
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('loading');
  const [stepIndex, setStepIndex] = useState(0);

  // Only checked once per dashboard session (this provider is mounted once
  // at the dashboard layout level and persists across nested navigations),
  // and only for a genuinely first-time user — DB-persisted, not something
  // a JWT claim could represent since a token is signed once at login and
  // can be cached client-side for up to 30 days.
  useEffect(() => {
    let cancelled = false;
    apiFetch<MeResponse>('/auth/me')
      .then((me) => {
        if (cancelled) return;
        if (!me.onboardingCompleted && !me.onboardingSkipped) {
          setPhase('capturing');
        } else {
          setPhase('idle');
        }
      })
      .catch(() => {
        if (!cancelled) setPhase('idle');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToStep = useCallback((index: number) => {
    const step = TOUR_STEPS[index];
    if (!step) return;
    setStepIndex(index);
    if (step.route && step.route !== pathname) {
      router.push(step.route);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

  const startTour = useCallback(() => {
    setPhase('touring');
    goToStep(0);
  }, [goToStep]);

  const skipTour = useCallback(() => {
    setPhase('idle');
    apiFetch('/auth/onboarding', { method: 'PATCH', body: JSON.stringify({ skipped: true }) }).catch(() => {});
  }, []);

  const finishTour = useCallback(() => {
    setPhase('idle');
    apiFetch('/auth/onboarding', { method: 'PATCH', body: JSON.stringify({ completed: true }) }).catch(() => {});
  }, []);

  const nextStep = useCallback(() => {
    if (stepIndex >= TOTAL_STEPS - 1) {
      finishTour();
      return;
    }
    goToStep(stepIndex + 1);
  }, [stepIndex, goToStep, finishTour]);

  const prevStep = useCallback(() => {
    if (stepIndex <= 0) return;
    goToStep(stepIndex - 1);
  }, [stepIndex, goToStep]);

  const restartTour = useCallback(() => {
    apiFetch('/auth/onboarding', { method: 'PATCH', body: JSON.stringify({ restart: true }) }).catch(() => {});
    setPhase('touring');
    goToStep(0);
  }, [goToStep]);

  // Persists whatever Business Brain fields the wizard actually collected --
  // called on both a full finish and a mid-wizard skip, since a user who
  // typed something real into 2 of 4 screens before bailing shouldn't lose
  // it. A brand-new user's brain is always empty going in, so writing blank
  // strings/arrays for untouched fields here can never clobber real data.
  const persistBrainCapture = useCallback((result: Partial<BrainCaptureResult>) => {
    const hasAnyContent =
      !!result.businessDescription || !!result.targetAudience || !!result.brandVoice ||
      (result.brandPersonality && result.brandPersonality.length > 0) ||
      (result.contentPillars && result.contentPillars.length > 0);
    if (!hasAnyContent) return;
    brandFetch('/business-brain', {
      method: 'PATCH',
      body: JSON.stringify({
        businessDescription: result.businessDescription || null,
        targetAudience: result.targetAudience || null,
        brandVoice: result.brandVoice || null,
        brandPersonality: result.brandPersonality || [],
        contentPillars: result.contentPillars || [],
      }),
    }).catch(() => {});
  }, []);

  const finishCapture = useCallback((result: BrainCaptureResult) => {
    persistBrainCapture(result);
    setPhase('idle');
    apiFetch('/auth/onboarding', { method: 'PATCH', body: JSON.stringify({ completed: true }) }).catch(() => {});
    // Natural next action after telling Oyinca about your business is
    // connecting the platform it'll actually publish to.
    router.push('/dashboard/integrations');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistBrainCapture, router]);

  const skipCapture = useCallback((partial: Partial<BrainCaptureResult>) => {
    persistBrainCapture(partial);
    setPhase('idle');
    apiFetch('/auth/onboarding', { method: 'PATCH', body: JSON.stringify({ skipped: true }) }).catch(() => {});
  }, [persistBrainCapture]);

  // This provider sits at the dashboard layout level (same as
  // EngineEventsProvider) and wraps every /dashboard/* page. Without
  // memoizing this object, DashboardLayout state that has nothing to do with
  // onboarding (mobile drawer open/close, header scroll shrink) still forced
  // a brand-new `value` on every render, re-rendering every consumer
  // (BrainCaptureWizard, TourOverlay, and anything calling useOnboarding()) for no
  // reason. It still changes exactly when it should -- on phase/step/route
  // transitions -- since those are real dependencies below.
  const value: OnboardingContextValue = useMemo(() => ({
    phase,
    currentStep: TOUR_STEPS[stepIndex],
    stepIndex,
    totalSteps: TOTAL_STEPS,
    startTour,
    skipTour,
    nextStep,
    prevStep,
    restartTour,
  }), [phase, stepIndex, startTour, skipTour, nextStep, prevStep, restartTour]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {phase === 'capturing' && <BrainCaptureWizard onFinish={finishCapture} onSkip={skipCapture} />}
      {phase === 'touring' && (
        <TourOverlay
          step={TOUR_STEPS[stepIndex]}
          stepIndex={stepIndex}
          totalSteps={TOTAL_STEPS}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          onFinish={finishTour}
        />
      )}
    </OnboardingContext.Provider>
  );
}
