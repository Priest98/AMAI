"use client";

import React, { useState, useEffect, useCallback } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonListRows } from '@/components/ui/Skeleton';
import { Reveal } from '@/components/ui/Reveal';
import { brandFetch } from '@/lib/api';
import { useEngineEvents } from '@/lib/useEngineEvents';
import { CheckCircle2, Video, Loader2, Eye, Heart, MessageCircle, Share2 } from 'lucide-react';

interface PerformanceSnapshot {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  capturedAt: string;
}

interface PublishedPost {
  id: string;
  caption: string;
  hashtags: string[];
  publishedAt: string | null;
  targets?: { platform: string; status: string; performanceSnapshots?: PerformanceSnapshot[] }[];
}

/**
 * Compact inline stat -- used for the views/likes/comments/shares row below
 * a published post's caption. Only rendered once a PostPerformance snapshot
 * exists (see MetricsService's daily sync-post-metrics cron): a post can sit
 * published for up to a day before its first snapshot lands, so this row is
 * genuinely absent until then rather than showing fake zeros.
 */
function StatChip({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span className="flex items-center gap-1 text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>
      {icon}
      {value.toLocaleString()}
    </span>
  );
}

export default function PublishedPostsPage() {
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await brandFetch<PublishedPost[]>('/posts?status=PUBLISHED');
      setPosts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Could not load published posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEngineEvents((event) => {
    if (event.type === 'PUBLISH_SUCCEEDED') load();
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 sm:pb-12">
      <SectionHeader
        title="Published Posts"
        subtitle="A record of everything Oyinca has published on your behalf."
        action={
          <Badge variant="success">
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>{posts.length} Published</span>
            </span>
          </Badge>
        }
      />

      {error && (
        <div className="p-3.5 rounded-[var(--radius-lg)] border text-xs font-semibold" style={{ backgroundColor: 'var(--accent-error-subtle)', borderColor: 'var(--accent-error)', color: 'var(--accent-error)' }}>{error}</div>
      )}

      {loading ? (
        <SkeletonListRows count={5} />
      ) : posts.length === 0 ? (
        <div className="exec-card p-12">
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6" />}
            title="Nothing published yet"
            description="Once a post goes live, it'll show up here automatically."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {posts
            .slice()
            .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
            .map((post, i) => {
              // TikTok-first launch: Instagram entry points are hidden (see
              // lib/featureFlags.ts), so any post missing a target here
              // defaults to TikTok rather than a platform we're not
              // currently surfacing anywhere else in the product.
              const platform = post.targets?.[0]?.platform || 'TIKTOK';
              const snapshot = post.targets?.[0]?.performanceSnapshots?.[0];
              return (
                <Reveal
                  key={post.id}
                  y={16}
                  delay={Math.min(i, 5) * 0.04}
                  className="exec-card exec-card-interactive p-4 flex items-start gap-4"
                >
                  <div className="h-9 w-9 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-success-subtle)', color: 'var(--accent-success)' }}>
                    <Video className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-body-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Just now'}
                      </span>
                      <span className="text-caption font-mono uppercase" style={{ color: 'var(--text-muted)' }}>{platform}</span>
                    </div>
                    <p className="text-body-sm mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{post.caption}</p>
                    {snapshot && (
                      <div className="flex items-center gap-3 mt-2">
                        <StatChip icon={<Eye className="h-3 w-3" />} value={snapshot.views} />
                        <StatChip icon={<Heart className="h-3 w-3" />} value={snapshot.likes} />
                        <StatChip icon={<MessageCircle className="h-3 w-3" />} value={snapshot.comments} />
                        <StatChip icon={<Share2 className="h-3 w-3" />} value={snapshot.shares} />
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })}
        </div>
      )}
    </div>
  );
}
