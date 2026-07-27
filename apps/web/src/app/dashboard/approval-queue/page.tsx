"use client";

import React, { useState, useEffect } from 'react';
import PendingRepliesList from './PendingRepliesList';
import SectionHeader from '@/components/ui/SectionHeader';
import Badge from '@/components/ui/Badge';
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
} from 'lucide-react';

interface QueuePost {
  id: string;
  caption: string;
  platform: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  scheduledTime?: string;
  mediaUrl?: string;
}

export default function ApprovalQueuePage() {
  const [activeTab, setActiveTab] = useState<'posts' | 'replies'>('posts');
  const [posts, setPosts] = useState<QueuePost[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaptionText, setEditCaptionText] = useState('');
  const [message, setMessage] = useState('');

  const loadPosts = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('amai_approval_queue_posts');
      if (stored) {
        try {
          const list = JSON.parse(stored);
          setPosts(list.filter((p: QueuePost) => p.status === 'PENDING_APPROVAL'));
          return;
        } catch {}
      }
    }
    // Initial sample pending posts if empty
    const initialSamples: QueuePost[] = [
      {
        id: 'post_sample_1',
        caption: '✨ Elevate your style today! Discover our latest luxury garment designs crafted specially for your everyday wardrobe. What do you think of this look? Let us know below! #FashionDesigner #GarmentDesign #StyleInspo #Couture',
        platform: 'INSTAGRAM',
        status: 'PENDING_APPROVAL',
        createdAt: new Date().toISOString(),
        scheduledTime: 'Today, 7:45 PM',
      },
      {
        id: 'post_sample_2',
        caption: '🎥 Behind the scenes at our studio: Tailoring & fabric details for the upcoming seasonal collection. Drop a 🧵 if you love handcrafted fashion! #RunwayStyle #Tailoring #OOTD',
        platform: 'TIKTOK',
        status: 'PENDING_APPROVAL',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        scheduledTime: 'Tomorrow, 6:30 PM',
      },
    ];
    setPosts(initialSamples);
    if (typeof window !== 'undefined') {
      localStorage.setItem('amai_approval_queue_posts', JSON.stringify(initialSamples));
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleApprove = (id: string) => {
    const updated = posts.filter(p => p.id !== id);
    setPosts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('amai_approval_queue_posts', JSON.stringify(updated));
      const currentApproved = parseInt(localStorage.getItem('amai_approved_count') || '3', 10);
      localStorage.setItem('amai_approved_count', (currentApproved + 1).toString());
    }
    setMessage('🎉 Post approved and queued for publishing!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleReject = (id: string) => {
    const updated = posts.filter(p => p.id !== id);
    setPosts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('amai_approval_queue_posts', JSON.stringify(updated));
    }
    setMessage('❌ Post rejected and removed from queue.');
    setTimeout(() => setMessage(''), 3000);
  };

  const startEdit = (post: QueuePost) => {
    setEditingPostId(post.id);
    setEditCaptionText(post.caption);
  };

  const saveEdit = (id: string) => {
    const updated = posts.map(p => p.id === id ? { ...p, caption: editCaptionText } : p);
    setPosts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('amai_approval_queue_posts', JSON.stringify(updated));
    }
    setEditingPostId(null);
    setMessage('✏️ Post caption updated!');
    setTimeout(() => setMessage(''), 2500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <SectionHeader
        title="Approval Queue"
        subtitle="Review, edit, and approve AI-generated social posts and comment replies before they go live."
        action={
          <div className="flex items-center space-x-2">
            <Badge variant="emerald">
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
      ) : (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-xl border p-12 text-center space-y-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Approval Queue Empty</h3>
              <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                All generated social posts have been reviewed and approved! Create new content in the Composer or enable Auto-Publish.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border p-5 transition space-y-4"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    {post.platform.includes('TIKTOK') ? (
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
                      <span>Scheduled: {post.scheduledTime || 'Smart AI Time (7:45 PM)'}</span>
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
                      className="p-1.5 rounded-lg border text-xs font-semibold transition hover:border-rose-400"
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
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-black"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
                    {post.caption}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-white/5">
                  <button
                    onClick={() => handleReject(post.id)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border text-rose-400 border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 transition flex items-center space-x-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleApprove(post.id)}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center space-x-1.5 shadow-md btn-emerald-cta"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approve Post</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
