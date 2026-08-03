'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, X, MessageSquare, Share2, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { apiFetch, getBrandId } from '@/lib/api';
import EmptyState from '@/components/ui/EmptyState';

export interface PendingCommentReplyResponse {
  id: string;
  brandId: string;
  platform: string;
  platformAccountId: string;
  originalPostId: string;
  originalCommentId: string;
  originalCommentText: string;
  aiGeneratedReply: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  createdAt: string;
}

export default function PendingRepliesList() {
  const [replies, setReplies] = useState<PendingCommentReplyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const brandId = getBrandId();

  const fetchReplies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<PendingCommentReplyResponse[]>(`/growth/${brandId}/pending-replies`);
      setReplies(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch pending replies: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await apiFetch(`/growth/replies/${id}/approve`, { method: 'POST' });
      setReplies((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert('Failed to approve reply. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await apiFetch(`/growth/replies/${id}/reject`, { method: 'POST' });
      setReplies((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert('Failed to reject reply. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="exec-card p-6">
            <div className="skeleton h-4 w-1/4 mb-4" />
            <div className="skeleton h-3 w-3/4 mb-2" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="exec-card flex flex-col items-center justify-center py-20" style={{ borderColor: 'var(--accent-error)' }}>
        <AlertCircle className="w-10 h-10 mb-4" style={{ color: 'var(--accent-error)' }} />
        <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Something went wrong</h3>
        <p className="text-body-sm mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button
          onClick={fetchReplies}
          className="btn-secondary mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] touch-target"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <div className="exec-card">
        <EmptyState
          icon={<MessageSquare className="w-6 h-6" />}
          title="All caught up!"
          description="There are no pending AI replies waiting for your approval."
          actionLabel="Refresh"
          onAction={fetchReplies}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={fetchReplies}
          className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] touch-target"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {replies.map((reply) => (
        <div key={reply.id} className="exec-card p-6 flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="badge-purple inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium">
                <Share2 className="w-3.5 h-3.5" />
                {reply.platform}
              </span>
              <span className="text-caption flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                Post ID: {reply.originalPostId} <ExternalLink className="w-3 h-3" />
              </span>
            </div>

            <div className="mb-4">
              <p className="text-overline mb-1">User Comment</p>
              <p className="text-body-sm italic border-l-2 pl-3 py-1" style={{ color: 'var(--text-primary)', borderColor: 'var(--card-border)' }}>
                &ldquo;{reply.originalCommentText}&rdquo;
              </p>
            </div>

            <div>
              <p className="text-overline mb-1 flex items-center gap-2" style={{ color: 'var(--accent-secondary)' }}>
                ✨ AI Generated Reply
              </p>
              <div className="surface-tile p-3 text-body-sm" style={{ backgroundColor: 'var(--accent-secondary-subtle)', borderColor: 'var(--accent-secondary)', color: 'var(--text-primary)' }}>
                {reply.aiGeneratedReply}
              </div>
            </div>
          </div>

          <div className="flex md:flex-col items-center justify-center gap-3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6" style={{ borderColor: 'var(--card-border)' }}>
            <button
              onClick={() => handleApprove(reply.id)}
              disabled={actionLoading === reply.id}
              className="btn-emerald-cta flex-1 md:flex-none w-full flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-[var(--radius-md)] transition disabled:opacity-50 touch-target"
            >
              <Check className="w-4 h-4" />
              {actionLoading === reply.id ? 'Saving...' : 'Approve'}
            </button>
            <button
              onClick={() => handleReject(reply.id)}
              disabled={actionLoading === reply.id}
              className="btn-secondary flex-1 md:flex-none w-full flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-[var(--radius-md)] transition disabled:opacity-50 touch-target"
            >
              <X className="w-4 h-4" />
              {actionLoading === reply.id ? 'Saving...' : 'Reject'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
