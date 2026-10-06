'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/logo';
import {
  LayoutDashboard,
  Zap,
  Radio,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Calendar as CalendarIcon,
  CalendarClock,
  CheckSquare,
  CheckCircle2,
  BarChart3,
  Plus,
  Building2,
  Users,
  Gem,
  Lock,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/api';
import { DashboardDataProvider, useDashboardData } from '@/lib/DashboardDataContext';
import { EngineEventsProvider } from '@/lib/EngineEventsContext';
import { OnboardingProvider } from '@/components/onboarding/OnboardingContext';
import NotificationsBell from '@/components/dashboard/NotificationsBell';
import ClientSwitcher from '@/components/dashboard/ClientSwitcher';
import ProActivationModal from '@/components/dashboard/ProActivationModal';
import { useTheme } from '@/lib/useTheme';
import BrandAttribution from '@/components/BrandAttribution';
import PlanSelectionNotice from '@/components/PlanSelectionNotice';

interface NavSubItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  title?: string;
  items: NavSubItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Creator',
    items: [
      { label: 'Command Center', href: '/dashboard/creator', icon: Layers },
    ],
  },
  {
    title: 'Agency',
    items: [
      { label: 'Portfolio', href: '/dashboard/agency', icon: Building2 },
      { label: 'Clients', href: '/dashboard/clients', icon: Users },
      { label: 'All Approvals', href: '/dashboard/agency/approvals', icon: CheckSquare },
      { label: 'All Calendar', href: '/dashboard/agency/calendar', icon: CalendarClock },
      { label: 'Portfolio Analytics', href: '/dashboard/agency/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Your workflow',
    items: [
      { label: 'Create', href: '/dashboard/media', icon: Plus },
      { label: 'Approval Queue', href: '/dashboard/approval-queue', icon: CheckSquare },
      { label: 'Calendar', href: '/dashboard/calendar', icon: CalendarClock },
      { label: 'Scheduled', href: '/dashboard/scheduled', icon: CalendarIcon },
      { label: 'Published', href: '/dashboard/published', icon: CheckCircle2 },
    ],
  },
  {
    // Only TikTok is a live, user-facing connection for V1 -- the section
    // is named after the one platform that's actually here rather than the
    // generic "Integrations", which would otherwise read as if there were
    // several to browse (see lib/featureFlags.ts; Instagram's entry point
    // inside this page is hidden, not this whole section).
    title: 'Manage',
    items: [
      { label: 'Accounts', href: '/dashboard/integrations', icon: Radio },
      { label: 'Autopilot', href: '/dashboard/engine', icon: Zap },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      // Pro/Agency only (analyticsLevel: 'advanced') -- shown to every plan
      // per the "preview the magic" principle (Free should see the surface
      // area of Oyinca, not have it hidden outright), with a lock badge
      // rendered inline below for whichever plan doesn't have it yet. The
      // page itself renders a real LockedFeature preview rather than 404ing.
      { label: 'Oyinca Brain', href: '/dashboard/intelligence', icon: Gem },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

/** Nav items that render a small lock badge for plans without the matching entitlement -- keys are hrefs, values the plan-check to run against the fetched BillingSummary. */
const LOCKED_NAV_HREFS = new Set(['/dashboard/intelligence']);

const NAV_TOUR_IDS: Record<string, string> = {
  '/dashboard/integrations': 'nav-integrations',
  '/dashboard/media': 'nav-media',
  '/dashboard/approval-queue': 'nav-approval-queue',
  '/dashboard/engine': 'nav-engine',
};

const mobileTabItems = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Oyinca', href: '/dashboard/engine', icon: Zap },
  { label: 'Upload', href: '/dashboard/media', icon: Plus },
  { label: 'Queue', href: '/dashboard/approval-queue', icon: CheckSquare },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [userInitials, setUserInitials] = useState('U');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Defaults to hidden/blank until the real plan is known -- briefly showing
  // Agency nav items or a wrong workspace label to a Free/Pro user (even for
  // one render) is worse than a half-second delay before they appear.
  const [hasAgency, setHasAgency] = useState(false);
  // Same "hide until known" caution as hasAgency -- gates the Creator nav
  // section (Command Center) so it never briefly shows for a Free/Pro/Agency
  // user before the real plan loads.
  const [hasCreator, setHasCreator] = useState(false);
  const [workspaceLabel, setWorkspaceLabel] = useState('');
  // Drives the lock badge on the "Oyinca Intelligence" nav item (see
  // LOCKED_NAV_HREFS). Defaults to locked, same "hide until known" caution
  // as hasAgency above -- never briefly show an unlocked item to a Free user.
  const [analyticsLocked, setAnalyticsLocked] = useState(true);
  const { isDark: isDarkMode, toggleTheme } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // Gates rendering of the actual dashboard shell until the auth check has
  // resolved — without this, an unauthenticated visitor briefly sees the
  // full protected layout flash on screen before the redirect kicks in.
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const { bootstrap } = useDashboardData();

  // Next prefetches visible links in production. These intent handlers also
  // cover links inside the mobile drawer and bottom bar before a tap commits
  // the navigation, while keeping the initial dashboard request budget small.
  const prefetchRoute = useCallback((href: string) => {
    if (href !== pathname) router.prefetch(href);
  }, [pathname, router]);

  useEffect(() => {
    // Auth guard — getCurrentUser() already treats a missing or expired
    // token as "not logged in" and clears it, so a single check covers both.
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    setUserName(user.name);
    setUserInitials(user.name.slice(0, 2).toUpperCase());
    setIsAuthChecked(true);
  }, [router]);

  // Drives which nav items render (the "Agency" section is Agency-plan only
  // -- see AgencyEntitlementGuard on the backend, which is the real
  // enforcement; this only controls what's shown) and the workspace label
  // under the user's name. Failure just leaves both at their Free-like
  // defaults rather than throwing, since a billing hiccup shouldn't take
  // down the whole dashboard shell.
  useEffect(() => {
    if (!bootstrap) return;
    const b = bootstrap.billing;
    setHasAgency(b.entitlements.clientManagement === true);
    setHasCreator(b.entitlements.tier === 'CREATOR');
    setWorkspaceLabel(`${b.plan.toLowerCase()}_workspace`);
    setAnalyticsLocked(b.entitlements.analyticsLevel !== 'advanced');
  }, [bootstrap]);

  const visibleNavSections = navSections.filter((section) => {
    if (section.title === 'Agency') return hasAgency;
    if (section.title === 'Creator') return hasCreator;
    return true;
  });

  // Every dashboard <Link> in the mobile nav drawer closes the drawer on
  // click, but this layout never remounts between routes, so any
  // navigation that bypasses that click handler (browser back/forward, a
  // programmatic router.push from elsewhere like the onboarding tour) can
  // leave isMobileOpen stuck true. That strands the drawer's full-viewport
  // `fixed inset-0` backdrop (below) mounted on top of the new page,
  // silently swallowing all touch/scroll input on it -- reported as "can't
  // scroll up" on the Integrations page, but really any page reached that
  // way. Force-closing on every route change guarantees it can never
  // outlive the page it was opened on.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Powers the floating header's shrink-on-scroll transition -- same
  // "island" behavior as the landing page's Nav.tsx.
  useEffect(() => {
    setIsSidebarCollapsed(window.localStorage.getItem('oyinca_sidebar_collapsed') === 'true');
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem('oyinca_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Theme state (read/write + <html> sync) now lives in the shared
  // useTheme hook so the dashboard, landing page, sign in, and sign up all
  // read/write the same 'marketing_os_theme' key and stay in sync.

  const handleLogout = () => {
    logout();
  };

  // Nothing to show yet — either the redirect to /login is about to fire,
  // or we just haven't confirmed the session is valid. Render an empty
  // shell instead of the dashboard so protected content never flashes.
  if (!isAuthChecked) {
    return <div className={`min-h-screen ${isDarkMode ? 'dark' : 'light'}`} style={{ backgroundColor: 'var(--bg-base)' }} />;
  }

  return (
    <EngineEventsProvider>
    <OnboardingProvider>
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkMode ? 'dark' : 'light'
      }`}
      style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <ProActivationModal />

      {/* ── 1. Floating "Dynamic Island" Top Navigation ──
          Same floating glass-pill language as the landing page's Nav.tsx:
          rounded-full, inset margins, blur/border/shadow, and a tightened
          shadow/padding once the page scrolls. */}
      <header
        className="h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'var(--surface-panel)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Left: Logo & Mobile Toggle */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* lg:hidden, not md:hidden. The sidebar below is `hidden lg:block`,
              so anything hidden at md left tablets (768-1023px, e.g. iPad
              portrait) with no navigation at all: no sidebar, no drawer
              trigger, no bottom bar. Every mobile nav affordance now shares
              the sidebar's lg breakpoint so exactly one of the two is always
              present. */}
          <button
            onClick={() => setIsMobileOpen(true)}
            className="btn-icon-glass lg:hidden h-11 w-11 items-center justify-center"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" onPointerEnter={() => prefetchRoute('/dashboard')} onFocus={() => prefetchRoute('/dashboard')} className="flex items-center space-x-2">
            <Logo variant="full" className="h-7" />
          </Link>

          {/* Renders only when the workspace has more than one client, so
              the current client is never ambiguous on Agency and never
              clutters Free/Pro. */}
          <ClientSwitcher />
        </div>

        {/* Right Utility Actions */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <NotificationsBell />

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="btn-icon-glass h-9 w-9 flex items-center justify-center touch-target"
            style={{ color: 'var(--text-primary)' }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="h-3.5 w-3.5" style={{ color: 'var(--accent-warning)' }} /> : <Moon className="h-3.5 w-3.5" style={{ color: 'var(--accent-secondary)' }} />}
          </button>

        </div>
      </header>

      {/* ── Native Mobile Drawer ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ backgroundColor: 'rgba(10, 11, 20, 0.6)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="fixed top-0 left-0 bottom-0 w-[17rem] max-w-[85vw] z-50 p-5 flex flex-col justify-between border-r lg:hidden backdrop-blur-xl overflow-y-auto"
              style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Logo variant="full" className="h-7" />
                  <button
                    onClick={() => setIsMobileOpen(false)}
                    className="btn-icon-glass h-9 w-9 flex items-center justify-center touch-target"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="space-y-4">
                  {visibleNavSections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-0.5">
                      {section.title && (
                        <p className="text-overline px-3 py-1">
                          {section.title}
                        </p>
                      )}
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        const isLocked = LOCKED_NAV_HREFS.has(item.href) && analyticsLocked;
                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            data-tour={NAV_TOUR_IDS[item.href]}
                            onClick={() => setIsMobileOpen(false)}
                            onPointerEnter={() => prefetchRoute(item.href)}
                            onFocus={() => prefetchRoute(item.href)}
                            onTouchStart={() => prefetchRoute(item.href)}
                            className="flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-md)] text-body-sm font-semibold transition-all duration-200 touch-target"
                            style={{
                              backgroundColor: isActive ? 'var(--accent-secondary-subtle)' : 'transparent',
                              color: isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                            }}
                          >
                            <span className="flex items-center space-x-3">
                              <Icon className="h-4 w-4" style={{ color: isActive ? 'var(--accent-secondary)' : 'var(--text-muted)' }} />
                              <span>{item.label}</span>
                            </span>
                            {isLocked && <Lock className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </nav>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-[var(--radius-md)] text-xs font-bold border"
                  style={{ color: 'var(--accent-error)', backgroundColor: 'var(--accent-error-subtle)', borderColor: 'var(--accent-error)' }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
                <BrandAttribution />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 2. The 3-Column SaaS Grid Container ── */}
      {/* Bottom padding clears the fixed mobile tab bar (4rem + safe-area).
          Previously pb-4/pb-6 meant the last ~48px of every page sat behind
          it and could not be scrolled into view. Reset to a normal gap at lg
          where the bar is gone and the sidebar takes over. */}
      <div
        className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8"
      >
        <div className="flex gap-6">

          {/* Column 1: Left Sidebar Navigation */}
          <aside className={`hidden lg:block shrink-0 transition-[width] duration-200 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`exec-card sticky top-20 space-y-6 ${isSidebarCollapsed ? 'p-3' : 'p-5'}`}>

              <button
                type="button"
                onClick={toggleSidebar}
                className="btn-ghost touch-target w-full gap-2 px-2 text-body-sm"
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                {!isSidebarCollapsed && <span>Collapse</span>}
              </button>

              {/* Profile Card */}
              <div className={`surface-tile flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3.5 space-x-3'}`}>
                <div className="h-9 w-9 shrink-0 rounded-[var(--radius-md)] flex items-center justify-center font-bold text-xs" style={{ background: 'var(--gradient-primary-cta)', color: 'var(--text-on-accent)' }}>
                  {userInitials}
                </div>
                <div className={`min-w-0 flex-1 ${isSidebarCollapsed ? 'hidden' : ''}`}>
                  <p className="text-body-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{userName}</p>
                  {workspaceLabel && (
                    <p className="text-caption truncate" style={{ color: 'var(--text-muted)' }}>{workspaceLabel}</p>
                  )}
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-4">
                {visibleNavSections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-1">
                    {section.title && (
                      <p className={`text-overline px-3 pb-1.5 pt-1 ${isSidebarCollapsed ? 'sr-only' : ''}`}>
                        {section.title}
                      </p>
                    )}
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;
                      const isLocked = LOCKED_NAV_HREFS.has(item.href) && analyticsLocked;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          data-tour={NAV_TOUR_IDS[item.href]}
                          className={`flex items-center px-3 py-2.5 rounded-[var(--radius-md)] text-body-sm font-semibold transition-colors duration-200 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                          title={isSidebarCollapsed ? item.label : undefined}
                          style={{
                            backgroundColor: isActive ? 'var(--accent-secondary-subtle)' : 'transparent',
                            color: isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                          }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--hover-surface)'; }}
                          onPointerEnter={() => prefetchRoute(item.href)}
                          onFocus={() => prefetchRoute(item.href)}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <span className={`flex items-center min-w-0 ${isSidebarCollapsed ? '' : 'space-x-2.5'}`}>
                            <Icon className="h-4 w-4 flex-shrink-0" style={{ color: isActive ? 'var(--accent-secondary)' : 'var(--text-muted)' }} />
                            <span className={`truncate tracking-tight ${isSidebarCollapsed ? 'sr-only' : ''}`}>{item.label}</span>
                          </span>
                          {isLocked && !isSidebarCollapsed && <Lock className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                <button
                  onClick={handleLogout}
                  className={`min-h-10 px-3 rounded-[var(--radius-sm)] text-xs font-bold flex items-center transition ${isSidebarCollapsed ? 'justify-center w-full' : 'space-x-1.5'}`}
                  title={isSidebarCollapsed ? 'Sign out' : undefined}
                  style={{ color: 'var(--accent-error)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-error-subtle)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className={isSidebarCollapsed ? 'sr-only' : ''}>Sign out</span>
                </button>
              </div>

              {/* Company (not product) attribution -- subtle by design, see
                  components/BrandAttribution.tsx's doc comment. */}
              {!isSidebarCollapsed && <BrandAttribution />}
            </div>
          </aside>

          {/* Column 2 & 3 Workspace Content */}
          <main className="min-w-0 flex-1">
            <PlanSelectionNotice dashboard />
            {children}
          </main>

        </div>
      </div>

      {/* Mobile Bottom Bar — Streamlined Navigation with Center Upload Button */}
      {/* lg:hidden to match the sidebar breakpoint (see the drawer trigger
          above). paddingBottom carries the iOS home-indicator inset so the
          tab row never sits underneath it. */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 border-t px-2 sm:px-4 flex items-center justify-around z-30"
        style={{
          height: 'calc(4rem + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
          backgroundColor: 'var(--surface-panel)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--elevation-2)',
        }}
      >
        {mobileTabItems.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-[var(--radius-sm)] transition-all duration-200 touch-target"
              style={{ color: isActive ? 'var(--accent-secondary)' : 'var(--text-muted)' }}
              onPointerEnter={() => prefetchRoute(tab.href)}
              onFocus={() => prefetchRoute(tab.href)}
              onTouchStart={() => prefetchRoute(tab.href)}
            >
              <Icon className="h-[18px] w-[18px]" />
              {/* 9px was effectively unreadable; 10px with normal tracking
                  still fits five tabs at 320px. */}
              <span className="text-[10px] leading-none font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
    </OnboardingProvider>
    </EngineEventsProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardDataProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardDataProvider>
  );
}
