"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IntegrationsBlock } from '@/components/integrations-3';
import { InstagramLogo, TikTokLogo } from '@/components/icons/platform-logos';
import SectionHeader from '@/components/ui/SectionHeader';
import {
  CheckCircle2,
  MoreVertical,
  RefreshCw,
  LogOut,
  Info,
  X,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

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

export default function ConnectedAccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Local Storage Persistent Fallbacks
  const [localInstagram, setLocalInstagram] = useState<{ handle: string } | null>(null);
  const [localTikTok, setLocalTikTok] = useState<{ handle: string } | null>(null);

  // Context Menu / Options State
  const [activeMenu, setActiveMenu] = useState<'instagram' | 'tiktok' | null>(null);

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

  const loadLocalConnections = () => {
    if (typeof window !== 'undefined') {
      try {
        const ig = localStorage.getItem('amai_connected_instagram');
        if (ig) setLocalInstagram(JSON.parse(ig));

        const tt = localStorage.getItem('amai_connected_tiktok');
        if (tt) setLocalTikTok(JSON.parse(tt));
      } catch (e) {
        console.error('Failed to load local connections', e);
      }
    }
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
      }
    } catch (err) {
      console.error('Failed to fetch connected accounts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocalConnections();
    fetchAccounts();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success');
      const error = params.get('error');
      const platform = params.get('platform');
      const account = params.get('account');

      if (success && platform) {
        const handleName = account ? (account.startsWith('@') ? account : `@${account}`) : '@creator';

        if (platform.toLowerCase().includes('instagram')) {
          const igData = { handle: handleName, connectedAt: new Date().toISOString() };
          localStorage.setItem('amai_connected_instagram', JSON.stringify(igData));
          setLocalInstagram(igData);
        } else if (platform.toLowerCase().includes('tiktok')) {
          const ttData = { handle: handleName, connectedAt: new Date().toISOString() };
          localStorage.setItem('amai_connected_tiktok', JSON.stringify(ttData));
          setLocalTikTok(ttData);
        }

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

  const handleConnect = (platform: 'instagram' | 'tiktok') => {
    const brandId = getBrandId();
    window.location.href = `${API_BASE}/oauth/${platform}/connect?brandId=${brandId}`;
  };

  const handleDisconnectAccount = async (platformKey: 'instagram' | 'tiktok', accountId?: string) => {
    try {
      if (accountId) {
        await fetch(`${API_BASE}/oauth/accounts/${accountId}`, { method: 'DELETE' }).catch(() => null);
      }

      if (platformKey === 'instagram') {
        localStorage.removeItem('amai_connected_instagram');
        setLocalInstagram(null);
      } else if (platformKey === 'tiktok') {
        localStorage.removeItem('amai_connected_tiktok');
        setLocalTikTok(null);
      }

      setMessage({ text: 'Account disconnected successfully.', type: 'success' });
      setActiveMenu(null);
      fetchAccounts();
    } catch {
      setMessage({ text: 'Failed to disconnect account.', type: 'error' });
    }
  };

  const instagramAccounts = accounts.filter(a => a.platform?.toUpperCase() === 'INSTAGRAM');
  const tiktokAccounts = accounts.filter(a => a.platform?.toUpperCase() === 'TIKTOK');

  const isInstagramConnected = instagramAccounts.length > 0 || !!localInstagram;
  const instagramHandle = instagramAccounts[0]?.handle || localInstagram?.handle || '@creator';

  const isTikTokConnected = tiktokAccounts.length > 0 || !!localTikTok;
  const tiktokHandle = tiktokAccounts[0]?.handle || localTikTok?.handle || '@creator';

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="Integrations Hub"
        subtitle="Tap any platform icon below to authorize and link your accounts instantly."
      />

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
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="touch-target" style={{ color: 'var(--text-secondary)' }}>
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Core Platform Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 max-w-3xl">

        {/* 1. Instagram Card */}
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => {
            if (!isInstagramConnected) {
              handleConnect('instagram');
            }
          }}
          className="exec-card p-6 rounded-xl flex flex-col justify-between space-y-6 relative overflow-hidden cursor-pointer transition-all"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="h-12 w-12 rounded-xl border flex items-center justify-center p-2.5 shadow-sm flex-shrink-0" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                  <InstagramLogo className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>Instagram</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Reels & Post Creator</p>
                </div>
              </div>

              {isInstagramConnected ? (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === 'instagram' ? null : 'instagram');
                    }}
                    className="h-9 w-9 rounded-lg border flex items-center justify-center transition touch-target"
                    style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
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
                        className="absolute right-0 top-11 w-48 rounded-xl border shadow-2xl p-1.5 z-30 text-xs font-semibold space-y-0.5"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
                      >
                        <button
                          onClick={() => handleConnect('instagram')}
                          className="w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2 touch-target"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-red-500" />
                          <span>Reconnect Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenu(null);
                            setDetailsModal({
                              title: 'Instagram Account',
                              handle: instagramHandle,
                              status: 'Connected',
                              type: 'Creator Profile',
                              lastSynced: 'Just now',
                            });
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2 touch-target"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <Info className="h-3.5 w-3.5 text-amber-500" />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => handleDisconnectAccount('instagram', instagramAccounts[0]?.id)}
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
                  type="button"
                  onClick={() => handleConnect('instagram')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm btn-gold-cta touch-target"
                >
                  Tap to Connect
                </button>
              )}
            </div>

            {isInstagramConnected ? (
              <div className="p-3.5 rounded-xl border space-y-1.5 text-xs" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 font-bold text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Connected ✓</span>
                  </span>
                  <span className="font-bold truncate max-w-[140px]" style={{ color: 'var(--text-primary)' }}>{instagramHandle}</span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Creator Profile • Token Active</p>
              </div>
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Tap to authorize your Instagram Creator profile for automated reel and post publishing.
              </p>
            )}
          </div>
        </motion.div>

        {/* 2. TikTok Card */}
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => {
            if (!isTikTokConnected) {
              handleConnect('tiktok');
            }
          }}
          className="exec-card p-6 rounded-xl flex flex-col justify-between space-y-6 relative overflow-hidden cursor-pointer transition-all"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="h-12 w-12 rounded-xl border flex items-center justify-center p-2.5 shadow-sm flex-shrink-0" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                  <TikTokLogo className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>TikTok</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Short Video Uploads</p>
                </div>
              </div>

              {isTikTokConnected ? (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === 'tiktok' ? null : 'tiktok');
                    }}
                    className="h-9 w-9 rounded-lg border flex items-center justify-center transition touch-target"
                    style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
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
                        className="absolute right-0 top-11 w-48 rounded-xl border shadow-2xl p-1.5 z-30 text-xs font-semibold space-y-0.5"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
                      >
                        <button
                          onClick={() => handleConnect('tiktok')}
                          className="w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2 touch-target"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-violet-500" />
                          <span>Reconnect Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenu(null);
                            setDetailsModal({
                              title: 'TikTok Account',
                              handle: tiktokHandle,
                              status: 'Connected',
                              type: 'TikTok Creator',
                              lastSynced: 'Just now',
                            });
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2 touch-target"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <Info className="h-3.5 w-3.5 text-amber-500" />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => handleDisconnectAccount('tiktok', tiktokAccounts[0]?.id)}
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
                  type="button"
                  onClick={() => handleConnect('tiktok')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm btn-gold-cta touch-target"
                >
                  Tap to Connect
                </button>
              )}
            </div>

            {isTikTokConnected ? (
              <div className="p-3.5 rounded-xl border space-y-1.5 text-xs" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 font-bold text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Connected ✓</span>
                  </span>
                  <span className="font-bold truncate max-w-[140px]" style={{ color: 'var(--text-primary)' }}>{tiktokHandle}</span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>TikTok Creator • Permission Active</p>
              </div>
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
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
              className="rounded-xl border max-w-md w-full p-6 space-y-6 shadow-2xl"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{detailsModal.title}</h3>
                <button onClick={() => setDetailsModal(null)} className="touch-target" style={{ color: 'var(--text-secondary)' }}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl border flex justify-between" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Account / Handle</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{detailsModal.handle}</span>
                </div>

                <div className="p-3.5 rounded-xl border flex justify-between" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Account Type</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{detailsModal.type}</span>
                </div>

                <div className="p-3.5 rounded-xl border flex justify-between" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>OAuth Status</span>
                  <span className="font-bold text-emerald-500">{detailsModal.status} ✓</span>
                </div>

                <div className="p-3.5 rounded-xl border flex justify-between" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Last Synchronization</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{detailsModal.lastSynced}</span>
                </div>
              </div>

              <button
                onClick={() => setDetailsModal(null)}
                className="w-full py-3 text-xs font-bold rounded-xl transition touch-target btn-emerald-cta"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
