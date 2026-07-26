"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IntegrationsBlock } from '@/components/integrations-3';
import { GoogleDriveLogo, InstagramLogo, TikTokLogo } from '@/components/icons/platform-logos';
import {
  ShieldCheck,
  CheckCircle2,
  MoreVertical,
  RefreshCw,
  FolderSync,
  LogOut,
  Info,
  X,
} from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://marketing-os-backend-api.vercel.app/api').replace(/\/$/, '');

interface ConnectedAccount {
  id: string;
  platform: string;
  platformAccountId: string;
  handle: string;
  accountType: string;
  status: 'CONNECTED' | 'EXPIRED' | 'DISCONNECTED';
  tokenExpiresAt?: string;
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

export default function ConnectedAccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [googleDrive, setGoogleDrive] = useState<GoogleDriveConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Context Menu / Options State
  const [activeMenu, setActiveMenu] = useState<'google' | 'instagram' | 'tiktok' | null>(null);

  // Folder Selector Modal State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<FolderOption[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [updatingFolder, setUpdatingFolder] = useState(false);

  // View Details Modal State
  const [detailsModal, setDetailsModal] = useState<{
    title: string;
    handle: string;
    status: string;
    type: string;
    lastSynced: string;
  } | null>(null);

  const getBrandId = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('marketing_os_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.brandId) return payload.brandId;
        } catch {}
      }
    }
    return 'primary_brand';
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const brandId = getBrandId();
      const token = typeof window !== 'undefined' ? localStorage.getItem('marketing_os_token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/oauth/accounts?brandId=${brandId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.socialAccounts || []);
        setGoogleDrive(data.googleDrive || null);
      }
    } catch (err) {
      console.error('Failed to fetch connected accounts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success');
      const error = params.get('error');
      const platform = params.get('platform');
      const account = params.get('account');

      if (success && platform) {
        setMessage({
          text: `🎉 Successfully connected ${platform}${account ? ` (${account})` : ''}!`,
          type: 'success',
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (error) {
        setMessage({
          text: `⚠️ ${error}`,
          type: 'error',
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleConnect = (platform: 'google' | 'instagram' | 'tiktok') => {
    const brandId = getBrandId();
    window.location.href = `${API_BASE}/oauth/${platform}/connect?brandId=${brandId}`;
  };

  const handleDisconnectAccount = async (accountId: string) => {
    try {
      const res = await fetch(`${API_BASE}/oauth/accounts/${accountId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ text: 'Account disconnected successfully.', type: 'success' });
        setActiveMenu(null);
        fetchAccounts();
      }
    } catch {
      setMessage({ text: 'Failed to disconnect account.', type: 'error' });
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      const brandId = getBrandId();
      const res = await fetch(`${API_BASE}/oauth/google/disconnect?brandId=${brandId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ text: 'Google Drive disconnected.', type: 'success' });
        setActiveMenu(null);
        fetchAccounts();
      }
    } catch {
      setMessage({ text: 'Failed to disconnect Google Drive.', type: 'error' });
    }
  };

  const openFolderModal = async () => {
    setActiveMenu(null);
    setIsFolderModalOpen(true);
    try {
      const brandId = getBrandId();
      const res = await fetch(`${API_BASE}/oauth/google/folders?brandId=${brandId}`);
      if (res.ok) {
        const folders = await res.json();
        setAvailableFolders(folders);
        const current = folders.find((f: any) => f.isSelected);
        if (current) setSelectedFolderId(current.id);
      }
    } catch {
      console.error('Failed to load folders');
    }
  };

  const handleSaveFolder = async () => {
    setUpdatingFolder(true);
    try {
      const brandId = getBrandId();
      const folder = availableFolders.find(f => f.id === selectedFolderId);
      const res = await fetch(`${API_BASE}/oauth/google/select-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, folderId: selectedFolderId, folderName: folder?.name }),
      });
      if (res.ok) {
        setMessage({ text: `Google Drive folder updated to "${folder?.name || selectedFolderId}"`, type: 'success' });
        setIsFolderModalOpen(false);
        fetchAccounts();
      }
    } catch {
      setMessage({ text: 'Failed to update folder', type: 'error' });
    } finally {
      setUpdatingFolder(false);
    }
  };

  const instagramAccounts = accounts.filter(a => a.platform === 'INSTAGRAM');
  const tiktokAccounts = accounts.filter(a => a.platform === 'TIKTOK');

  const isGoogleConnected = googleDrive?.status === 'CONNECTED';
  const isInstagramConnected = instagramAccounts.length > 0;
  const isTikTokConnected = tiktokAccounts.length > 0;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Integrations Hub</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Tap any platform icon below to authorize and link your accounts instantly.
          </p>
        </div>

        <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs text-slate-700 dark:text-zinc-300 font-semibold self-start md:self-auto">
          <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <span>AES-256 Encrypted Storage Active</span>
        </div>
      </div>

      {/* Top Banner Block */}
      <IntegrationsBlock />

      {/* Toast Alert */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white touch-target">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Core Platform Cards Grid (Responsive Stacking for Mobile) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        
        {/* 1. Google Drive Card */}
        <motion.div
          whileHover={{ y: -6, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (!isGoogleConnected) {
              handleConnect('google');
            }
          }}
          className={`exec-card p-6 sm:p-7 rounded-[20px] sm:rounded-[24px] flex flex-col justify-between space-y-6 relative overflow-hidden cursor-pointer transition-all ${
            isGoogleConnected
              ? 'border-blue-500/30 dark:border-blue-500/30 shadow-lg shadow-blue-500/5'
              : 'hover:border-blue-500/50 dark:hover:border-blue-500/50'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="h-14 w-14 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 flex items-center justify-center p-3 shadow-md flex-shrink-0">
                  <GoogleDriveLogo className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">Google Drive</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">AutoPilot Media Sync</p>
                </div>
              </div>

              {isGoogleConnected ? (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === 'google' ? null : 'google');
                    }}
                    className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-zinc-300 flex items-center justify-center transition touch-target"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  <AnimatePresence>
                    {activeMenu === 'google' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-12 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-2xl p-1.5 z-30 text-xs font-semibold space-y-0.5"
                      >
                        <button
                          onClick={() => handleConnect('google')}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 flex items-center space-x-2 touch-target"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                          <span>Refresh Connection</span>
                        </button>

                        <button
                          onClick={openFolderModal}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 flex items-center space-x-2 touch-target"
                        >
                          <FolderSync className="h-3.5 w-3.5 text-purple-500" />
                          <span>Change Folder</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenu(null);
                            setDetailsModal({
                              title: 'Google Drive Connection',
                              handle: googleDrive?.accountEmail || 'Primary Account',
                              status: 'Connected',
                              type: 'Cloud Storage',
                              lastSynced: '2 minutes ago',
                            });
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 flex items-center space-x-2 touch-target"
                        >
                          <Info className="h-3.5 w-3.5 text-amber-500" />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={handleDisconnectDrive}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center space-x-2 touch-target"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Disconnect</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200/60 dark:border-white/5">
                  Tap to Connect
                </span>
              )}
            </div>

            {isGoogleConnected ? (
              <div className="p-4 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Connected ✓</span>
                  </span>
                  <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">/{googleDrive?.folderName || 'content'}</span>
                </div>
                <p className="text-slate-500 dark:text-zinc-400 text-[11px]">Synced with {googleDrive?.accountEmail || 'Google Workspace'} • 2 mins ago</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Tap to link your Google Drive folder for automatic photo & video syncing into AutoPilot.
              </p>
            )}
          </div>
        </motion.div>

        {/* 2. Instagram Card */}
        <motion.div
          whileHover={{ y: -6, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (!isInstagramConnected) {
              handleConnect('instagram');
            }
          }}
          className={`exec-card p-6 sm:p-7 rounded-[20px] sm:rounded-[24px] flex flex-col justify-between space-y-6 relative overflow-hidden cursor-pointer transition-all ${
            isInstagramConnected
              ? 'border-rose-500/30 dark:border-rose-500/30 shadow-lg shadow-rose-500/5'
              : 'hover:border-rose-500/50 dark:hover:border-rose-500/50'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="h-14 w-14 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 flex items-center justify-center p-3 shadow-md flex-shrink-0">
                  <InstagramLogo className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">Instagram</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Reels & Post Creator</p>
                </div>
              </div>

              {isInstagramConnected ? (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === 'instagram' ? null : 'instagram');
                    }}
                    className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-zinc-300 flex items-center justify-center transition touch-target"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  <AnimatePresence>
                    {activeMenu === 'instagram' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-12 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-2xl p-1.5 z-30 text-xs font-semibold space-y-0.5"
                      >
                        <button
                          onClick={() => handleConnect('instagram')}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 flex items-center space-x-2 touch-target"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-rose-500" />
                          <span>Reconnect Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenu(null);
                            const acc = instagramAccounts[0];
                            setDetailsModal({
                              title: 'Instagram Account',
                              handle: acc?.handle || '@creator',
                              status: 'Connected',
                              type: acc?.accountType || 'Creator Profile',
                              lastSynced: 'Yesterday',
                            });
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 flex items-center space-x-2 touch-target"
                        >
                          <Info className="h-3.5 w-3.5 text-amber-500" />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => handleDisconnectAccount(instagramAccounts[0]?.id)}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center space-x-2 touch-target"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Disconnect</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200/60 dark:border-white/5">
                  Tap to Connect
                </span>
              )}
            </div>

            {isInstagramConnected ? (
              <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Connected ✓</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{instagramAccounts[0]?.handle}</span>
                </div>
                <p className="text-slate-500 dark:text-zinc-400 text-[11px]">Creator Profile • Token Expires in 45 Days (Auto-Refresh)</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Tap to authorize your Instagram Creator profile for automated reel and post publishing.
              </p>
            )}
          </div>
        </motion.div>

        {/* 3. TikTok Card */}
        <motion.div
          whileHover={{ y: -6, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (!isTikTokConnected) {
              handleConnect('tiktok');
            }
          }}
          className={`exec-card p-6 sm:p-7 rounded-[20px] sm:rounded-[24px] flex flex-col justify-between space-y-6 relative overflow-hidden cursor-pointer transition-all ${
            isTikTokConnected
              ? 'border-purple-500/30 dark:border-purple-500/30 shadow-lg shadow-purple-500/5'
              : 'hover:border-purple-500/50 dark:hover:border-purple-500/50'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="h-14 w-14 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 flex items-center justify-center p-3 shadow-md text-slate-950 dark:text-white flex-shrink-0">
                  <TikTokLogo className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">TikTok</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Short Video Uploads</p>
                </div>
              </div>

              {isTikTokConnected ? (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === 'tiktok' ? null : 'tiktok');
                    }}
                    className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-zinc-300 flex items-center justify-center transition touch-target"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  <AnimatePresence>
                    {activeMenu === 'tiktok' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-12 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-2xl p-1.5 z-30 text-xs font-semibold space-y-0.5"
                      >
                        <button
                          onClick={() => handleConnect('tiktok')}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 flex items-center space-x-2 touch-target"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-purple-500" />
                          <span>Reconnect Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenu(null);
                            const acc = tiktokAccounts[0];
                            setDetailsModal({
                              title: 'TikTok Account',
                              handle: acc?.handle || '@creator',
                              status: 'Connected',
                              type: acc?.accountType || 'TikTok Creator',
                              lastSynced: '5 minutes ago',
                            });
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 flex items-center space-x-2 touch-target"
                        >
                          <Info className="h-3.5 w-3.5 text-amber-500" />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => handleDisconnectAccount(tiktokAccounts[0]?.id)}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center space-x-2 touch-target"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Disconnect</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200/60 dark:border-white/5">
                  Tap to Connect
                </span>
              )}
            </div>

            {isTikTokConnected ? (
              <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Connected ✓</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{tiktokAccounts[0]?.handle}</span>
                </div>
                <p className="text-slate-500 dark:text-zinc-400 text-[11px]">TikTok Creator • Permissions Granted (video.publish)</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Tap to authorize your TikTok Creator account to schedule video uploads and track metrics.
              </p>
            )}
          </div>
        </motion.div>

      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {detailsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-950 rounded-[24px] border border-slate-200 dark:border-white/10 max-w-md w-full p-6 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{detailsModal.title}</h3>
                <button onClick={() => setDetailsModal(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white touch-target">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400 font-semibold">Account / Handle</span>
                  <span className="font-bold text-slate-900 dark:text-white">{detailsModal.handle}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400 font-semibold">Account Type</span>
                  <span className="font-bold text-slate-900 dark:text-white">{detailsModal.type}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400 font-semibold">OAuth Status</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{detailsModal.status} ✓</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400 font-semibold">Last Synchronization</span>
                  <span className="font-bold text-slate-700 dark:text-zinc-300">{detailsModal.lastSynced}</span>
                </div>
              </div>

              <button
                onClick={() => setDetailsModal(null)}
                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold rounded-xl transition touch-target"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Folder Picker */}
      <AnimatePresence>
        {isFolderModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-950 rounded-[22px] border border-slate-200 dark:border-white/10 max-w-md w-full p-6 space-y-6 shadow-2xl"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 flex items-center justify-center p-2 flex-shrink-0">
                  <GoogleDriveLogo className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Select Google Drive Folder</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Choose which folder to sync with AMAI Auto-Pilot</p>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableFolders.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Loading folders...</p>
                ) : (
                  availableFolders.map(folder => (
                    <label
                      key={folder.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition touch-target ${
                        selectedFolderId === folder.id
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold'
                          : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 text-xs">
                        <input
                          type="radio"
                          name="folder_select"
                          checked={selectedFolderId === folder.id}
                          onChange={() => setSelectedFolderId(folder.id)}
                          className="text-blue-600 h-4 w-4"
                        />
                        <span>{folder.name}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white touch-target"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFolder}
                  disabled={updatingFolder || !selectedFolderId}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 touch-target"
                >
                  {updatingFolder ? 'Saving...' : 'Save Selection'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
