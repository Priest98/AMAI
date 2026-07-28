"use client";
import React, { useState, useEffect, useCallback } from 'react';
import UploadDropzone from "@/components/media/UploadDropzone";
import { brandFetch } from '@/lib/api';
import { useEngineEvents } from '@/lib/useEngineEvents';
import { Trash2, Film, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface MediaAsset {
  id: string;
  filename: string;
  mimeType: string;
  blobUrl: string | null;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
  lastErrorMessage?: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Uploaded', className: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  PROCESSING: { label: 'AMAI is preparing this…', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  READY: { label: 'Ready for review', className: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  SCHEDULED: { label: 'Scheduled', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  PUBLISHED: { label: 'Published', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  FAILED: { label: 'Failed', className: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
};

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMediaAssets = useCallback(async () => {
    try {
      const data = await brandFetch<MediaAsset[]>('/media/assets');
      setAssets(Array.isArray(data) ? data : []);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Could not load your media library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMediaAssets(); }, [fetchMediaAssets]);

  // Live updates: as soon as the AMAI Engine finishes analysing/preparing an
  // uploaded file, this refetches so the status badge updates without a
  // page refresh.
  useEngineEvents((event) => {
    if (event.mediaAssetId || event.type === 'MEDIA_UPLOADED') {
      fetchMediaAssets();
    }
  });

  const handleUploaded = () => {
    // Optimistic refetch right away; the SSE listener above will also catch
    // the AMAI Engine's follow-up status changes as they happen.
    fetchMediaAssets();
  };

  const handleDeleteAsset = async (id: string) => {
    const prev = assets;
    setAssets(assets.filter((a) => a.id !== id));
    try {
      await brandFetch(`/media/assets/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      setAssets(prev); // revert on failure
      setError(e.message || 'Could not delete that file.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 sm:pb-12">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Media Library</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Upload photos and videos — the AMAI Engine takes it from here.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border bg-rose-500/10 border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Dropzone Component */}
      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
        <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-3">Upload New Media</h2>
        <UploadDropzone onUploaded={handleUploaded} />
      </div>

      {/* Media Gallery */}
      <div className="rounded-2xl border p-5 sm:p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">Uploaded Assets</h2>
          <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">{assets.length} Assets</span>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl">
            <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">No media assets uploaded yet.</p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Drag and drop files above to see them appear here instantly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {assets.map((asset) => {
              const statusInfo = STATUS_LABEL[asset.status] || STATUS_LABEL.PENDING;
              return (
                <div
                  key={asset.id}
                  className="group relative aspect-square rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-zinc-950/60 overflow-hidden"
                >
                  {asset.blobUrl ? (
                    asset.mimeType?.startsWith('video') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white p-2 text-center">
                        <Film className="h-6 w-6 text-amber-400 mb-1" />
                        <span className="text-[10px] font-mono truncate w-full">{asset.filename}</span>
                      </div>
                    ) : (
                      <img src={asset.blobUrl} alt={asset.filename || "Uploaded media"} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-emerald-500/10">
                      <Sparkles className="h-6 w-6 text-emerald-400 mb-1" />
                      <span className="text-[10px] font-bold text-emerald-400">PUBLISHED</span>
                      <span className="text-[9px] text-slate-400 truncate w-full mt-0.5">{asset.filename}</span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 right-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusInfo.className}`}>
                      {asset.status === 'PROCESSING' && <Loader2 className="inline h-2.5 w-2.5 mr-1 animate-spin" />}
                      {statusInfo.label}
                    </span>
                  </div>

                  {asset.status === 'FAILED' && asset.lastErrorMessage && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 px-2 py-1">
                      <p className="text-[9px] text-rose-300 truncate">{asset.lastErrorMessage}</p>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-2 rounded-xl bg-rose-500 text-white shadow-lg hover:scale-105 transition touch-target"
                      title="Delete File"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
