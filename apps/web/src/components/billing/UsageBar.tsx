"use client";

import React from 'react';
import Link from 'next/link';
import { usageStage } from '@/lib/billing';

interface UsageBarProps {
  label: string;
  used: number;
  limit: number; // -1 = unlimited
  formatValue?: (n: number) => string;
  planName?: string;
}

/**
 * A single usage metric with the three-stage contextual upgrade language
 * from the spec (#19): quiet below 70%, a subtle note at 70-89%, a direct
 * nudge at 90-99%, and a clear "you're capped" message at 100%. Never more
 * than one line of copy, never a modal -- the bar itself is the constant
 * visual, the copy only appears once it's actually relevant.
 */
export default function UsageBar({ label, used, limit, formatValue, planName }: UsageBarProps) {
  const unlimited = limit === -1;
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const stage = unlimited ? null : usageStage(percent);
  const fmt = formatValue || ((n: number) => String(n));

  const barColor = stage === 'reached' ? 'var(--accent-error)' : stage === 'near' ? 'var(--accent-warning)' : 'var(--accent-primary, var(--accent-success))';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {unlimited ? `${fmt(used)} · Unlimited` : `${fmt(used)} / ${fmt(limit)}`}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-sunken)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${unlimited ? 8 : percent}%`, backgroundColor: unlimited ? 'var(--text-muted)' : barColor }}
        />
      </div>
      {stage && (
        <p className="mt-1.5 text-caption" style={{ color: stage === 'reached' ? 'var(--accent-error)' : 'var(--text-muted)' }}>
          {stage === 'approaching' && `You're approaching your ${planName || 'plan'} limit.`}
          {stage === 'near' && (
            <>
              You've used {fmt(used)} of {fmt(limit)} this month.{' '}
              <Link href="/dashboard/settings?tab=billing" className="underline font-semibold">Explore Pro</Link>
            </>
          )}
          {stage === 'reached' && (
            <>
              You've reached your {planName || 'plan'} limit.{' '}
              <Link href="/dashboard/settings?tab=billing" className="underline font-semibold">Upgrade to Pro</Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
