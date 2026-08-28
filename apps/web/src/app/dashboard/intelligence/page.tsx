"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import SectionHeader from '@/components/ui/SectionHeader';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import { Reveal } from '@/components/ui/Reveal';
import { brandFetch } from '@/lib/api';
import { Gem, Layers, Tag, Clock3, TrendingDown, ArrowUpRight, Lock, Sparkles, MessageSquareText } from 'lucide-react';

interface Pattern {
  label: string;
  avgEngagement: number;
  postCount: number;
}

interface ScoredPost {
  id: string;
  caption: string;
  platform: string;
  engagement: number;
  views: number;
  score: number;
  formatLabel: string;
  categoryLabel: string;
  windowLabel: string;
  hookLabel: string;
  captionLength: number;
  hashtagCount: number;
}

interface ContentIntelligence {
  hasEnoughData: boolean;
  measuredCount: number;
  minRequired?: number;
  overallAvgEngagement?: number;
  bestFormat?: Pattern | null;
  weakestFormat?: Pattern | null;
  bestCategory?: Pattern | null;
  bestWindow?: Pattern | null;
  bestHook?: Pattern | null;
  topPost?: { id: string; caption: string; platform: string; engagement: number; views: number } | null;
  scoredPosts?: ScoredPost[];
  recommendation?: string | null;
}

interface LockedIntelligence {
  locked: true;
  requiredPlan: 'PRO' | 'AGENCY';
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

/**
 * "Preview the magic": what a Free user sees on this page instead of the
 * real panel. Not a wall -- a dimmed mock of the real layout underneath a
 * lock, with copy that describes exactly what Oyinca does here, so the
 * curiosity gap is honest (this is what the feature actually is) rather
 * than a vague ad.
 */
function LockedIntelligencePreview() {
  return (
    <div className="exec-card p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.12] pointer-events-none blur-[3px] p-6 sm:p-8" aria-hidden>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 rounded-xl" style={{ backgroundColor: 'var(--bg-surface-raised)' }} />
          <div className="h-24 rounded-xl" style={{ backgroundColor: 'var(--bg-surface-raised)' }} />
          <div className="h-24 rounded-xl" style={{ backgroundColor: 'var(--bg-surface-raised)' }} />
        </div>
        <div className="h-16 rounded-xl mt-4" style={{ backgroundColor: 'var(--bg-surface-raised)' }} />
      </div>

      <div className="relative space-y-4 max-w-lg">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: 'var(--accent-warning-subtle)', color: 'var(--accent-warning)' }}
        >
          <Lock className="h-3 w-3" />
          Pro Insight
        </span>
        <h2 className="text-h2" style={{ color: 'var(--text-primary)' }}>
          Oyinca has been watching how your content performs.
        </h2>
        <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Once you're on Pro, Oyinca analyzes your own published posts to find your strongest content format,
          your best-performing topic, the posting window that actually works for your audience, and a concrete
          recommendation for what to make next. Real patterns from your real content, not a generic tip list.
        </p>
        <Link
          href="/dashboard/settings?tab=billing"
          className="inline-flex btn-primary-gradient px-5 py-2.5 rounded-[var(--radius-md)] text-sm font-bold touch-target"
        >
          See What Pro Can Do
        </Link>
      </div>
    </div>
  );
}

