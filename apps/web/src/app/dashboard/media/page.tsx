"use client";
import React, { useState, useEffect } from 'react';
import UploadDropzone from "@/components/media/UploadDropzone";
import { Trash2, Film, CheckCircle2 } from 'lucide-react';

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMediaAssets = async () => {
    setLoading(true);
    let apiAssets: any[] = [];
    try {
      const res = await fetch('/api/media/list');
      if (res.ok) {
        const data = await res.json();
        apiAssets = data.assets || [];
      }
    } catch (e) {
      console.error('Failed to fetch media assets from API', e);
    }

    // Combine with local storage assets for immediate real-time rendering
    let localAssets: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('amai_uploaded_assets');
        if (stored) localAssets = JSON.parse(stored);
      } catch {}
    }

    const mergedMap = new Map();
    [...localAssets, ...apiAssets].forEach((item) => {
      if (item && item.id) mergedMap.set(item.id, item);
    });

    const combined = Array.from(mergedMap.values());
    setAssets(combined);
    setLoading(false);
  };

  useEffect(() => {
    fetchMediaAssets();
  }, []);

  const handleDeleteAsset = async (id: string) => {
    // 1. Remove from API
    try {
      await fetch(`/api/media/${id}`, { method: 'DELETE' }).catch(() => null);
    } catch {}

    // 2. Remove from state & localStorage
    const updated = assets.filter(a => a.id !== id);
    setAssets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('amai_uploaded_assets', JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 sm:pb-12">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Media Asset Library</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Upload photos and videos to trigger automatic AI post generation and scheduling.
        </p>
      </div>

      {/* Upload Dropzone Component */}
      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
        <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-3">Upload New Media & Folders</h2>
        <UploadDropzone onUploaded={fetchMediaAssets} />
      </div>

      {/* Media Gallery */}
      <div className="rounded-2xl border p-5 sm:p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">Uploaded Assets</h2>
          <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">{assets.length} Assets</span>
        </div>

        {assets.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl">
            <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">No media assets uploaded yet.</p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Drag and drop files above to see them appear here instantly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {assets.map((asset) => (
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
                    <img src={asset.blobUrl} alt={asset.filename || "Uploaded media"} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-emerald-500/10">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-1" />
                    <span className="text-[10px] font-bold text-emerald-400">UPLOADED</span>
                    <span className="text-[9px] text-slate-400 truncate w-full mt-0.5">{asset.filename}</span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {asset.status || "READY"}
                  </span>
                </div>

                {/* Hover Delete Action */}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
