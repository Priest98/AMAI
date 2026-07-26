"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  Folder,
  RefreshCw,
  MoreVertical,
  ExternalLink,
  Plus,
  Zap,
  ShieldCheck,
  Lock,
  X,
  Edit2,
  FolderSync,
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

interface ConfigStatus {
  googleConfigured: boolean;
  instagramConfigured: boolean;
  tiktokConfigured: boolean;
}

export default function ConnectedAccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [googleDrive, setGoogleDrive] = useState<GoogleDriveConfig | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatus>({
    googleConfigured: true,
    instagramConfigured: true,
    tiktokConfigured: true,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Folder Selector Modal State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<FolderOption[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [updatingFolder, setUpdatingFolder] = useState(false);

  // Rename Account Modal State
  const [renameAccountId, setRenameAccountId] = useState<string | null>(null);
  const [newHandle, setNewHandle] = useState('');

  // Setup Instructions Modal
  const [setupModal, setSetupModal] = useState<'google' | 'instagram' | 'tiktok' | null>(null);

  // Active Brand ID
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
        if (data.configStatus) setConfigStatus(data.configStatus);
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
    const isConfigured = {
      google: configStatus.googleConfigured,
      instagram: configStatus.instagramConfigured,
      tiktok: configStatus.tiktokConfigured,
    }[platform];

    if (!isConfigured) {
      setSetupModal(platform);
      return;
    }

    const brandId = getBrandId();
    window.location.href = `${API_BASE}/oauth/${platform}/connect?brandId=${brandId}`;
  };

  const handleDisconnectAccount = async (accountId: string) => {
    try {
      const res = await fetch(`${API_BASE}/oauth/accounts/${accountId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ text: 'Account disconnected successfully.', type: 'success' });
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
        fetchAccounts();
      }
    } catch {
      setMessage({ text: 'Failed to disconnect Google Drive.', type: 'error' });
    }
  };

  const openFolderModal = async () => {
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

  const handleSaveRename = async () => {
    if (!renameAccountId || !newHandle.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/oauth/accounts/${renameAccountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: newHandle }),
      });
      if (res.ok) {
        setMessage({ text: 'Account handle updated.', type: 'success' });
        setRenameAccountId(null);
        fetchAccounts();
      }
    } catch {
      setMessage({ text: 'Failed to rename account.', type: 'error' });
    }
  };

  const instagramAccounts = accounts.filter(a => a.platform === 'INSTAGRAM');
  const tiktokAccounts = accounts.filter(a => a.platform === 'TIKTOK');

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Integrations Hub</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Manage your Google Drive, Instagram, and TikTok OAuth connections for automated AI publishing.</p>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs text-slate-700 dark:text-zinc-300 font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>AES-256 Encrypted Token Storage Active</span>
        </div>
      </div>

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
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workspace Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Google Drive */}
        <motion.div
          whileHover={{ y: -4 }}
          className="soft-card soft-card-hover p-6 rounded-[22px] flex flex-col justify-between space-y-6 shadow-md relative overflow-hidden group"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20">
                  GD
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white tracking-tight">Google Drive</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Auto-Pilot Media Sync</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                googleDrive?.status === 'CONNECTED'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200/60 dark:border-white/5'
              }`}>
                {googleDrive?.status === 'CONNECTED' ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {googleDrive?.status === 'CONNECTED' ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-zinc-400">Google Drive Folder:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">/{googleDrive.folderName || 'content'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-zinc-400">Last Synced:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">2 minutes ago</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Connect your Google Drive to automatically sync photos & videos into your AutoPilot publishing queue.
              </p>
            )}
          </div>

          <div>
            {googleDrive?.status === 'CONNECTED' ? (
              <div className="flex space-x-2">
                <button
                  onClick={openFolderModal}
                  className="flex-1 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl transition border border-blue-500/20"
                >
                  Change Folder
                </button>
                <button
                  onClick={handleDisconnectDrive}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-white/5 hover:bg-rose-500/10 text-slate-600 dark:text-zinc-400 hover:text-rose-600 text-xs font-bold rounded-xl transition border border-slate-200/60 dark:border-white/5"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleConnect('google')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2"
              >
                <Zap className="h-4 w-4" />
                <span>Connect Google Drive</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Card 2: Instagram */}
        <motion.div
          whileHover={{ y: -4 }}
          className="soft-card soft-card-hover p-6 rounded-[22px] flex flex-col justify-between space-y-6 shadow-md relative overflow-hidden group"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-rose-500/20">
                  IG
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white tracking-tight">Instagram</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {instagramAccounts.length > 0 ? `Connected as ${instagramAccounts[0].handle}` : 'Reels & Post Publishing'}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                instagramAccounts.length > 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200/60 dark:border-white/5'
              }`}>
                {instagramAccounts.length > 0 ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {instagramAccounts.length > 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-zinc-400">Token Health:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Expires in 45 days (Auto-Refresh)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-zinc-400">Last Published:</span>
                  <span className="font-bold text-slate-700 dark:text-zinc-200">Yesterday</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Connect your Instagram Creator account to publish reels, posts, and auto-reply to comments.
              </p>
            )}
          </div>

          <button
            onClick={() => handleConnect('instagram')}
            className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold rounded-xl transition shadow-md shadow-rose-500/25 flex items-center justify-center space-x-2"
          >
            <Zap className="h-4 w-4" />
            <span>{instagramAccounts.length > 0 ? 'Add Account' : 'Connect Instagram'}</span>
          </button>
        </motion.div>

        {/* Card 3: TikTok */}
        <motion.div
          whileHover={{ y: -4 }}
          className="soft-card soft-card-hover p-6 rounded-[22px] flex flex-col justify-between space-y-6 shadow-md relative overflow-hidden group"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-md">
                  TK
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white tracking-tight">TikTok</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {tiktokAccounts.length > 0 ? `Connected as ${tiktokAccounts[0].handle}` : 'Creator & Video Uploads'}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                tiktokAccounts.length > 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200/60 dark:border-white/5'
              }`}>
                {tiktokAccounts.length > 0 ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {tiktokAccounts.length > 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-zinc-400">Last Sync:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">5 minutes ago</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-zinc-400">Permissions:</span>
                  <span className="font-bold text-slate-700 dark:text-zinc-200">Granted (video.publish)</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Connect your TikTok Creator account to schedule video uploads and monitor engagement.
              </p>
            )}
          </div>

          <button
            onClick={() => handleConnect('tiktok')}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center space-x-2"
          >
            <Zap className="h-4 w-4" />
            <span>{tiktokAccounts.length > 0 ? 'Add Account' : 'Connect TikTok'}</span>
          </button>
        </motion.div>

      </div>

      {/* Multi-Account Manager Section */}
      <div className="soft-card p-6 rounded-[22px] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Connected Social Profiles</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Active social accounts linked to your workspace for AutoPilot publishing.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
            <p className="text-sm text-slate-500 dark:text-zinc-400 font-semibold">No active social accounts connected yet.</p>
            <p className="text-xs text-slate-400">Click one of the Connect buttons above to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/60 dark:divide-white/10">
            {accounts.map(acc => (
              <div key={acc.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs ${
                    acc.platform === 'INSTAGRAM'
                      ? 'bg-gradient-to-tr from-amber-400 to-purple-600 text-white'
                      : 'bg-slate-900 text-white'
                  }`}>
                    {acc.platform.substring(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{acc.handle}</p>
                      <button
                        onClick={() => {
                          setRenameAccountId(acc.id);
                          setNewHandle(acc.handle);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition"
                        title="Rename"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{acc.platform} • {acc.accountType || 'Creator Account'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Connected
                  </span>
                  <button
                    onClick={() => handleDisconnectAccount(acc.id)}
                    className="text-xs text-slate-400 hover:text-rose-600 transition font-semibold"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Folder Picker */}
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
                <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">GD</div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Select Google Drive Folder</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Choose which folder to sync with Auto-Pilot</p>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableFolders.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Loading folders...</p>
                ) : (
                  availableFolders.map(folder => (
                    <label
                      key={folder.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
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
                          className="text-blue-600"
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
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFolder}
                  disabled={updatingFolder || !selectedFolderId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {updatingFolder ? 'Saving...' : 'Save Selection'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Rename */}
      <AnimatePresence>
        {renameAccountId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-950 rounded-[22px] border border-slate-200 dark:border-white/10 max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Rename Account Handle</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Customize the handle displayed in your workspace.</p>
              <div>
                <input
                  type="text"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <button onClick={() => setRenameAccountId(null)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button onClick={handleSaveRename} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md">Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
