'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/logo';
import {
  LayoutDashboard,
  PenTool,
  Zap,
  FolderKanban,
  Radio,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Calendar as CalendarIcon,
  CheckSquare,
  BarChart3,
} from 'lucide-react';

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
    title: 'Publishing',
    items: [
      { label: 'Composer', href: '/dashboard/composer', icon: PenTool },
      { label: 'Calendar', href: '/dashboard/autopilot', icon: CalendarIcon },
      { label: 'Approval Queue', href: '/dashboard/approval-queue', icon: CheckSquare },
    ],
  },
  {
    title: 'Media & Automation',
    items: [
      { label: 'Media Library', href: '/dashboard/media', icon: FolderKanban },
      { label: 'AutoPilot Engine', href: '/dashboard/autopilot', icon: Zap },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { label: 'Connected Hub', href: '/dashboard/integrations', icon: Radio },
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

const mobileTabItems = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Post', href: '/dashboard/composer', icon: PenTool },
  { label: 'AutoPilot', href: '/dashboard/autopilot', icon: Zap },
  { label: 'Hub', href: '/dashboard/integrations', icon: Radio },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [userInitials, setUserInitials] = useState('U');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Auth guard
    const token = localStorage.getItem('marketing_os_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const email: string = payload.email || '';
      const name: string = payload.name || email.split('@')[0] || 'User';
      setUserName(name);
      setUserInitials(name.slice(0, 2).toUpperCase());
    } catch {
      localStorage.removeItem('marketing_os_token');
      router.replace('/login');
    }

    // Load saved sidebar collapse state
    const savedCollapse = localStorage.getItem('marketing_os_sidebar_collapsed');
    if (savedCollapse === 'true') {
      setIsCollapsed(true);
    }

    // Load saved theme preference
    const savedTheme = localStorage.getItem('marketing_os_theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
    }
  }, [router]);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('marketing_os_sidebar_collapsed', String(nextState));
  };

  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    localStorage.setItem('marketing_os_theme', nextTheme ? 'dark' : 'light');
  };

  const handleLogout = () => {
    localStorage.removeItem('marketing_os_token');
    router.replace('/login');
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${
        isDarkMode ? 'dark' : 'light'
      }`}
      style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* ── Compact High-Density Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 64 : 230 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex flex-col m-2.5 rounded-xl border relative z-30 overflow-hidden select-none"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
      >
        {/* Brand Header */}
        <div className="h-12 flex items-center justify-between px-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <Link href="/dashboard" className="flex items-center space-x-2">
            {isCollapsed ? (
              <Logo variant="monogram" className="h-7 w-7" />
            ) : (
              <Logo variant="full" className="h-7" />
            )}
          </Link>

          <button
            onClick={toggleCollapse}
            className="h-7 w-7 rounded-md flex items-center justify-center transition flex-shrink-0 touch-target"
            style={{ color: 'var(--text-secondary)' }}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Grouped Navigation Sections */}
        <nav className="p-2 flex-1 space-y-2.5 overflow-y-auto">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-0.5">
              {!isCollapsed && section.title && (
                <h3 className="px-2.5 text-[9px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {section.title}
                </h3>
              )}

              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <div key={item.label} className="relative group">
                    <Link
                      href={item.href}
                      className={`relative flex items-center ${
                        isCollapsed ? 'justify-center px-0' : 'space-x-2.5 px-2.5'
                      } py-1.5 rounded-lg text-xs font-medium transition-all`}
                      style={{
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebarActivePill"
                          className="absolute inset-0 rounded-lg border shadow-xs"
                          style={{
                            background: 'var(--gradient-gold-cta)',
                            borderColor: 'rgba(199, 167, 124, 0.4)',
                          }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <Icon
                        className="h-3.5 w-3.5 relative z-10 transition-colors"
                        style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                      />
                      {!isCollapsed && (
                        <span className="relative z-10 truncate tracking-tight text-xs font-semibold">{item.label}</span>
                      )}
                    </Link>

                    {/* Tooltip for Collapsed Sidebar */}
                    {isCollapsed && (
                      <div
                        className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                        style={{ backgroundColor: 'var(--bg-surface-raised)', color: 'var(--text-primary)' }}
                      >
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile Footer — Clean Borderless Row */}
        <div className="p-2.5 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-1 py-1`}>
            <div className="flex items-center space-x-2 min-w-0">
              <div className="h-7 w-7 rounded-md bg-gradient-to-tr from-amber-600 to-emerald-800 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">
                {userInitials}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate tracking-tight" style={{ color: 'var(--text-primary)' }}>{userName}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>pro_workspace</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="h-6 w-6 rounded-md flex items-center justify-center transition flex-shrink-0 touch-target hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ── Native Mobile Drawer ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-[80vw] max-w-xs z-50 p-4 flex flex-col justify-between md:hidden shadow-2xl overflow-y-auto border-r"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
                  <Logo variant="full" className="h-7" />
                  <button
                    onClick={() => setIsMobileOpen(false)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center touch-target"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="space-y-3">
                  {navSections.map((section, idx) => (
                    <div key={idx} className="space-y-0.5">
                      {section.title && (
                        <h3 className="px-2 text-[9px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {section.title}
                        </h3>
                      )}
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition touch-target"
                            style={{
                              backgroundColor: isActive ? 'var(--bg-surface-raised)' : 'transparent',
                              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            }}
                          >
                            <Icon className="h-4 w-4" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </nav>
              </div>

              <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-600 to-emerald-800 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{userName}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>Pro Account</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="h-8 w-8 rounded-lg flex items-center justify-center touch-target flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content Container ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 pb-14 md:pb-0">
        
        {/* Compact Header Component (Subtitle Removed to Reclaim Vertical Space) */}
        <header
          className="h-12 flex items-center justify-between px-3.5 m-2.5 mb-0 rounded-xl border z-20"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
        >
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center touch-target"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Open Mobile Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Simplified User Greeting */}
            <h1 className="text-xs sm:text-sm font-semibold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
              Hello, {userName}
            </h1>
          </div>

          {/* Compact Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Date Badge */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
              <CalendarIcon className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[11px]">{currentDateStr}</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="h-7 w-7 rounded-md transition border flex items-center justify-center touch-target"
              style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-700" />}
            </button>

            {/* + Post Button */}
            <Link
              href="/dashboard/composer"
              className="flex items-center justify-center px-3 py-1 text-xs font-bold text-white rounded-md transition shadow-xs touch-target btn-emerald-cta"
            >
              <span>+ Post</span>
            </Link>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-auto p-2.5 sm:p-5 md:p-6 lg:p-7">
          <div className="max-w-[1536px] mx-auto space-y-5">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 backdrop-blur-md border-t px-2 flex items-center justify-around z-30 shadow-lg" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
          {mobileTabItems.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.label}
                href={tab.href}
                className="flex flex-col items-center justify-center w-12 h-10 rounded-md transition touch-target"
                style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'scale-105' : ''}`} />
                <span className="text-[9px] mt-0.5 tracking-tight">{tab.label}</span>
              </Link>
            );
          })}
        </nav>

      </main>
    </div>
  );
}
