"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import Badge from '@/components/ui/Badge';
import CalendarInsights from '@/components/calendar/CalendarInsights';
import { Reveal } from '@/components/ui/Reveal';
import { brandFetch } from '@/lib/api';
import { useEngineEvents } from '@/lib/useEngineEvents';
import {
  ChevronLeft,
  ChevronRight,
  Instagram,
  Video,
  Image as ImageIcon,
  Loader2,
  X,
  Trash2,
  Save,
  CheckCircle2,
  GripVertical,
  CalendarClock,
} from 'lucide-react';

type PostStatus = 'NEEDS_APPROVAL' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

interface CalendarPost {
  id: string;
  caption: string;
  hashtags: string[];
  status: PostStatus;
  scheduledAt: string | null;
  targets?: { platform: string; status?: string }[];
  media?: { asset: { blobUrl: string | null; mimeType: string; filename?: string } }[];
}

interface EngineConfig {
  timeZone: string;
  postsPerDay: number;
}

const STATUS_LABEL: Record<PostStatus, string> = {
  NEEDS_APPROVAL: 'Awaiting Approval',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  FAILED: 'Failed',
};

const STATUS_COLOR: Record<PostStatus, string> = {
  NEEDS_APPROVAL: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  SCHEDULED: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  PUBLISHED: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  FAILED: 'text-red-400 border-red-500/30 bg-red-500/10',
};

const DAYS_VISIBLE = 7;

function civilKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Converts a civil wall-clock Y-M-D + H:M in `timeZone` to the correct UTC instant. Mirrors the backend's SchedulingService helper. */
function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const asUTC = Date.UTC(year, month - 1, day, hour, minute, 0);
  const guess = new Date(asUTC);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const parts = fmt.formatToParts(guess).reduce((acc: Record<string, string>, p) => { acc[p.type] = p.value; return acc; }, {});
  const hh = parts.hour === '24' ? 0 : Number(parts.hour);
  const asIfLocal = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hh, Number(parts.minute), Number(parts.second));
  return new Date(asUTC - (asIfLocal - asUTC));
}

/** Applies a target civil date's Y-M-D to an existing instant's hour/minute (in the given time zone), used for drag-and-drop reschedules. */
function retimeToDay(original: Date, targetDayKey: string, timeZone: string): Date {
  const timeParts = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, hour: '2-digit', minute: '2-digit' }).formatToParts(original);
  const hour = Number(timeParts.find((p) => p.type === 'hour')?.value ?? '12') % 24;
  const minute = Number(timeParts.find((p) => p.type === 'minute')?.value ?? '0');
  const [y, m, d] = targetDayKey.split('-').map(Number);
  return zonedTimeToUtc(y, m, d, hour, minute, timeZone);
}

