"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { brandFetch } from '@/lib/api';

/**
 * P1 content calendar intelligence: real category/pillar balance and
 * back-to-back repetition over what's actually on the calendar. Every
 * number comes from GET /engine/calendar-insights, which reads real
 * Post.contentCategory/contentPillar values -- nothing here is inferred
 * client-side. Renders nothing (not even an empty-state) once loaded if
 * there's simply nothing to flag, since a calendar with good variety
 * shouldn't have to announce that fact loudly.
 */

interface CalendarInsightsData {
  windowDays: number;
  totalScheduled: number;
  categoryCounts: Record<string, number>;
  pillarCounts: Record<string, number>;
  uncoveredPillars: string[];
  backToBackRepeats: { firstPostId: string; secondPostId: string; category: string; scheduledAt: string | null }[];
}

const CATEGORY_LABEL: Record<string, string> = {
  promotional: 'Promotional',
  educational: 'Educational',
  behind_the_scenes: 'Behind the scenes',
  product: 'Product',
  general: 'General',
};

export default function CalendarInsights() {
  const [data, setData] = useState<CalendarInsightsData | null>(null);

  useEffect(() => {
    brandFetch<CalendarInsightsData>('/engine/calendar-insights?days=30')
      .then(setData)
      .catch(() => {}); // Non-critical -- the calendar itself works fine without this.
  }, []);

  if (!data || data.totalScheduled === 0) return null;

  const categories = Object.entries(data.categoryCounts).sort((a, b) => b[1] - a[1]);
  const hasFlags = data.uncoveredPillars.length > 0 || data.backToBackRepeats.length > 0;

  return (
    <div className="exec-card card-pad space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-overline" style={{ color: 'var(--text-muted)' }}>Content balance (next {data.windowDays} days)</h3>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(([cat, count]) => (
            <span
              key={cat}
              className="text-caption font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: 'var(--hover-surface)', color: 'var(--text-secondary)' }}
            >
              {CATEGORY_LABEL[cat] || cat} · {count}
            </span>
          ))}
        </div>
      </div>

      {hasFlags && (
        <div className="space-y-1.5 pt-1">
          {data.uncoveredPillars.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--accent-warning)' }} />
              <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
                No posts scheduled about: {data.uncoveredPillars.join(', ')}.
              </p>
            </div>
          )}
          {data.backToBackRepeats.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--accent-warning)' }} />
              <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
                {data.backToBackRepeats.length} pair{data.backToBackRepeats.length === 1 ? '' : 's'} of consecutive posts share the same category ({Array.from(new Set(data.backToBackRepeats.map((r) => CATEGORY_LABEL[r.category] || r.category))).join(', ')}).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