function GatheringData({ measuredCount, minRequired }: { measuredCount: number; minRequired: number }) {
  const pct = Math.min(100, Math.round((measuredCount / minRequired) * 100));
  return (
    <div className="exec-card p-6 sm:p-8 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
        <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>Still gathering data</h2>
      </div>
      <p className="text-body-sm leading-relaxed max-w-lg" style={{ color: 'var(--text-secondary)' }}>
        Oyinca needs a handful of published, measured posts before any pattern is real rather than a guess.
        {' '}{measuredCount} of {minRequired} collected so far &mdash; keep publishing and this fills in on its own.
      </p>
      <div className="h-2 rounded-full overflow-hidden max-w-xs" style={{ backgroundColor: 'var(--bg-surface-sunken)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: 'var(--accent-secondary)' }} />
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  const [data, setData] = useState<ContentIntelligence | LockedIntelligence | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await brandFetch<ContentIntelligence | LockedIntelligence>('/posts/content-intelligence');
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 sm:pb-12">
      <SectionHeader
        title="Oyinca Intelligence"
        subtitle="Real patterns from your own published content -- what's working, what isn't, and what to do next."
        badge={<Gem className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />}
      />

      {loading || !data ? (
        <div className="exec-card p-8 animate-pulse h-48" style={{ backgroundColor: 'var(--bg-surface-raised)' }} />
      ) : 'locked' in data ? (
        <LockedIntelligencePreview />
      ) : !data.hasEnoughData ? (
        <GatheringData measuredCount={data.measuredCount} minRequired={data.minRequired || 5} />
      ) : (
        <div className="space-y-5">
          {data.recommendation && (
            <Reveal className="exec-card p-6 sm:p-7" style={{ background: 'linear-gradient(135deg, var(--accent-secondary-subtle), transparent)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Gem className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
                <span className="text-overline" style={{ color: 'var(--text-muted)' }}>Oyinca's Recommendation</span>
              </div>
              <p className="text-body font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {data.recommendation}
              </p>
            </Reveal>
          )}

          <Reveal delay={0.05} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.bestFormat && (
              <StatCard
                icon={<Layers className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />}
                label="Best Format"
                value={data.bestFormat.label}
                helperText={`${fmt(data.bestFormat.avgEngagement)} avg engagement · ${data.bestFormat.postCount} posts`}
              />
            )}
            {data.bestCategory && (
              <StatCard
                icon={<Tag className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />}
                label="Strongest Topic"
                value={data.bestCategory.label}
                helperText={`${fmt(data.bestCategory.avgEngagement)} avg engagement · ${data.bestCategory.postCount} posts`}
              />
            )}
            {data.bestWindow && (
              <StatCard
                icon={<Clock3 className="h-4 w-4" style={{ color: 'var(--accent-warning)' }} />}
                label="Best Posting Window"
                value={data.bestWindow.label}
                helperText={`${fmt(data.bestWindow.avgEngagement)} avg engagement · ${data.bestWindow.postCount} posts`}
              />
            )}
          </Reveal>

          {data.weakestFormat && (
            <Reveal delay={0.1} className="exec-card p-5 flex items-center gap-3">
              <TrendingDown className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.weakestFormat.label}</span>
                {' '}is your weakest-performing format right now &mdash; {fmt(data.weakestFormat.avgEngagement)} avg engagement across {data.weakestFormat.postCount} posts, below your {fmt(data.overallAvgEngagement || 0)} overall average.
              </p>
            </Reveal>
          )}

          {data.topPost && (
            <Reveal delay={0.15} className="exec-card p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="space-y-1.5 max-w-xl">
                  <Badge variant="purple">{data.topPost.platform}</Badge>
                  <p className="text-body-sm line-clamp-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                    Your best post: {data.topPost.caption}
                  </p>
                </div>
                <Link href="/dashboard/published" className="link-neutral text-body-sm font-semibold flex items-center gap-1 hover:underline shrink-0">
                  <span>{fmt(data.topPost.engagement)} total engagement</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Reveal>
          )}

          {data.bestHook && (
            <Reveal delay={0.18} className="exec-card p-5 flex items-center gap-3">
              <MessageSquareText className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-secondary)' }} />
              <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.bestHook.label}</span>
                {' '}average {fmt(data.bestHook.avgEngagement)} engagement per post across {data.bestHook.postCount} posts &mdash; how a caption opens seems to matter for this brand.
              </p>
            </Reveal>
          )}

          {data.scoredPosts && data.scoredPosts.length > 0 && (
            <Reveal delay={0.2} className="exec-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Post-by-post scores</h3>
                <span className="text-caption" style={{ color: 'var(--text-muted)' }}>Relative to your own posts, 0&ndash;100</span>
              </div>
              <div className="space-y-2.5">
                {data.scoredPosts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-[var(--radius-md)]"
                    style={{ backgroundColor: 'var(--bg-surface-raised)' }}
                  >
                    <div
                      className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{
                        backgroundColor: p.score >= 70 ? 'var(--accent-success-subtle)' : p.score >= 40 ? 'var(--accent-warning-subtle)' : 'var(--bg-surface-sunken)',
                        color: p.score >= 70 ? 'var(--accent-success)' : p.score >= 40 ? 'var(--accent-warning)' : 'var(--text-muted)',
                      }}
                    >
                      {p.score}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm line-clamp-1 font-medium" style={{ color: 'var(--text-primary)' }}>{p.caption || '(no caption)'}</p>
                      <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {p.formatLabel} · {p.categoryLabel} · {p.windowLabel} · {p.hookLabel.replace('-opening captions', ' opening')} · {p.hashtagCount} hashtags
                      </p>
                    </div>
                    <span className="text-body-sm font-semibold shrink-0" style={{ color: 'var(--text-secondary)' }}>{fmt(p.engagement)}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
            Based on your last {data.measuredCount} published, measured posts. Updates as new posts publish and their stats sync.
          </p>
        </div>
      )}
    </div>
  );
}
