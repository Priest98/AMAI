'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/logo';
import {
  LayoutDashboard,
  Zap,
  FolderKanban,
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
} from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/api';
import { EngineEventsProvider } from '@/lib/EngineEventsContext';
import { OnboardingProvider } from '@/components/onboarding/OnboardingContext';
import NotificationsBell from '@/components/dashboard/NotificationsBell';

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
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Automation & Queue',
    items: [
      { label: 'Approval Queue', href: '/dashboard/approval-queue', icon: CheckSquare },
      { label: 'Publishing Calendar', href: '/dashboard/calendar', icon: CalendarClock },
      { label: 'Scheduled Posts', href: '/dashboard/scheduled', icon: CalendarIcon },
      { label: 'Published Posts', href: '/dashboard/published', icon: CheckCircle2 },
      { label: 'AMAI Engine', href: '/dashboard/engine', icon: Zap },
    ],
  },
  {
    title: 'Media Assets',
    items: [
      { label: 'Media Library', href: '/dashboard/media', icon: FolderKanban },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { label: 'Integrations', href: '/dashboard/integrations', icon: Radio },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

const NAV_TOUR_IDS: Record<string, string> = {
  '/dashboard/integrations': 'nav-integrations',
  '/dashboard/media': 'nav-media',
  '/dashboard/approval-queue': 'nav-approval-queue',
  '/dashboard/engine': 'nav-engine',
};

const mobileTabItems = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Engine', href: '/dashboard/engine', icon: Zap },
  { label: 'Upload', href: '/dashboard/media', icon: Plus },
  { label: 'Queue', href: '/dashboard/approval-queue', icon: CheckSquare },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [userInitials, setUserInitials] = useState('U');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  // Gates rendering of the actual dashboard shell until the auth check has
  // resolved — without this, an unauthenticated visitor briefly sees the
  // full protected layout flash on screen before the redirect kicks in.
  const [isAuthChecked, setIsAuthChecked] = useState(false);

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

    // Load saved theme preference
    const savedTheme = localStorage.getItem('marketing_os_theme');
    setIsDarkMode(savedTheme !== 'light');
  }, [router]);

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
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Keep <html> in sync too — Tailwind's `dark:` utilities key off an
  // ancestor with the "dark" class, so this must live on <html>, not just
  // this layout's own wrapper div (see apps/web/src/app/layout.tsx).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    localStorage.setItem('marketing_os_theme', nextTheme ? 'dark' : 'light');
  };

  const handleLogout = () => {
    logout();
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

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
      {/* ── 1. Floating "Dynamic Island" Top Navigation ──
          Same floating glass-pill language as the landing page's Nav.tsx:
          rounded-full, inset margins, blur/border/shadow, and a tightened
          shadow/padding once the page scrolls. */}
      <header
        className="flex items-center justify-between sticky z-40 mx-3 sm:mx-4 lg:mx-6 rounded-full transition-all duration-500 ease-out"
        style={{
          top: scrolled ? '0.5rem' : '0.75rem',
          padding: scrolled ? '0.45rem 0.5rem 0.45rem 1rem' : '0.65rem 0.75rem 0.65rem 1.25rem',
          backgroundColor: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          boxShadow: scrolled
            ? '0 10px 30px -12px rgba(0, 0, 0, 0.35), inset 0 1px 0 0 var(--glass-highlight)'
            : '0 6px 20px -10px rgba(0, 0, 0, 0.22), inset 0 1px 0 0 var(--glass-highlight)',
        }}
      >
        {/* Left: Logo & Mobile Toggle */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="btn-icon-glass md:hidden h-8 w-8 flex items-center justify-center touch-target"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Open Navigation Drawer"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Link href="/dashboard" className="flex items-center space-x-2">
            <Logo variant="full" className="h-7" />
          </Link>

          <div className="hidden sm:block h-4 w-px" style={{ backgroundColor: 'var(--card-border)' }} />

          {/* Compact User Greeting */}
          <span className="hidden sm:inline-block text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Hello, <span className="font-bold">{userName}</span>
          </span>
        </div>

        {/* Right Utility Actions */}
        <div className="flex items-center space-x-2">
          {/* Live Date Picker */}
          <div
            className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-[var(--radius-md)] text-xs font-medium border backdrop-blur-md"
            style={{ backgroundColor: 'var(--glass-card-bg)', borderColor: 'var(--glass-card-border)', color: 'var(--text-secondary)' }}
          >
            <CalendarIcon className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }} />
            <span className="text-[11px] font-mono">{currentDateStr}</span>
          </div>

          {/* Notifications */}
          <NotificationsBell />

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="btn-icon-glass h-8 w-8 flex items-center justify-center touch-target"
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
              className="fixed inset-0 z-40 md:hidden"
              style={{ backgroundColor: 'rgba(10, 11, 20, 0.6)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="fixed top-0 left-0 bottom-0 w-72 z-50 p-5 flex flex-col justify-between border-r md:hidden backdrop-blur-xl"
              style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Logo variant="full" className="h-7" />
                  <button
                    onClick={() => setIsMobileOpen(false)}
                    className="btn-icon-glass h-8 w-8 flex items-center justify-center touch-target"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="space-y-4">
                  {navSections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-0.5">
                      {section.title && (
                        <p className="text-overline px-3 py-1">
                          {section.title}
                        </p>
                      )}
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            data-tour={NAV_TOUR_IDS[item.href]}
                            onClick={() => setIsMobileOpen(false)}
                            className="flex items-center space-x-3 px-3 py-2 rounded-[var(--radius-md)] text-body-sm font-semibold transition-all duration-200"
                            style={{
                              backgroundColor: isActive ? 'var(--accent-secondary-subtle)' : 'transparent',
                              color: isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                            }}
                          >
                            <Icon className="h-4 w-4" style={{ color: isActive ? 'var(--accent-secondary)' : 'var(--text-muted)' }} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </nav>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 rounded-[var(--radius-md)] text-xs font-bold border"
                style={{ color: 'var(--accent-error)', backgroundColor: 'var(--accent-error-subtle)', borderColor: 'var(--accent-error)' }}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 2. The 3-Column SaaS Grid Container ── */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 pt-5 sm:pt-7 pb-4 sm:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Column 1: Left Sidebar Navigation */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="exec-card sticky top-20 p-4 space-y-6">

              {/* Profile Card */}
              <div className="surface-tile p-3 flex items-center space-x-3">
                <div className="h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center font-bold text-xs" style={{ background: 'var(--gradient-primary-cta)', color: 'var(--text-on-accent)' }}>
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{userName}</p>
                  <p className="text-caption truncate" style={{ color: 'var(--text-muted)' }}>pro_workspace</p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-4">
                {navSections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-0.5">
                    {section.title && (
                      <p className="text-overline px-3 py-1">
                        {section.title}
                      </p>
                    )}
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          data-tour={NAV_TOUR_IDS[item.href]}
                          className="flex items-center space-x-2.5 px-3 py-2 rounded-[var(--radius-md)] text-body-sm font-semibold transition-all duration-200"
                          style={{
                            backgroundColor: isActive ? 'var(--accent-secondary-subtle)' : 'transparent',
                            color: isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                          }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--hover-surface)'; }}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" style={{ color: isActive ? 'var(--accent-secondary)' : 'var(--text-muted)' }} />
                          <span className="truncate tracking-tight">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                <button
                  onClick={handleLogout}
                  className="h-7 px-3 rounded-[var(--radius-sm)] text-xs font-bold flex items-center space-x-1.5 transition"
                  style={{ color: 'var(--accent-error)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-error-subtle)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Column 2 & 3 Workspace Content */}
          <div className="lg:col-span-9">
            {children}
          </div>

        </div>
      </div>

      {/* Mobile Bottom Bar — Streamlined Navigation with Center Upload Button */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t px-4 flex items-center justify-around z-30" style={{ backgroundColor: 'var(--glass-bg)', backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)', borderColor: 'var(--glass-border)', boxShadow: 'var(--elevation-4)' }}>
        {mobileTabItems.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          const isUploadTab = tab.label === 'Upload';

          if (isUploadTab) {
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className="flex items-center justify-center h-11 w-11 rounded-full -translate-y-2 transition-transform active:scale-95 touch-target"
                style={{ background: 'var(--gradient-primary-cta)', color: 'var(--text-on-accent)', boxShadow: 'var(--elevation-3)' }}
                title="Upload New Media"
              >
                <Plus className="h-6 w-6" />
              </Link>
            );
          }

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className="flex flex-col items-center justify-center w-12 h-10 rounded-[var(--radius-sm)] transition-all duration-200 touch-target"
              style={{ color: isActive ? 'var(--accent-secondary)' : 'var(--text-muted)' }}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[9px] mt-0.5 tracking-tight font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
    </OnboardingProvider>
    </EngineEventsProvider>
  );
}
