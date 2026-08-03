"use client";

import React, { useState, useEffect, useCallback } from 'react';
import PendingRepliesList from './PendingRepliesList';
import SectionHeader from '@/components/ui/SectionHeader';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { Reveal } from '@/components/ui/Reveal';
import { apiFetch, brandFetch, getBrandId } from '@/lib/api';
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
  Zap,
  Save,
} from 'lucide-react';

interface QueuePost {
  id: string;
  caption: string;
  hashtags: string[];
  ctaText?: string | null;
  status: 'NEEDS_APPROVAL';
  createdAt: string;
  scheduledAt?: string | null;
  targets?: { platform: string; socialAccountId?: string }[];
  media?: { asset: { blobUrl: string | null; mimeType: string } }[];
}

interface ConnectedAccount {
  id: string;
  platform: string;
  handle: string;
  status: string;
}

const EDITABLE_PLATFORMS: { platform: string; label: string; icon: React.ElementType }[] = [
  { platform: 'INSTAGRAM', label: 'Instagram', icon: Instagram },
  { platform: 'TIKTOK', label: 'TikTok', icon: Video },
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Native date/time inputs work in local time — format from local getters, not toISOString (UTC), to avoid a timezone-shifted default. */
function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toTimeInputValue(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function combineDateTime(dateStr: string, timeStr: string): string | undefined {
  if (!dateStr || !timeStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(h) || Number.isNaN(min)) return undefined;
  return new Date(y, m - 1, d, h, min, 0, 0).toISOString();
}

export default function ApprovalQueuePage() {
  const [activeTab, setActiveTab] = useState<'posts' | 'replies'>('posts');
  const [posts, setPosts] = useState<QueuePost[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [editCta, setEditCta] = useState('');
  const [editPlatforms, setEditPlatforms] = useState<Set<string>>(new Set());
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [liveProgress, setLiveProgress] = useState<string | null>(null);

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

  const loadAccounts = useCallback(async () => {
    try {
      const data = await apiFetch<{ socialAccounts: ConnectedAccount[] }>(`/oauth/accounts?brandId=${getBrandId()}`);
      setAccounts((data.socialAccounts || []).filter((a) => a.status === 'CONNECTED'));
    } catch {
      // Non-fatal — platform toggles just show as unavailable.
    }
  }, []);

  useEffect(() => { loadPosts(); loadAccounts(); }, [loadPosts, loadAccounts]);

  useEngineEvents((event) => {
    if (['APPROVAL_QUEUED', 'POST_APPROVED', 'POST_REJECTED', 'POST_EDITED'].includes(event.type)) {
      loadPosts();
    }
    // Live "AMAI Engine running…" progress while a Publish Now request is
    // in flight — these events are broadcast by the real backend publisher
    // as it actually talks to Instagram/TikTok, not a simulated timeline.
    if (event.postId === busyId && ['PUBLISH_STARTED', 'PUBLISH_UPLOADING'].includes(event.type)) {
      setLiveProgress(event.message || event.type);
    }
  });

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3500); };

  const accountFor = (platform: string) => accounts.find((a) => a.platform === platform);

  const buildTargetsPayload = () => {
    return Array.from(editPlatforms)
      .map((platform) => {
        const acc = accountFor(platform);
        return acc ? { platform, socialAccountId: acc.id } : null;
      })
      .filter((t): t is { platform: string; socialAccountId: string } => t !== null);
  };

  const parseHashtags = (raw: string): string[] => {
    return Array.from(
      new Set(
        raw
          .split(/\s+/)
          .map((h) => h.trim())
          .filter(Boolean)
          .map((h) => (h.startsWith('#') ? h : `#${h}`)),
      ),
    );
  };

  /**
   * Optimistic UI: the post leaves the visible queue the instant the button
   * is clicked, not after the network round-trip resolves. Safe to do
   * unconditionally here because a genuine request-level failure (network
   * error, 500 before the DB write commits) is the only case where the post
   * is still actually NEEDS_APPROVAL server-side — that's exactly the case
   * the catch block restores the snapshot for. A successful response never
   * needs undoing since the post really did leave the queue.
   */
  const handleReject = async (id: string) => {
    const snapshot = posts;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setEditingPostId((cur) => (cur === id ? null : cur));
    setBusyId(id); setBusyAction('reject');
    try {
      await brandFetch(`/posts/${id}/reject`, { method: 'POST' });
      flash('Post rejected and removed from the queue.');
    } catch (e: any) {
      setPosts(snapshot);
      flash(e.message || 'Could not reject this post.');
    } finally {
      setBusyId(null); setBusyAction(null);
    }
  };

  /** "Approve & Continue" — approves using whatever is currently stored (AI-selected time, or a previous edit), no form required. Optimistic, see handleReject's note. */
  const handleApprove = async (id: string) => {
    const snapshot = posts;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setEditingPostId((cur) => (cur === id ? null : cur));
    setBusyId(id); setBusyAction('approve');
    try {
      await brandFetch(`/posts/${id}/approve`, { method: 'POST', body: JSON.stringify({}) });
      flash('🎉 Post approved and scheduled for publishing!');
    } catch (e: any) {
      setPosts(snapshot);
      flash(e.message || 'Could not approve this post.');
    } finally {
      setBusyId(null); setBusyAction(null);
    }
  };

  const startEdit = (post: QueuePost) => {
    setEditingPostId(post.id);
    setEditCaption(post.caption);
    setEditHashtags(post.hashtags?.join(' ') || '');
    setEditCta(post.ctaText || '');
    setEditPlatforms(new Set((post.targets || []).map((t) => t.platform)));
    const base = post.scheduledAt ? new Date(post.scheduledAt) : new Date(Date.now() + 60 * 60 * 1000);
    setEditDate(toDateInputValue(base));
    setEditTime(toTimeInputValue(base));
  };

  const cancelEdit = () => setEditingPostId(null);

  const togglePlatform = (platform: string) => {
    setEditPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const buildEditBody = () => ({
    caption: editCaption,
    hashtags: parseHashtags(editHashtags),
    ctaText: editCta.trim() || null,
    scheduledAt: combineDateTime(editDate, editTime),
    targets: buildTargetsPayload(),
  });

  /** Saves the edited fields without approving — post stays in the queue. */
  const handleSaveChanges = async (id: string) => {
    setBusyId(id); setBusyAction('save');
    try {
      const updated = await brandFetch<QueuePost>(`/posts/${id}`, { method: 'PATCH', body: JSON.stringify(buildEditBody()) });
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      flash('✏️ Changes saved.');
    } catch (e: any) {
      flash(e.message || 'Could not save your changes.');
    } finally {
      setBusyId(null); setBusyAction(null);
    }
  };

  /** Saves the edited fields and schedules the post for the chosen date/time. Optimistic, see handleReject's note. */
  const handleSchedule = async (id: string) => {
    const snapshot = posts;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setEditingPostId((cur) => (cur === id ? null : cur));
    setBusyId(id); setBusyAction('schedule');
    try {
      await brandFetch(`/posts/${id}/approve`, { method: 'POST', body: JSON.stringify(buildEditBody()) });
      flash('📅 Post scheduled — check Scheduled Posts.');
    } catch (e: any) {
      setPosts(snapshot);
      flash(e.message || 'Could not schedule this post.');
    } finally {
      setBusyId(null); setBusyAction(null);
    }
  };

  /**
   * Saves the edited fields and publishes immediately instead of waiting
   * for the scheduled time. The post leaves the visible queue the instant
   * this is clicked (optimistic — see handleReject's note; still valid here
   * since /approve moves the post out of NEEDS_APPROVAL server-side before
   * the platform API call even starts, win or lose). The request itself
   * still genuinely awaits the real Instagram/TikTok API calls on the
   * backend (fixed a prior bug where the request returned before publishing
   * had genuinely completed, so the UI could claim success on a post that
   * was never actually posted) — that can legitimately take up to ~30-40s
   * for video, but the queue and the rest of the dashboard no longer wait
   * on it: the "AMAI Engine running…" status below updates live from real
   * backend events as they happen, and every other page (Scheduled,
   * Published, Analytics) now hears about the outcome over the same
   * Supabase Realtime-backed SSE stream in real time regardless of how long
   * this one request takes.
   */
  const handlePublishNow = async (id: string) => {
    const snapshot = posts;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setEditingPostId((cur) => (cur === id ? null : cur));
    setBusyId(id); setBusyAction('publish');
    setLiveProgress('Starting the AMAI Engine…');
    try {
      const result = await brandFetch<{ status: string; publishErrors?: { platform: string; error: string }[] }>(
        `/posts/${id}/approve`,
        { method: 'POST', body: JSON.stringify({ ...buildEditBody(), publishNow: true }) },
      );

      const reasons = (result.publishErrors || []).map((e) => `${e.platform}: ${e.error}`).join(' · ');
      if (result.status === 'PUBLISHED') {
        flash('✅ Published — live on the connected platform(s) now.');
      } else if (result.status === 'FAILED') {
        // Every target exhausted its retries — a real, terminal failure.
        flash(`Publishing failed. ${reasons || 'Check the connected account and try again.'}`);
      } else if (reasons) {
        // Hit a retriable error on this attempt (e.g. a transient platform
        // timeout) — the backend already reverted it to SCHEDULED and will
        // retry automatically on the next publish pass, this is not a fake
        // success message.
        flash(`Hit a temporary issue and will retry automatically. ${reasons}`);
      } else {
        flash('Publishing — check Scheduled Posts for status.');
      }
    } catch (e: any) {
      // A genuine request-level failure (network error, 500 before the
      // approve transaction committed) means the post likely never actually
      // left NEEDS_APPROVAL server-side -- restore it rather than leaving
      // the queue showing one fewer post than actually still needs review.
      setPosts(snapshot);
      flash(e.message || 'Could not publish this post.');
    } finally {
      setBusyId(null); setBusyAction(null); setLiveProgress(null);
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
        <div className="p-3.5 rounded-[var(--radius-lg)] border text-xs font-semibold flex justify-between items-center" style={{ backgroundColor: 'var(--accent-success-subtle)', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}>
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="hover:opacity-70">✕</button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center space-x-2 border-b pb-3" style={{ borderColor: 'var(--card-border)' }}>
        <button
          onClick={() => setActiveTab('posts')}
          className="px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold transition-all duration-200 flex items-center space-x-2 touch-target"
          style={activeTab === 'posts'
            ? { backgroundColor: 'var(--accent-warning-subtle)', color: 'var(--accent-warning)', border: '1px solid var(--accent-warning)' }
            : { color: 'var(--text-muted)', border: '1px solid transparent' }}
        >
          <Send className="h-3.5 w-3.5" />
          <span>Pending Posts ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('replies')}
          className="px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold transition-all duration-200 flex items-center space-x-2 touch-target"
          style={activeTab === 'replies'
            ? { backgroundColor: 'var(--accent-warning-subtle)', color: 'var(--accent-warning)', border: '1px solid var(--accent-warning)' }
            : { color: 'var(--text-muted)', border: '1px solid transparent' }}
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
            <div className="exec-card p-12">
              <EmptyState
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="Approval Queue Empty"
                description="Upload media in the Media Library and the AMAI Engine will prepare new posts here for your review."
              />
            </div>
          ) : (
            posts.map((post) => {
              const platform = post.targets?.[0]?.platform || 'INSTAGRAM';
              const scheduledLabel = post.scheduledAt
                ? new Date(post.scheduledAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
                : 'AI-selected best time';
              const isEditing = editingPostId === post.id;
              const isBusy = busyId === post.id;

              return (
                <Reveal
                  key={post.id}
                  y={16}
                  className="exec-card exec-card-interactive p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {platform === 'TIKTOK' ? (
                        <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold flex items-center space-x-1">
                          <Video className="h-3.5 w-3.5" />
                          <span>TikTok</span>
                        </span>
                      ) : (
                        <span className="p-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold flex items-center space-x-1">
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
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(post)}
                          className="p-1.5 rounded-lg border text-xs font-semibold transition hover:border-amber-400"
                          style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                          title="Edit Post"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                        </button>
                      )}
                      <button
                        onClick={() => handleReject(post.id)}
                        disabled={isBusy}
                        className="p-1.5 rounded-lg border text-xs font-semibold transition hover:border-red-400 disabled:opacity-50"
                        style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                        title="Reject Post"
                      >
                        {isBusy && busyAction === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" /> : <Trash2 className="h-3.5 w-3.5 text-red-400" />}
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Caption</label>
                        <textarea
                          rows={4}
                          value={editCaption}
                          onChange={(e) => setEditCaption(e.target.value)}
                          className="w-full rounded-xl p-3 text-xs border outline-none focus:border-violet-500/50 transition"
                          style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Hashtags</label>
                          <input
                            type="text"
                            value={editHashtags}
                            onChange={(e) => setEditHashtags(e.target.value)}
                            placeholder="#amai #contentcreator"
                            className="w-full rounded-xl p-2.5 text-xs font-mono border outline-none focus:border-violet-500/50 transition"
                            style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Call To Action</label>
                          <input
                            type="text"
                            value={editCta}
                            onChange={(e) => setEditCta(e.target.value)}
                            placeholder="Link in bio!"
                            className="w-full rounded-xl p-2.5 text-xs border outline-none focus:border-violet-500/50 transition"
                            style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Target Platform(s)</label>
                        <div className="flex items-center gap-2">
                          {EDITABLE_PLATFORMS.map(({ platform: p, label, icon: Icon }) => {
                            const connected = !!accountFor(p);
                            const selected = editPlatforms.has(p);
                            return (
                              <button
                                key={p}
                                type="button"
                                disabled={!connected}
                                onClick={() => togglePlatform(p)}
                                title={connected ? undefined : `Connect ${label} in Integrations first`}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center space-x-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                                  selected ? 'bg-violet-500/15 text-violet-400 border-violet-500/40' : ''
                                }`}
                                style={!selected ? { backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' } : undefined}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{label}</span>
                                {!connected && <span className="text-[9px] opacity-70">(not connected)</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Publish Date</label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full rounded-xl p-2.5 text-xs border outline-none focus:border-violet-500/50 transition touch-target"
                            style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Publish Time</label>
                          <input
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="w-full rounded-xl p-2.5 text-xs border outline-none focus:border-violet-500/50 transition touch-target"
                            style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2 pt-1">
                        <button
                          onClick={cancelEdit}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-50"
                          style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveChanges(post.id)}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-lg text-xs font-bold border flex items-center space-x-1.5 disabled:opacity-50"
                          style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                        >
                          {isBusy && busyAction === 'save' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          <span>Save Changes</span>
                        </button>
                        <button
                          onClick={() => handleSchedule(post.id)}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-lg text-xs font-bold text-violet-600 dark:text-violet-400 border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 flex items-center space-x-1.5 transition disabled:opacity-50"
                        >
                          {isBusy && busyAction === 'schedule' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                          <span>Schedule</span>
                        </button>
                        <button
                          onClick={() => handlePublishNow(post.id)}
                          disabled={isBusy}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center space-x-1.5 shadow-md btn-emerald-cta disabled:opacity-50"
                        >
                          {isBusy && busyAction === 'publish' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                          <span>Publish Now</span>
                        </button>
                      </div>

                      {/* Real progress from the backend as it actually talks to
                          Instagram/TikTok — driven by PUBLISH_STARTED /
                          PUBLISH_UPLOADING SSE events, not a fake timer. */}
                      {isBusy && busyAction === 'publish' && liveProgress && (
                        <div
                          className="flex items-center space-x-2 text-[11px] font-semibold rounded-lg px-3 py-2 border"
                          style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                        >
                          <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
                          <span>{liveProgress}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
                        {post.caption}
                      </p>
                      {post.ctaText && (
                        <p className="text-xs font-semibold text-violet-500">{post.ctaText}</p>
                      )}
                      {post.hashtags?.length > 0 && (
                        <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {post.hashtags.join(' ')}
                        </p>
                      )}
                    </>
                  )}

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
                      <button
                        onClick={() => handleReject(post.id)}
                        disabled={isBusy}
                        className="px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold border transition flex items-center space-x-1.5 disabled:opacity-50"
                        style={{ color: 'var(--accent-error)', borderColor: 'var(--accent-error)', backgroundColor: 'var(--accent-error-subtle)' }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleApprove(post.id)}
                        disabled={isBusy}
                        className="px-5 py-2 rounded-[var(--radius-md)] text-xs font-bold text-white transition flex items-center space-x-1.5 shadow-md btn-emerald-cta disabled:opacity-50"
                      >
                        {isBusy && busyAction === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        <span>Approve &amp; Continue</span>
                      </button>
                    </div>
                  )}
                </Reveal>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
