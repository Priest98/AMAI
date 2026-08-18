"use client";

import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

interface LockedFeatureProps {
  title: string;
  description: string;
  requiredPlan?: 'PRO' | 'AGENCY';
  children?: React.ReactNode; // optional preview content shown dimmed behind the lock
}

/**
 * The one place Pro/Agency-only feature messaging lives -- per spec #18,
 * locked features stay visible (what it does, which plan unlocks it, why
 * it's valuable) rather than being hidden outright. Used for whole
 * sections (Advanced Analytics, Advanced AutoPilot, AI Recommendations)
 * that a Free user's plan doesn't include yet.
 */
export default function LockedFeature({ title, description, requiredPlan = 'PRO', children }: LockedFeatureProps) {
  return (
    <div className="exec-card p-5 relative overflow-hidden">
      {children && (
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none blur-[2px]" aria-hidden>
          {children}
        </div>
      )}
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <h3 className="text-h3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <p className="text-body-sm mt-1.5 max-w-md" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        </div>
        <span
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: 'var(--accent-warning-subtle)', color: 'var(--accent-warning)' }}
        >
          <Lock className="h-3 w-3" />
          {requiredPlan}
        </span>
      </div>
      <Link
        href="/dashboard/settings?tab=billing"
        className="relative mt-4 inline-flex btn-primary-gradient px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold touch-target"
      >
        Upgrade to {requiredPlan === 'AGENCY' ? 'Agency' : 'Pro'}
      </Link>
    </div>
  );
}
