"use client";
import React, { useState, useEffect } from 'react';

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

  // Fetch connected accounts & Google Drive status
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

    // Parse URL query callback messages
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

  // Connect — checks if configured first
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

  // Disconnect Account
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

  // Disconnect Google Drive
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

  // Open Folder Selector Modal
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

  // Save Selected Folder
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
      setMessage({ text: 'Failed to update folder.', type: 'error' });
    } finally {
      setUpdatingFolder(false);
    }
  };

  // Save Renamed Account Handle
  const handleSaveRename = async () => {
    if (!renameAccountId || !newHandle.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/oauth/accounts/${renameAccountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: newHandle.trim() }),
      });
      if (res.ok) {
        setMessage({ text: 'Account handle updated.', type: 'success' });
        setRenameAccountId(null);
        setNewHandle('');
        fetchAccounts();
      }
    } catch {
      setMessage({ text: 'Failed to rename account.', type: 'error' });
    }
  };

  // Refresh Token
  const handleRefresh = async (platform: 'instagram' | 'tiktok', accountId: string) => {
    try {
      const res = await fetch(`${API_BASE}/oauth/${platform}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (res.ok) {
        setMessage({ text: `${platform === 'instagram' ? 'Instagram' : 'TikTok'} token refreshed!`, type: 'success' });
        fetchAccounts();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ text: err.message || 'Token refresh failed.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Token refresh failed.', type: 'error' });
    }
  };

  const instagramAccounts = accounts.filter(a => a.platform === 'INSTAGRAM');
  const tiktokAccounts = accounts.filter(a => a.platform === 'TIKTOK');

  const setupInstructions = {
    google: {
      title: 'Connect Google Drive',
      color: 'blue',
      steps: [
        'Go to console.cloud.google.com',
        'Create a project → APIs & Services → Enable Google Drive API',
        'OAuth Consent Screen → Add scopes (drive.readonly, userinfo.email)',
        'Credentials → Create OAuth 2.0 Client ID (Web App)',
        'Add Redirect URI: https://marketing-os-backend-api.vercel.app/api/oauth/google/callback',
        'Copy Client ID & Client Secret',
        'In Vercel dashboard → Settings → Environment Variables:',
        'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
        'Redeploy the API → Come back and click Connect again',
      ],
      link: 'https://console.cloud.google.com',
    },
    instagram: {
      title: 'Connect Instagram',
      color: 'rose',
      steps: [
        'Go to developers.facebook.com → My Apps → Create App',
        'Select Business app type',
        'Add products: Instagram Graph API + Facebook Login for Business',
        'Facebook Login Settings → Valid OAuth Redirect URIs:',
        'https://marketing-os-backend-api.vercel.app/api/oauth/instagram/callback',
        'App Settings → Basic → Copy App ID and App Secret',
        'In Vercel dashboard → Settings → Environment Variables:',
        'Add META_APP_ID and META_APP_SECRET',
        'Redeploy the API → Come back and click Connect again',
      ],
      link: 'https://developers.facebook.com',
    },
    tiktok: {
      title: 'Connect TikTok',
      color: 'zinc',
      steps: [
        'Go to developers.tiktok.com → My Apps → Create App',
        'Add Redirect URI: https://marketing-os-backend-api.vercel.app/api/oauth/tiktok/callback',
        'Scopes: user.info.basic, video.upload, video.publish',
        'Copy Client Key and Client Secret',
        'In Vercel dashboard → Settings → Environment Variables:',
        'Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET',
        'Redeploy the API → Come back and click Connect again',
      ],
      link: 'https://developers.tiktok.com',
    },
  };

  const currentSetup = setupModal ? setupInstructions[setupModal] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Connected Accounts</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your Google Drive, Instagram, and TikTok OAuth connections for automated AI publishing.
        </p>
      </div>

      {/* Global Toast Notification */}
      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between shadow-sm transition ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold hover:underline ml-4 flex-shrink-0">Dismiss</button>
        </div>
      )}

      {/* Primary Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Google Drive */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.01 2.375L4.24 15.826h15.54L12.01 2.375zM4.62 17.065L.85 23.615h15.34l-3.77-6.55H4.62zm16.14.28L16.5 10.325l-3.77 6.55 3.77 6.55 4.26-6.08z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Google Drive</h3>
                  <p className="text-xs text-zinc-500">Auto-Pilot Media Sync</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                googleDrive?.status === 'CONNECTED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : !configStatus.googleConfigured
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {googleDrive?.status === 'CONNECTED' ? 'Connected' : !configStatus.googleConfigured ? 'Setup Required' : 'Not Connected'}
              </span>
            </div>

            {googleDrive?.status === 'CONNECTED' ? (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3.5 space-y-2 mb-6 border border-zinc-200/60 dark:border-zinc-700/60">
                {googleDrive.accountEmail && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Account:</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{googleDrive.accountEmail}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Synced Folder:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{googleDrive.folderName}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 mb-6">
                {!configStatus.googleConfigured
                  ? 'Requires Google Cloud OAuth setup. Click below for step-by-step instructions.'
                  : 'Connect your Google Drive to automatically sync photos & videos into your publishing queue.'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            {googleDrive?.status === 'CONNECTED' ? (
              <div className="flex space-x-2">
                <button 
                  onClick={openFolderModal}
                  className="flex-1 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-semibold rounded-lg transition border border-blue-200 dark:border-blue-800"
                >
                  Change Folder
                </button>
                <button 
                  onClick={handleDisconnectDrive}
                  className="py-2 px-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 text-xs font-semibold rounded-lg transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={() => handleConnect('google')}
                className={`w-full py-2.5 text-xs font-semibold rounded-lg transition shadow-sm flex items-center justify-center space-x-2 ${
                  !configStatus.googleConfigured
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <span>{!configStatus.googleConfigured ? '⚙️' : '⚡'}</span>
                <span>{!configStatus.googleConfigured ? 'View Setup Instructions' : 'Connect Google Drive'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Instagram */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  IG
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Instagram</h3>
                  <p className="text-xs text-zinc-500">Business & Creator OAuth</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                instagramAccounts.length > 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : !configStatus.instagramConfigured
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {instagramAccounts.length > 0 
                  ? `${instagramAccounts.length} Connected` 
                  : !configStatus.instagramConfigured ? 'Setup Required' : 'Not Connected'}
              </span>
            </div>

            {instagramAccounts.length > 0 ? (
              <div className="space-y-2 mb-6">
                {instagramAccounts.slice(0, 2).map(acc => (
                  <div key={acc.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 flex items-center justify-between text-xs border border-zinc-200/60 dark:border-zinc-700/60">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{acc.handle}</p>
                      <p className="text-[10px] text-zinc-500">{acc.accountType} Account</p>
                    </div>
                    <button 
                      onClick={() => handleRefresh('instagram', acc.id)}
                      className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline"
                    >
                      Refresh
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 mb-6">
                {!configStatus.instagramConfigured
                  ? 'Requires Meta Developer App setup. Click below for step-by-step instructions.'
                  : 'Connect your Instagram Business or Creator account to publish reels, posts, and auto-reply to comments.'}
              </p>
            )}
          </div>

          <button 
            onClick={() => handleConnect('instagram')}
            className={`w-full py-2.5 text-xs font-semibold rounded-lg hover:opacity-95 transition shadow-sm flex items-center justify-center space-x-2 ${
              !configStatus.instagramConfigured
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-gradient-to-r from-rose-500 to-purple-600 text-white'
            }`}
          >
            <span>{!configStatus.instagramConfigured ? '⚙️' : '⚡'}</span>
            <span>
              {!configStatus.instagramConfigured 
                ? 'View Setup Instructions'
                : instagramAccounts.length > 0 ? '+ Add Another Instagram' : 'Connect Instagram Account'}
            </span>
          </button>
        </div>

        {/* Card 3: TikTok */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-lg shadow-sm">
                  TK
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">TikTok</h3>
                  <p className="text-xs text-zinc-500">Creator & Business OAuth</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                tiktokAccounts.length > 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : !configStatus.tiktokConfigured
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {tiktokAccounts.length > 0 
                  ? `${tiktokAccounts.length} Connected`
                  : !configStatus.tiktokConfigured ? 'Setup Required' : 'Not Connected'}
              </span>
            </div>

            {tiktokAccounts.length > 0 ? (
              <div className="space-y-2 mb-6">
                {tiktokAccounts.slice(0, 2).map(acc => (
                  <div key={acc.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 flex items-center justify-between text-xs border border-zinc-200/60 dark:border-zinc-700/60">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{acc.handle}</p>
                      <p className="text-[10px] text-zinc-500">Creator Account</p>
                    </div>
                    <button 
                      onClick={() => handleRefresh('tiktok', acc.id)}
                      className="text-[11px] text-zinc-900 dark:text-zinc-100 font-semibold hover:underline"
                    >
                      Refresh
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 mb-6">
                {!configStatus.tiktokConfigured
                  ? 'Requires TikTok Developer App setup. Click below for step-by-step instructions.'
                  : 'Connect your TikTok Creator account to schedule video uploads and monitor engagement.'}
              </p>
            )}
          </div>

          <button 
            onClick={() => handleConnect('tiktok')}
            className={`w-full py-2.5 text-xs font-semibold rounded-lg transition shadow-sm flex items-center justify-center space-x-2 ${
              !configStatus.tiktokConfigured
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
            }`}
          >
            <span>{!configStatus.tiktokConfigured ? '⚙️' : '⚡'}</span>
            <span>
              {!configStatus.tiktokConfigured 
                ? 'View Setup Instructions'
                : tiktokAccounts.length > 0 ? '+ Add Another TikTok' : 'Connect TikTok Account'}
            </span>
          </button>
        </div>

      </div>

      {/* Multi-Account Manager Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Multi-Account Management</h2>
            <p className="text-xs text-zinc-500">Manage all social profiles linked to your brand workspace.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500 py-6 text-center">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            <p className="text-sm text-zinc-500">No active social accounts connected yet.</p>
            <p className="text-xs text-zinc-400 mt-1">Complete the developer app setup above, then click Connect.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {accounts.map(acc => (
              <div key={acc.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                    acc.platform === 'INSTAGRAM'
                      ? 'bg-gradient-to-tr from-amber-400 to-purple-600 text-white'
                      : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  }`}>
                    {acc.platform.substring(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{acc.handle}</p>
                      <button 
                        onClick={() => {
                          setRenameAccountId(acc.id);
                          setNewHandle(acc.handle);
                        }}
                        className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        title="Rename"
                      >
                        ✏️
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500">{acc.platform} • ID: {acc.platformAccountId}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Active
                  </span>
                  <button 
                    onClick={() => handleDisconnectAccount(acc.id)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal 1: Google Drive Folder Picker ── */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold">GD</div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Select Google Drive Folder</h3>
                <p className="text-xs text-zinc-500">Choose which folder to sync with Auto-Pilot</p>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableFolders.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">Loading folders...</p>
              ) : (
                availableFolders.map(folder => (
                  <label 
                    key={folder.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      selectedFolderId === folder.id
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 text-xs">
                      <input 
                        type="radio" 
                        name="folder_select"
                        checked={selectedFolderId === folder.id}
                        onChange={() => setSelectedFolderId(folder.id)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>{folder.name}</span>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button 
                onClick={() => setIsFolderModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveFolder}
                disabled={updatingFolder || !selectedFolderId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shadow-sm disabled:opacity-50"
              >
                {updatingFolder ? 'Saving...' : 'Save Folder Selection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Rename Account Handle ── */}
      {renameAccountId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Rename Account Label</h3>
            <p className="text-xs text-zinc-500">Customize the handle displayed in your workspace.</p>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Handle / Name</label>
              <input 
                type="text"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-transparent text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button onClick={() => setRenameAccountId(null)} className="px-4 py-2 text-xs font-medium text-zinc-500">Cancel</button>
              <button onClick={handleSaveRename} className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 3: Setup Instructions ── */}
      {setupModal && currentSetup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">⚙️ {currentSetup.title} — Setup Required</h3>
                <p className="text-xs text-zinc-500 mt-1">Follow these steps to enable OAuth for this platform.</p>
              </div>
              <button onClick={() => setSetupModal(null)} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">×</button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">⚠️ Developer App Not Configured</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                OAuth connections require a real developer app credential. This is a one-time setup that takes ~10 minutes.
              </p>
            </div>

            <ol className="space-y-2">
              {currentSetup.steps.map((step, i) => (
                <li key={i} className="flex items-start space-x-3 text-xs text-zinc-700 dark:text-zinc-300">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 text-[10px]">
                    {i + 1}
                  </span>
                  <span className={step.startsWith('Add ') || step.startsWith('https://') ? 'font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400' : ''}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button 
                onClick={() => setSetupModal(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900"
              >
                Close
              </button>
              <a 
                href={currentSetup.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:opacity-90 transition"
              >
                Open Developer Portal →
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
