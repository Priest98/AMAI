"use client";

import React, { useState, useEffect, useCallback } from 'react';
import PendingRepliesList from './PendingRepliesList';
import SectionHeader from '@/components/ui/SectionHeader';
import Badge from '@/components/ui/Badge';
import { brandFetch } from '@/lib/api';
import { useEngineEvents } from '@/lib/useEngineEvents';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Instagram,
  Video,
  Sparkles,
  Edit3,
  Trash2,
  Send,
  Calendar,
  Loader2,
} from 'lucide-react';

interface QueuePost {
  id: string;
  caption: string;
  hashtags: string[];
  status: 'NEEDS_APPROVAL';
  createdAt: string;
  scheduledAt?: string | null;
  targets?: { platform: string }[];
  media?: { asset: { blobUrl: string | null; mimeType: string } }[];
}

export default function ApprovalQueuePage() {
  const [activeTab, setActiveTab] = useState<'posts' | 'replies'>('posts');
  const [posts, setPosts] = useState<QueuePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaptionText, setEditCaptionText] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const data = await brandFetch<QueuePost[]>('/posts?status=NEEDS_APPROVAL');
      setPosts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setMessage(e.message || 'Could not load the Approval Queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  useEngineEvents((event) => {
    if (['APPROVAL_QUEUED', 'POST_APPROVED', 'POST_REJECTED', 'POST_EDITED'].includes(event.type)) {
      loadPosts();
    }
  });

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      await brandFetch(`/posts/${id}/approve`, { method: 'POST', body: JSON.stringify({}) });
      setPosts((prev) => prev.filter((p) => p.id !== id));
      flash('🎉 Post approved and scheduled for publishing!');
    } catch (e: any) {
      flash(e.message || 'Could not approve this post.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    setBusyId(id);
    try {
      await brandFetch(`/posts/${id}/reject`, { method: 'POST' });
      setPosts((prev) => prev.filter((p) => p.id !== id));
      flash('Post rejected and removed from the queue.');
    } catch (e: any) {
      flash(e.message || 'Could not reject this post.');
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (post: QueuePost) => {
    setEditingPostId(post.id);
    setEditCaptionText(post.caption);
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    try {
      const updated = await brandFetch<QueuePost>(`/posts/${id}`, { method: 'PATCH', body: JSON.stringify({ caption: editCaptionText }) });
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, caption: updated.caption } : p)));
      setEditingPostId(null);
      flash('✏️ Caption updated.');
    } catch (e: any) {
      flash(e.message || 'Could not save your edit.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <SectionHeader
        title="Approval Queue"
        subtitle="Review, edit, and approve AI-prepared posts before they go live."
        action={
          <div className="flex items-center space-x-2">
            <Badge variant="success">
              <span className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-emerald-400" />
                <span>{posts.length} Pending Review</span>
              </span>
            </Badge>
          </div>
        }
      />

      {message && (
        <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs font-semibold flex justify-between items-center">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 touch-target ${
            activeTab === 'posts'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          <span>Pending Posts ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('replies')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 touch-target ${
            activeTab === 'replies'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI Comment Replies</span>
        </button>
      </div>

      {activeTab === 'replies' ? (
        <PendingRepliesList />
      ) : loading ? (
        <div className="py-16 flex items-center justify-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-xl border p-12 text-center space-y-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Approval Queue Empty</h3>
              <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                Upload media in the Media Library and the AMAI Engine will prepare new posts here for your review.
              </p>
            </div>
          ) : (
            posts.map((post) => {
              const platform = post.targets?.[0]?.platform || 'INSTAGRAM';
              const scheduledLabel = post.scheduledAt
                ? new Date(post.scheduledAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
                : 'AI-selected best time';
              return (
                <div
                  key={post.id}
                  className="rounded-xl border p-5 transition space-y-4"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {platform === 'TIKTOK' ? (
                        <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold flex items-center space-x-1">
                          <Video className="h-3.5 w-3.5" />
                          <span>TikTok</span>
                        </span>
                      ) : (
                        <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-bold flex items-center space-x-1">
                          <Instagram className="h-3.5 w-3.5" />
                          <span>Instagram</span>
                        </span>
                      )}

                      <span className="text-xs font-semibold flex items-center space-x-1" style={{ color: 'var(--text-secondary)' }}>
                        <Calendar className="h-3 w-3" />
                        <span>Scheduled: {scheduledLabel}</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEdit(post)}
                        className="p-1.5 rounded-lg border text-xs font-semibold transition hover:border-amber-400"
                        style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                        title="Edit Caption"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                      </button>
                      <button
                        onClick={() => handleReject(post.id)}
                        disabled={busyId === post.id}
                        className="p-1.5 rounded-lg border text-xs font-semibold transition hover:border-rose-400 disabled:opacity-50"
                        style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                        title="Reject Post"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      </button>
                    </div>
                  </div>

                  {editingPostId === post.id ? (
                    <div className="space-y-3 pt-2">
                      <textarea
                        rows={4}
                        value={editCaptionText}
                        onChange={(e) => setEditCaptionText(e.target.value)}
                        className="w-full rounded-xl p-3 text-xs border outline-none"
                        style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingPostId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 border border-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(post.id)}
                          disabled={busyId === post.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-black disabled:opacity-50"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
                        {post.caption}
                      </p>
                      {post.hashtags?.length > 0 && (
                        <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {post.hashtags.join(' ')}
                        </p>
                      )}
                    </>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-white/5">
                    <button
                      onClick={() => handleReject(post.id)}
                      disabled={busyId === post.id}
                      className="px-4 py-2 rounded-xl text-xs font-bold border text-rose-400 border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 transition flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleApprove(post.id)}
                      disabled={busyId === post.id}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center space-x-1.5 shadow-md btn-emerald-cta disabled:opacity-50"
                    >
                      {busyId === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>Approve Post</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
