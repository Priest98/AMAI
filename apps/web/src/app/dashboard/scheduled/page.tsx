"use client";

import React, { useState, useEffect, useCallback } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import Badge from '@/components/ui/Badge';
import { Reveal } from '@/components/ui/Reveal';
import { brandFetch } from '@/lib/api';
import { useEngineEvents } from '@/lib/useEngineEvents';
import { Calendar, Instagram, Video, Loader2, Clock } from 'lucide-react';

interface ScheduledPost {
  id: string;
  caption: string;
  hashtags: string[];
  scheduledAt: string | null;
  targets?: { platform: string; status: string }[];
}

export default function ScheduledPostsPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await brandFetch<ScheduledPost[]>('/posts?status=SCHEDULED');
      setPosts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Could not load scheduled posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEngineEvents((event) => {
    if (['AUTO_SCHEDULED', 'POST_APPROVED', 'PUBLISH_SUCCEEDED', 'PUBLISH_FAILED'].includes(event.type)) load();
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 sm:pb-12">
      <SectionHeader
        title="Scheduled Posts"
        subtitle="Everything the AMAI Engine will publish automatically, in order."
        action={
          <Badge variant="purple">
            <span className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{posts.length} Scheduled</span>
            </span>
          </Badge>
        }
      />

      {error && (
        <div className="p-3.5 rounded-xl border bg-red-500/10 border-red-500/20 text-red-400 text-xs font-semibold">{error}</div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border p-12 text-center space-y-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
          <Calendar className="h-8 w-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Nothing scheduled yet</h3>
          <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Approved posts (or Auto Approval posts) will appear here, sorted by when they'll go live.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts
            .slice()
            .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime())
            .map((post, i) => {
              const platform = post.targets?.[0]?.platform || 'INSTAGRAM';
              return (
                <Reveal
                  key={post.id}
                  y={16}
                  delay={Math.min(i, 5) * 0.04}
                  className="rounded-xl border p-4 flex items-start gap-4"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
                >
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    {platform === 'TIKTOK' ? <Video className="h-4 w-4" /> : <Instagram className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Time TBD'}
                      </span>
                      <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-secondary)' }}>{platform}</span>
                    </div>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{post.caption}</p>
                  </div>
                </Reveal>
              );
            })}
        </div>
      )}
    </div>
  );
}
