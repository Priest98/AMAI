"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import UploadDropzone from "@/components/media/UploadDropzone";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCardGrid } from "@/components/ui/Skeleton";
import { apiFetch, brandFetch, getBrandId, API_BASE } from '@/lib/api';
import { useEngineEvents } from '@/lib/useEngineEvents';
import { GoogleDriveLogo } from '@/components/icons/platform-logos';
import {
  Trash2, Film, Loader2, Sparkles, AlertCircle, CheckCircle2, MoreVertical,
  RefreshCw, FolderSync, LogOut, X, Upload,
} from 'lucide-react';

interface MediaAsset {
  id: string;
  filename: string;
  mimeType: string;
  blobUrl: string | null;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
  lastErrorMessage?: string | null;
  createdAt: string;
}

interface GoogleDriveConfig {
  id: string;
  status: string;
  driveFolderId: string;
  folderName: string;
  accountEmail: string;
  updatedAt: string;
}

interface FolderOption {
  id: string;
  name: string;
  isSelected?: boolean;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Uploaded', className: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  PROCESSING: { label: 'AMAI is preparing this…', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  READY: { label: 'Ready for review', className: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  SCHEDULED: { label: 'Scheduled', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  PUBLISHED: { label: 'Published', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  FAILED: { label: 'Failed', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

function MediaSourceSection() {
  const searchParams = useSearchParams();
  const [googleDrive, setGoogleDrive] = useState<GoogleDriveConfig | null>(null);
  const [localGoogle, setLocalGoogle] = useState<{ email: string; folderName?: string } | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<FolderOption[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [updatingFolder, setUpdatingFolder] = useState(false);

  const fetchDriveStatus = useCallback(async () => {
    try {
      const data = await apiFetch<{ googleDrive?: GoogleDriveConfig }>(`/oauth/accounts?brandId=${getBrandId()}`);
      if (data?.googleDrive) setGoogleDrive(data.googleDrive);
    } catch {
      // Non-fatal — the card just shows "not connected" until this succeeds.
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const g = localStorage.getItem('amai_connected_google');
        if (g) setLocalGoogle(JSON.parse(g));
      } catch {}
    }
    fetchDriveStatus();
  }, [fetchDriveStatus]);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const platform = searchParams.get('platform');
    const account = searchParams.get('account');

    if (success && platform) {
      const gData = { email: account || 'Google Account', folderName: 'content', connectedAt: new Date().toISOString() };
      localStorage.setItem('amai_connected_google', JSON.stringify(gData));
      setLocalGoogle(gData);
      setMessage({ text: `Google Drive connected${account ? ` (${account})` : ''}.`, type: 'success' });
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchDriveStatus();
    } else if (error) {
      setMessage({ text: error, type: 'error' });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isConnected = googleDrive?.status === 'CONNECTED' || !!localGoogle;
  const email = googleDrive?.accountEmail || localGoogle?.email || 'Google Workspace';
  const folder = googleDrive?.folderName || localGoogle?.folderName || 'content';

  const handleConnect = () => {
    window.location.href = `${API_BASE}/oauth/google/connect?brandId=${getBrandId()}`;
  };

  const handleDisconnect = async () => {
    try {
      await apiFetch(`/oauth/google/disconnect?brandId=${getBrandId()}`, { method: 'DELETE' });
    } catch {}
    localStorage.removeItem('amai_connected_google');
    setLocalGoogle(null);
    setGoogleDrive(null);
    setMenuOpen(false);
    setMessage({ text: 'Google Drive disconnected.', type: 'success' });
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setMenuOpen(false);
    try {
      const result = await brandFetch<{ ingested: number; connected: boolean }>('/engine/sync-drive', { method: 'POST' });
      if (!result.connected) {
        setMessage({ text: 'Connect a Drive folder first, then sync.', type: 'error' });
      } else if (result.ingested > 0) {
        setMessage({ text: `Synced — pulled in ${result.ingested} new file${result.ingested === 1 ? '' : 's'}.`, type: 'success' });
      } else {
        setMessage({ text: 'Synced — no new files since last check.', type: 'success' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Sync failed. Please try again.', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const openFolderModal = async () => {
    setMenuOpen(false);
    setIsFolderModalOpen(true);
    try {
      const folders = await apiFetch<FolderOption[]>(`/oauth/google/folders?brandId=${getBrandId()}`);
      setAvailableFolders(folders);
      const current = folders.find((f) => f.isSelected);
      if (current) setSelectedFolderId(current.id);
    } catch {
      setMessage({ text: 'Could not load your Drive folders.', type: 'error' });
    }
  };

  const handleSaveFolder = async () => {
    setUpdatingFolder(true);
    try {
      const chosen = availableFolders.find((f) => f.id === selectedFolderId);
      await apiFetch('/oauth/google/select-folder', {
        method: 'POST',
        body: JSON.stringify({ brandId: getBrandId(), folderId: selectedFolderId, folderName: chosen?.name }),
      });
      setMessage({ text: `Watching folder "${chosen?.name || selectedFolderId}".`, type: 'success' });
      setIsFolderModalOpen(false);
      fetchDriveStatus();
    } catch (e: any) {
      setMessage({ text: e.message || 'Could not update the folder.', type: 'error' });
    } finally {
      setUpdatingFolder(false);
    }
  };

  return (
    <div className="exec-card p-5 sm:p-6">
      <h2 className="text-h3 mb-4" style={{ color: 'var(--text-primary)' }}>Media Source</h2>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mb-3 p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} style={{ color: 'var(--text-secondary)' }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Upload Directly */}
        <div className="surface-tile p-4 space-y-3">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-[var(--radius-md)] flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface-sunken)' }}>
              <Upload className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div>
              <p className="text-body-sm font-bold" style={{ color: 'var(--text-primary)' }}>Upload directly</p>
              <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>Drop photos or videos in below</p>
            </div>
          </div>
        </div>

        {/* Google Drive */}
        <div className="surface-tile p-4 space-y-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center p-1.5" style={{ backgroundColor: 'var(--bg-surface-raised)' }}>
                <GoogleDriveLogo className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Google Drive</p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Auto-sync a watched folder</p>
              </div>
            </div>

            {isConnected ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="h-8 w-8 rounded-lg border flex items-center justify-center touch-target"
                  style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 top-10 w-44 rounded-xl border shadow-2xl p-1.5 z-30 text-xs font-semibold space-y-0.5"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
                    >
                      <button
                        onClick={handleSyncNow}
                        disabled={syncing}
                        className="w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2 touch-target disabled:opacity-50"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-blue-500 ${syncing ? 'animate-spin' : ''}`} />
                        <span>{syncing ? 'Syncing…' : 'Sync Now'}</span>
                      </button>
                      <button
                        onClick={openFolderModal}
                        className="w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2 touch-target"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <FolderSync className="h-3.5 w-3.5 text-blue-500" />
                        <span>Change Folder</span>
                      </button>
                      <button
                        onClick={handleDisconnect}
                        className="w-full text-left px-3 py-2 rounded-lg text-red-500 flex items-center space-x-2 touch-target"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm btn-gold-cta touch-target"
              >
                Connect
              </button>
            )}
          </div>

          {isConnected ? (
            <div className="p-2.5 rounded-lg border text-[11px] space-y-1" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1 font-bold text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Watching</span>
                </span>
                <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>/{folder}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>{email}</p>
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Connect a folder and AMAI pulls in new files automatically, same as a direct upload.
            </p>
          )}
        </div>
      </div>

      {/* Folder Picker Modal */}
      <AnimatePresence>
        {isFolderModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-xl border max-w-md w-full p-6 space-y-6 shadow-2xl"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl border flex items-center justify-center p-2 flex-shrink-0" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                  <GoogleDriveLogo className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Select Google Drive folder</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Choose which folder AMAI should watch</p>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableFolders.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>Loading folders…</p>
                ) : (
                  availableFolders.map((f) => (
                    <label
                      key={f.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition touch-target"
                      style={{
                        backgroundColor: selectedFolderId === f.id ? 'var(--bg-surface-raised)' : 'transparent',
                        borderColor: 'var(--card-border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <div className="flex items-center space-x-3 text-xs">
                        <input
                          type="radio"
                          name="folder_select"
                          checked={selectedFolderId === f.id}
                          onChange={() => setSelectedFolderId(f.id)}
                          className="text-blue-600 h-4 w-4"
                        />
                        <span>{f.name}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
                <button
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold touch-target"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFolder}
                  disabled={updatingFolder || !selectedFolderId}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 touch-target btn-emerald-cta"
                >
                  {updatingFolder ? 'Saving…' : 'Save Selection'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  // uploaded file (whether it came from a direct upload or a Drive sync),
  // this refetches so the status badge updates without a page refresh. A
  // full refetch (rather than patching just the one asset) is deliberate —
  // it also catches Google Drive imports and any other brand activity that
  // didn't originate from this tab's own upload flow.
  useEngineEvents((event) => {
    if (event.mediaAssetId || event.type === 'MEDIA_UPLOADED') {
      fetchMediaAssets();
    }
  });

  const handleUploaded = (asset: MediaAsset) => {
    // Optimistic insert — the asset appears in the grid the instant
    // register() resolves, instead of waiting on a round-trip refetch.
    // register() now returns immediately after the DB write (it no longer
    // blocks on the AI pipeline), so this reflects the true PENDING state;
    // the SSE listener above reconciles it to PROCESSING/READY/SCHEDULED/
    // FAILED as the AMAI Engine actually works through it.
    setAssets((prev) => (prev.some((a) => a.id === asset.id) ? prev : [asset, ...prev]));
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
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Media Library</h1>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Upload photos and videos — the AMAI Engine takes it from here.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-[var(--radius-lg)] border text-xs font-semibold flex items-center space-x-2" style={{ backgroundColor: 'var(--accent-error-subtle)', borderColor: 'var(--accent-error)', color: 'var(--accent-error)' }}>
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Media Source — Upload Directly / Google Drive */}
      <Suspense fallback={null}>
        <MediaSourceSection />
      </Suspense>

      {/* Upload Dropzone Component */}
      <div data-tour="tour-upload-dropzone" className="exec-card p-5 sm:p-6">
        <h2 className="text-h3 mb-4" style={{ color: 'var(--text-primary)' }}>Upload New Media</h2>
        <UploadDropzone onUploaded={handleUploaded} />
      </div>

      {/* Media Gallery */}
      <div className="exec-card p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>Uploaded Assets</h2>
          <span className="text-caption" style={{ color: 'var(--text-muted)' }}>{assets.length} assets</span>
        </div>

        {loading ? (
          <SkeletonCardGrid count={10} />
        ) : assets.length === 0 ? (
          <EmptyState
            icon={<Upload className="h-6 w-6" />}
            title="No media yet"
            description="Drag and drop files above to see them appear here instantly."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {assets.map((asset) => {
              const statusInfo = STATUS_LABEL[asset.status] || STATUS_LABEL.PENDING;
              return (
                <div
                  key={asset.id}
                  className="group relative aspect-square rounded-[var(--radius-lg)] border overflow-hidden transition-all duration-200"
                  style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)' }}
                >
                  {asset.blobUrl ? (
                    asset.mimeType?.startsWith('video') ? (
                      <div className="relative w-full h-full bg-zinc-900">
                        {/* preload="metadata" pulls just enough of the file to
                            render the first frame as a real thumbnail, without
                            downloading the whole video. */}
                        <video
                          src={asset.blobUrl}
                          preload="metadata"
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 left-1 right-1 flex items-center space-x-1 bg-black/60 rounded px-1.5 py-0.5">
                          <Film className="h-3 w-3 text-amber-400 shrink-0" />
                          <span className="text-[9px] font-mono truncate text-white">{asset.filename}</span>
                        </div>
                      </div>
                    ) : (
                      <Image
                        src={asset.blobUrl}
                        alt={asset.filename || "Uploaded media"}
                        fill
                        loading="lazy"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        className="object-cover"
                      />
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
                      <p className="text-[9px] text-red-300 truncate">{asset.lastErrorMessage}</p>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-2 rounded-xl bg-red-500 text-white shadow-lg hover:scale-105 transition touch-target"
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
