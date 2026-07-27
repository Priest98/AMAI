"use client";
import React, { useState, useEffect } from 'react';
import UploadDropzone from "@/components/media/UploadDropzone";
import { Trash2, Film, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMediaAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/media/list');
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (e) {
      console.error('Failed to fetch media assets', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaAssets();
  }, []);

  const handleDeleteAsset = async (id: string) => {
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAssets(prev => prev.filter(a => a.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete asset', e);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Media Asset Library</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Upload photos and videos for automated posting. Published files are auto-cleaned from storage to keep costs low.
        </p>
      </div>

      {/* Upload Dropzone Component */}
      <div className="exec-card p-6 rounded-[24px]">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">Upload New Media & Folders</h2>
        <UploadDropzone onUploaded={fetchMediaAssets} />
      </div>

      {/* Media Gallery */}
      <div className="exec-card p-6 sm:p-7 rounded-[24px] space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Uploaded Assets</h2>
          <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">{assets.length} Assets</span>
        </div>

        {assets.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">No media assets uploaded yet.</p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Use the dropzone above to upload files or folders.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group relative aspect-square rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-zinc-950/60 overflow-hidden"
              >
                {asset.blobUrl ? (
                  asset.mimeType?.startsWith('video') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white p-2 text-center">
                      <Film className="h-6 w-6 text-rose-500 mb-1" />
                      <span className="text-[10px] font-mono truncate w-full">{asset.filename}</span>
                    </div>
                  ) : (
                    <img src={asset.blobUrl} alt={asset.filename} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-emerald-500/10">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">PUBLISHED</span>
                    <span className="text-[9px] text-slate-400 truncate w-full mt-0.5">{asset.filename}</span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                    asset.status === 'PUBLISHED' ? 'badge-success' : asset.status === 'SCHEDULED' ? 'badge-primary' : 'badge-warning'
                  }`}>
                    {asset.status}
                  </span>
                </div>

                {/* Hover Delete Action */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
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
