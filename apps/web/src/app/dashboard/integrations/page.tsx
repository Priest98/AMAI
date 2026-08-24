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
  Users,
  UserPlus,
  Heart,
  Video,
  PlayCircle,
} from 'lucide-react';
import { API_BASE, apiFetch, getBrandId, isAuthenticated } from '@/lib/api';
import { INSTAGRAM_ENABLED } from '@/lib/featureFlags';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonListRows } from '@/components/ui/Skeleton';

interface TikTokStats {
  followerCount: number | null;
  followingCount: number | null;
  likesCount: number | null;
  videoCount: number | null;
  fetchedAt: string;
}

interface TikTokVideo {
  id: string;
  title: string;
  coverImageUrl: string | null;
  shareUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createTime: string | null;
}

interface ConnectedAccount {
  id: string;
  platform: string;
  platformAccountId: string;
  handle: string;
  accountType: string;
  status: 'CONNECTED' | 'EXPIRED' | 'DISCONNECTED';
  tokenExpiresAt?: string;
  createdAt: string;
  // Only populated for TikTok accounts (user.info.stats scope). Null until
  // a stats fetch has completed at least once (connect time or the details
  // modal's on-demand refresh).
  stats?: TikTokStats | null;
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
    // Set only when viewing a TikTok account, so the modal knows to fetch
    // and render the stats/recent-videos panels (user.info.stats + video.list).
    accountId?: string;
    stats?: TikTokStats | null;
  } | null>(null);

  // Recent-videos panel state, lazily fetched when the TikTok details modal
  // opens rather than on every page load -- this is a review/inspection
  // view, not something shown on the main integrations grid.
  const [tiktokVideos, setTiktokVideos] = useState<TikTokVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);

  const loadTikTokVideos = async (accountId: string) => {
    setVideosLoading(true);
    setVideosError(null);
    setTiktokVideos([]);
    try {
      const data = await apiFetch<{ videos?: TikTokVideo[] }>(`/oauth/tiktok/${accountId}/videos`);
      setTiktokVideos(data.videos || []);
    } catch (err) {
      setVideosError(err instanceof Error ? err.message : 'Failed to load recent videos.');
    } finally {
      setVideosLoading(false);
    }
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
      // Passes the ClientSwitcher's currently-active client explicitly --
      // without it the backend falls back to the JWT's fixed brandId
      // (organization.brands[0]), which is right for Free/Pro but would
      // silently always show client #1's accounts for an Agency user who's
      // switched to a different client. The backend re-verifies this
      // brandId against real membership (assertBrandAccess in
      // oauth.controller.ts) rather than trusting it outright.
      const data = await apiFetch<{ socialAccounts?: any[] }>(`/oauth/accounts?brandId=${encodeURIComponent(getBrandId())}`);
      setAccounts(data.socialAccounts || []);
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
          text: platform.toLowerCase().includes('tiktok')
            ? 'TikTok connected ✓ Oyinca is ready to start working.'
            : `Successfully connected ${platform}${account ? ` (${account})` : ''}!`,
          type: 'success',
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (error) {
        setMessage({
          text: platform?.toLowerCase().includes('tiktok')
            ? "I couldn't connect to TikTok. Check the authorization and try again."
            : `⚠️ ${error}`,
          type: 'error',
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleConnect = (platform: 'instagram' | 'tiktok') => {
    // Security audit fix (3.5): this is a full browser navigation, not a
    // fetch() -- previously couldn't carry an Authorization header, so the
    // token traveled as a `?token=` query param instead. With the session
    // now in an httpOnly cookie, the browser attaches it automatically to
    // this same-origin navigation. brandId alone is still not trusted by
    // the backend; it's just which brand to request -- the connect
    // endpoint re-verifies membership server-side regardless.
    const brandId = getBrandId();
    if (!isAuthenticated()) { window.location.href = '/login'; return; }
    window.location.href = `${API_BASE}/oauth/${platform}/connect?brandId=${encodeURIComponent(brandId)}`;
  };

  /**
   * Optimistic: the card flips to "not connected" the instant this is
   * clicked, not after the DELETE round-trip resolves. Snapshot both the
   * account list and the local-storage fallback state so a genuine failure
   * (network error, or the 401-swallowing bug this used to have -- see the
   * apiFetch note below) can restore exactly what was showing before,
   * instead of leaving the UI claiming "disconnected" for an account still
   * very much connected server-side.
   */
  const handleDisconnectAccount = async (platformKey: 'instagram' | 'tiktok', accountId?: string) => {
    setActiveMenu(null);
    const accountsSnapshot = accounts;
    const localSnapshot = platformKey === 'instagram' ? localInstagram : localTikTok;

    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    if (platformKey === 'instagram') {
      localStorage.removeItem('amai_connected_instagram');
      setLocalInstagram(null);
    } else {
      localStorage.removeItem('amai_connected_tiktok');
      setLocalTikTok(null);
    }

    try {
      // apiFetch attaches the auth token and throws on any non-2xx response
      // (401, 404, etc.) instead of silently swallowing it. The previous
      // raw fetch() sent no Authorization header at all, so the backend's
      // JwtAuthGuard rejected every disconnect with a 401 that was never
      // even read -- the DB row was never deleted, and the account
      // reappeared as "connected" the moment fetchAccounts() ran below.
      if (accountId) {
        await apiFetch(`/oauth/accounts/${accountId}?brandId=${encodeURIComponent(getBrandId())}`, { method: 'DELETE' });
      }
      setMessage({ text: 'Account disconnected successfully.', type: 'success' });
      await fetchAccounts();
    } catch (err) {
      setAccounts(accountsSnapshot);
      if (platformKey === 'instagram') {
        if (localSnapshot) { localStorage.setItem('amai_connected_instagram', JSON.stringify(localSnapshot)); }
        setLocalInstagram(localSnapshot);
      } else {
        if (localSnapshot) { localStorage.setItem('amai_connected_tiktok', JSON.stringify(localSnapshot)); }
        setLocalTikTok(localSnapshot);
      }
      const message = err instanceof Error ? err.message : 'Failed to disconnect account.';
      setMessage({ text: message, type: 'error' });
    }
  };

  const instagramAccounts = accounts.filter(a => a.platform?.toUpperCase() === 'INSTAGRAM');
  const tiktokAccounts = accounts.filter(a => a.platform?.toUpperCase() === 'TIKTOK');

  const isInstagramConnected = instagramAccounts.length > 0 || !!localInstagram;
  const instagramHandle = instagramAccounts[0]?.handle || localInstagram?.handle || '@creator';

  const isTikTokConnected = tiktokAccounts.length > 0 || !!localTikTok;
  const tiktokHandle = tiktokAccounts[0]?.handle || localTikTok?.handle || '@creator';

  // TikTok-first launch: Instagram's connect entry point is hidden unless
  // an account is already connected (see lib/featureFlags.ts) -- an
  // existing connection is never hidden, only the ability to start a new
  // one while the integration isn't part of the V1 launch.
  const showInstagramCard = INSTAGRAM_ENABLED || isInstagramConnected;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="TikTok Connection"
        subtitle={showInstagramCard ? 'Tap any platform icon below to authorize and link your accounts instantly.' : 'Connect your TikTok account to let Oyinca schedule and publish for you.'}
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
            className="p-4 rounded-[var(--radius-lg)] text-xs font-semibold flex items-center justify-between border"
            style={message.type === 'success'
              ? { backgroundColor: 'var(--accent-success-subtle)', color: 'var(--accent-success)', borderColor: 'var(--accent-success)' }
              : { backgroundColor: 'var(--accent-error-subtle)', color: 'var(--accent-error)', borderColor: 'var(--accent-error)' }}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="touch-target" style={{ color: 'var(--text-secondary)' }}>
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Core Platform Cards Grid ── */}
      <div className={`grid grid-cols-1 gap-5 sm:gap-6 ${showInstagramCard ? 'sm:grid-cols-2 max-w-3xl' : 'max-w-sm'}`}>

        {/* 1. Instagram Card -- hidden for V1's TikTok-first launch unless
            an account is already connected (see showInstagramCard above) */}
        {showInstagramCard && (
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
              <div className="surface-tile p-3.5 space-y-1.5 text-xs">
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
        )}

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
                          <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                          <span>Reconnect Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenu(null);
                            const account = tiktokAccounts[0];
                            setDetailsModal({
                              title: 'TikTok Account',
                              handle: tiktokHandle,
                              status: 'Connected',
                              type: 'TikTok Creator',
                              lastSynced: 'Just now',
                              accountId: account?.id,
                              stats: account?.stats || null,
                            });
                            if (account?.id) {
                              loadTikTokVideos(account.id);
                            }
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
                  Connect TikTok
                </button>
              )}
            </div>

            {isTikTokConnected ? (
              <div className="surface-tile p-3.5 space-y-1.5 text-xs">
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
                Give Oyinca permission to manage your TikTok content.
              </p>
            )}

            {/* Was a silent product gap found in the production-readiness
                audit: TikTok's own Content Posting API forces every
                unaudited app's posts to private (SELF_ONLY) server-side --
                see publishing.service.ts's resolveTikTokPrivacyLevel() for
                the confirmed source. Users need to be told this explicitly
                rather than discovering it by checking their own TikTok
                profile after Oyinca reports a post as "published." Shown
                regardless of connection state since it's true either way. */}
            <div
              className="flex items-start space-x-2 rounded-lg p-2.5 text-[11px] leading-relaxed"
              style={{ backgroundColor: 'var(--accent-warning-subtle, rgba(245,158,11,0.1))', color: 'var(--text-secondary)' }}
            >
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-warning)' }} />
              <span>
                <strong style={{ color: 'var(--text-primary)' }}>Currently private on TikTok.</strong> Until Oyinca's TikTok integration completes TikTok&apos;s own content-posting review, posts published here are visible only to your account (TikTok&apos;s platform-side restriction for unreviewed apps, not an Oyinca setting).
              </span>
            </div>
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
              className="glass-panel rounded-[var(--radius-xl)] max-w-md w-full p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>{detailsModal.title}</h3>
                <button onClick={() => setDetailsModal(null)} className="touch-target" style={{ color: 'var(--text-secondary)' }}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="surface-tile p-3.5 flex justify-between">
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Account / Handle</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{detailsModal.handle}</span>
                </div>

                <div className="surface-tile p-3.5 flex justify-between">
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Account Type</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{detailsModal.type}</span>
                </div>

                <div className="surface-tile p-3.5 flex justify-between">
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>OAuth Status</span>
                  <span className="font-bold text-emerald-500">{detailsModal.status} ✓</span>
                </div>

                <div className="surface-tile p-3.5 flex justify-between">
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Last Synchronization</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{detailsModal.lastSynced}</span>
                </div>
              </div>

              {/* TikTok stats + recent videos -- only present when the
                  modal was opened for a TikTok account (accountId set).
                  Backs the user.info.stats and video.list scopes: both are
                  requested in the OAuth consent screen and now genuinely
                  used here, not just declared. */}
              {detailsModal.accountId && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      icon={<Users className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />}
                      label="Followers"
                      value={String(detailsModal.stats?.followerCount ?? 0)}
                      helperText="TikTok profile"
                    />
                    <StatCard
                      icon={<UserPlus className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />}
                      label="Following"
                      value={String(detailsModal.stats?.followingCount ?? 0)}
                      helperText="TikTok profile"
                    />
                    <StatCard
                      icon={<Heart className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />}
                      label="Total Likes"
                      value={String(detailsModal.stats?.likesCount ?? 0)}
                      helperText="Across all videos"
                    />
                    <StatCard
                      icon={<Video className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />}
                      label="Videos"
                      value={String(detailsModal.stats?.videoCount ?? 0)}
                      helperText="Published on TikTok"
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Recent Videos</h4>
                    {videosLoading ? (
                      <SkeletonListRows count={3} />
                    ) : videosError ? (
                      <p className="text-[11px]" style={{ color: 'var(--accent-error)' }}>{videosError}</p>
                    ) : tiktokVideos.length === 0 ? (
                      <EmptyState
                        icon={<PlayCircle className="h-6 w-6" style={{ color: 'var(--text-secondary)' }} />}
                        title="No videos yet"
                        description="Videos published to this TikTok account will show up here."
                      />
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {tiktokVideos.map((v) => (
                          <a
                            key={v.id}
                            href={v.shareUrl || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="surface-tile p-2.5 flex items-center space-x-3 hover:opacity-90 transition"
                          >
                            {v.coverImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={v.coverImageUrl} alt="" className="h-12 w-9 rounded-md object-cover flex-shrink-0" />
                            ) : (
                              <div className="h-12 w-9 rounded-md flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface-sunken)' }}>
                                <Video className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                {v.title || 'Untitled video'}
                              </p>
                              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                {v.viewCount.toLocaleString()} views • {v.likeCount.toLocaleString()} likes
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setDetailsModal(null);
                  setTiktokVideos([]);
                  setVideosError(null);
                }}
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