function parseHashtags(raw: string): string[] {
  return Array.from(new Set(raw.split(/\s+/).map((h) => h.trim()).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`))));
}

export default function CalendarPage() {
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => new Date());
  const [message, setMessage] = useState('');
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<CalendarPost | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [editTime, setEditTime] = useState('');
  const [saving, setSaving] = useState(false);

  const timeZone = config?.timeZone || 'UTC';

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3500); };

  const load = useCallback(async () => {
    try {
      const [cfg, needsApproval, scheduled, published, failed] = await Promise.all([
        brandFetch<EngineConfig>('/engine/state'),
        brandFetch<CalendarPost[]>('/posts?status=NEEDS_APPROVAL'),
        brandFetch<CalendarPost[]>('/posts?status=SCHEDULED'),
        brandFetch<CalendarPost[]>('/posts?status=PUBLISHED'),
        brandFetch<CalendarPost[]>('/posts?status=FAILED'),
      ]);
      setConfig(cfg);
      setPosts([...(needsApproval || []), ...(scheduled || []), ...(published || []), ...(failed || [])]);
    } catch (e: any) {
      flash(e.message || 'Could not load the publishing calendar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEngineEvents((event) => {
    if (['APPROVAL_QUEUED', 'AUTO_SCHEDULED', 'POST_APPROVED', 'POST_REJECTED', 'POST_EDITED', 'PUBLISH_SUCCEEDED', 'PUBLISH_FAILED'].includes(event.type)) {
      load();
    }
  });

  const days = useMemo(() => Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const postsByDay = useMemo(() => {
    const map: Record<string, CalendarPost[]> = {};
    for (const p of posts) {
      if (!p.scheduledAt) continue;
      const key = civilKey(new Date(p.scheduledAt), timeZone);
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
    }
    return map;
  }, [posts, timeZone]);

  const rescheduleToDay = async (post: CalendarPost, targetDayKey: string) => {
    if (post.status !== 'SCHEDULED' && post.status !== 'NEEDS_APPROVAL') return;
    const newDate = retimeToDay(new Date(post.scheduledAt!), targetDayKey, timeZone);
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, scheduledAt: newDate.toISOString() } : p)));
    try {
      await brandFetch(`/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ scheduledAt: newDate.toISOString() }) });
      flash('Post moved.');
    } catch (e: any) {
      flash(e.message || 'Could not reschedule this post.');
      load();
    }
  };

  const openEdit = (post: CalendarPost) => {
    setEditPost(post);
    setEditCaption(post.caption);
    setEditHashtags(post.hashtags?.join(' ') || '');
    const d = post.scheduledAt ? new Date(post.scheduledAt) : new Date();
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, hour: '2-digit', minute: '2-digit' }).formatToParts(d);
    const hh = parts.find((p) => p.type === 'hour')?.value ?? '12';
    const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
    setEditTime(`${hh === '24' ? '00' : hh}:${mm}`);
  };

  const closeEdit = () => setEditPost(null);

  const saveEdit = async () => {
    if (!editPost) return;
    setSaving(true);
    try {
      const dayKey = civilKey(new Date(editPost.scheduledAt!), timeZone);
      const [y, mo, da] = dayKey.split('-').map(Number);
      const [h, m] = editTime.split(':').map(Number);
      const scheduledAt = zonedTimeToUtc(y, mo, da, h, m, timeZone).toISOString();

      await brandFetch(`/posts/${editPost.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ caption: editCaption, hashtags: parseHashtags(editHashtags), scheduledAt }),
      });
      flash('Changes saved.');
      closeEdit();
      load();
    } catch (e: any) {
      flash(e.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async () => {
    if (!editPost) return;
    setSaving(true);
    try {
      await brandFetch(`/posts/${editPost.id}/reject`, { method: 'POST' });
      flash('Post removed from the calendar.');
      closeEdit();
      load();
    } catch (e: any) {
      flash(e.message || 'Could not remove this post.');
    } finally {
      setSaving(false);
    }
  };

  const approvePost = async () => {
    if (!editPost) return;
    setSaving(true);
    try {
      await brandFetch(`/posts/${editPost.id}/approve`, { method: 'POST', body: JSON.stringify({}) });
      flash('Post approved and scheduled.');
      closeEdit();
      load();
    } catch (e: any) {
      flash(e.message || 'Could not approve this post.');
    } finally {
      setSaving(false);
    }
  };

  const totalVisible = days.reduce((sum, d) => sum + (postsByDay[civilKey(d, timeZone)]?.length || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 sm:pb-12">
      <SectionHeader
        title="Publishing Calendar"
        subtitle="The AI-built 7-day content calendar. Drag a post to another day, or click it to edit."
        action={
          <Badge variant="success">
            <span className="flex items-center space-x-1">
              <CalendarClock className="h-3 w-3 text-blue-400" />
              <span>{totalVisible} posts this week</span>
            </span>
          </Badge>
        }
      />

      {message && (
        <div className="p-3.5 rounded-[var(--radius-lg)] border text-xs font-semibold flex justify-between items-center" style={{ backgroundColor: 'var(--accent-success-subtle)', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}>
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="hover:opacity-70">✕</button>
        </div>
      )}

      <CalendarInsights />

      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart((d) => addDays(d, -DAYS_VISIBLE))}
          className="surface-tile px-3 py-2 text-xs font-bold flex items-center gap-1.5 touch-target"
          style={{ color: 'var(--text-primary)' }}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </button>
        <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
          {days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {days[DAYS_VISIBLE - 1].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ({timeZone})
        </span>
        <button
          onClick={() => setWeekStart((d) => addDays(d, DAYS_VISIBLE))}
          className="surface-tile px-3 py-2 text-xs font-bold flex items-center gap-1.5 touch-target"
          style={{ color: 'var(--text-primary)' }}
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {days.map((day) => {
            const key = civilKey(day, timeZone);
            const dayPosts = postsByDay[key] || [];
            const isToday = key === civilKey(new Date(), timeZone);
            const isDragOver = dragOverKey === key;

            return (
              <div
                key={key}
                onDragOver={(e) => { e.preventDefault(); setDragOverKey(key); }}
                onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverKey(null);
                  const postId = e.dataTransfer.getData('text/post-id');
                  const post = posts.find((p) => p.id === postId);
                  if (post) rescheduleToDay(post, key);
                }}
                className="rounded-[var(--radius-lg)] border p-2.5 min-h-[180px] space-y-2 transition-all duration-200"
                style={{
                  backgroundColor: isDragOver ? 'var(--accent-secondary-subtle)' : 'var(--bg-surface)',
                  borderColor: isDragOver ? 'var(--accent-secondary)' : 'var(--card-border)',
                }}
              >
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: isToday ? 'var(--accent-secondary)' : 'var(--text-muted)' }}>
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </span>
                  <span className="text-xs font-extrabold" style={{ color: isToday ? 'var(--accent-secondary)' : 'var(--text-primary)' }}>
                    {day.getDate()}
                  </span>
                </div>

                {dayPosts.length === 0 ? (
                  <div className="py-6 text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>No posts</div>
                ) : (
                  dayPosts.map((post) => {
                    const draggable = post.status === 'SCHEDULED' || post.status === 'NEEDS_APPROVAL';
                    const thumb = post.media?.[0]?.asset;
                    const isVideo = thumb?.mimeType?.startsWith('video/');
                    const timeLabel = post.scheduledAt
                      ? new Date(post.scheduledAt).toLocaleTimeString(undefined, { timeZone, hour: 'numeric', minute: '2-digit' })
                      : '';

                    return (
                      <button
                        key={post.id}
                        draggable={draggable}
                        onDragStart={(e) => { e.dataTransfer.setData('text/post-id', post.id); }}
                        onClick={() => openEdit(post)}
                        className="w-full text-left rounded-[var(--radius-md)] border p-2 space-y-1.5 transition-all duration-200 hover:-translate-y-0.5"
                        style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', boxShadow: 'var(--elevation-1)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-secondary)'; e.currentTarget.style.boxShadow = 'var(--elevation-2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.boxShadow = 'var(--elevation-1)'; }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_COLOR[post.status]}`}>
                            {STATUS_LABEL[post.status]}
                          </span>
                          {draggable && <GripVertical className="h-3 w-3 shrink-0" style={{ color: 'var(--text-muted)' }} />}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {thumb?.blobUrl && !isVideo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb.blobUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                          ) : (
                            <div className="h-8 w-8 rounded shrink-0 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                              {isVideo ? <Video className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} /> : <ImageIcon className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />}
                            </div>
                          )}
                          <p className="text-[10px] leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{post.caption}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {(post.targets || []).map((t) => (
                              t.platform === 'TIKTOK'
                                ? <Video key={t.platform} className="h-3 w-3 text-cyan-400" />
                                : <Instagram key={t.platform} className="h-3 w-3 text-red-500" />
                            ))}
                          </div>
                          <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{timeLabel}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </Reveal>
      )}

      {/* ── Edit modal ── */}
      {editPost && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(10, 11, 20, 0.55)', backdropFilter: 'blur(4px)' }} onClick={closeEdit}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel w-full max-w-lg rounded-[var(--radius-xl)] p-6 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Edit Post</h3>
              <button onClick={closeEdit} className="w-8 h-8 rounded-full flex items-center justify-center transition hover:opacity-80" style={{ backgroundColor: 'var(--hover-surface)', color: 'var(--text-secondary)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded border ${STATUS_COLOR[editPost.status]}`}>
              {STATUS_LABEL[editPost.status]}
            </span>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Caption</label>
              <textarea
                rows={4}
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                disabled={editPost.status === 'PUBLISHED' || editPost.status === 'FAILED'}
                className="w-full rounded-xl p-3 text-xs border outline-none focus:border-blue-500/50 transition disabled:opacity-50"
                style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Hashtags</label>
              <input
                type="text"
                value={editHashtags}
                onChange={(e) => setEditHashtags(e.target.value)}
                disabled={editPost.status === 'PUBLISHED' || editPost.status === 'FAILED'}
                className="w-full rounded-xl p-2.5 text-xs font-mono border outline-none focus:border-blue-500/50 transition disabled:opacity-50"
                style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Time ({timeZone})</label>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                disabled={editPost.status === 'PUBLISHED' || editPost.status === 'FAILED'}
                className="w-full rounded-xl p-2.5 text-xs border outline-none focus:border-blue-500/50 transition disabled:opacity-50 touch-target"
                style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {(editPost.status === 'SCHEDULED' || editPost.status === 'NEEDS_APPROVAL') && (
                <button
                  onClick={deletePost}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg text-xs font-bold border text-red-400 border-red-500/20 bg-red-500/10 hover:bg-red-500/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
              {(editPost.status === 'SCHEDULED' || editPost.status === 'NEEDS_APPROVAL') && (
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-1.5 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                </button>
              )}
              {editPost.status === 'NEEDS_APPROVAL' && (
                <button
                  onClick={approvePost}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
