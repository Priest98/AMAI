"use client";

import React, { useState, useEffect, useCallback } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import Badge from '@/components/ui/Badge';
import { brandFetch } from '@/lib/api';
import { useEngineEvents } from '@/lib/useEngineEvents';
import { CheckCircle2, Instagram, Video, Loader2 } from 'lucide-react';

interface PublishedPost {
  id: string;
  caption: string;
  hashtags: string[];
  publishedAt: string | null;
  targets?: { platform: string; status: string }[];
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
        subtitle="A record of everything AMAI has published on your behalf."
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
        <div className="p-3.5 rounded-xl border bg-red-500/10 border-red-500/20 text-red-400 text-xs font-semibold">{error}</div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border p-12 text-center space-y-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
          <CheckCircle2 className="h-8 w-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Nothing published yet</h3>
          <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Once a post goes live, it'll show up here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts
            .slice()
            .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
            .map((post) => {
              const platform = post.targets?.[0]?.platform || 'INSTAGRAM';
              return (
                <div key={post.id} className="rounded-xl border p-4 flex items-start gap-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    {platform === 'TIKTOK' ? <Video className="h-4 w-4" /> : <Instagram className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Just now'}
                      </span>
                      <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-secondary)' }}>{platform}</span>
                    </div>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{post.caption}</p>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
