'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, X, MessageSquare, Share2, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('marketing_os_token');
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function getBrandIdFromToken(): string | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.brandId || null;
  } catch {
    return null;
  }
}

export default function PendingRepliesList() {
  const [replies, setReplies] = useState<PendingCommentReplyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Derive brandId from the JWT rather than hardcoding it
  const brandId = getBrandIdFromToken();

  const fetchReplies = useCallback(async () => {
    if (!brandId) {
      setError('Could not determine your brand. Please log out and log back in.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/growth/${brandId}/pending-replies`, {
        headers: getAuthHeaders(),
      });

      if (res.status === 401) {
        setError('Session expired. Please refresh the page.');
        return;
      }

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
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
      const res = await fetch(`${API_BASE}/growth/replies/${id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Approve failed');
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
      const res = await fetch(`${API_BASE}/growth/replies/${id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Reject failed');
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
          <div key={i} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/4 mb-4" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-800 rounded-lg border border-red-200 dark:border-red-800">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Something went wrong</h3>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-center text-sm">{error}</p>
        <button
          onClick={fetchReplies}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <MessageSquare className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-4" />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">All caught up!</h3>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-center">
          There are no pending AI replies waiting for your approval.
        </p>
        <button
          onClick={fetchReplies}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={fetchReplies}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {replies.map((reply) => (
        <div key={reply.id} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 shadow-sm flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300">
                <Share2 className="w-3.5 h-3.5" />
                {reply.platform}
              </span>
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                Post ID: {reply.originalPostId} <ExternalLink className="w-3 h-3" />
              </span>
            </div>
            
            <div className="mb-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">User Comment</p>
              <p className="text-zinc-900 dark:text-zinc-100 italic border-l-4 border-zinc-200 dark:border-zinc-700 pl-3 py-1">
                &ldquo;{reply.originalCommentText}&rdquo;
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                ✨ AI Generated Reply
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 p-3 rounded-md text-sm border border-blue-100 dark:border-blue-800/50">
                {reply.aiGeneratedReply}
              </div>
            </div>
          </div>
          
          <div className="flex md:flex-col items-center justify-center gap-3 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-700/50 pt-4 md:pt-0 md:pl-6">
            <button
              onClick={() => handleApprove(reply.id)}
              disabled={actionLoading === reply.id}
              className="flex-1 md:flex-none w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {actionLoading === reply.id ? 'Saving...' : 'Approve'}
            </button>
            <button
              onClick={() => handleReject(reply.id)}
              disabled={actionLoading === reply.id}
              className="flex-1 md:flex-none w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
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
