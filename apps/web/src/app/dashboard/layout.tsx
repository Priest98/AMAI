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
    <div className={`flex h-screen overflow-hidden font-sans ambient-bg transition-colors duration-300 ${
      isDarkMode ? 'dark bg-[#0B0D12] text-slate-100' : 'bg-[#F7F8FC] text-slate-900'
    }`}>
      
      {/* ── Desktop Collapsible Professional Sidebar (260px ↔ 72px) ── */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 260 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex flex-col m-3 rounded-[24px] exec-card relative z-30 overflow-hidden select-none bg-white dark:bg-[#12151D] border border-slate-200/60 dark:border-white/5"
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/60 dark:border-white/5">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            {isCollapsed ? (
              <Logo variant="monogram" className="h-8 w-8" />
            ) : (
              <Logo variant="full" className="h-8" />
            )}
          </Link>

          <button
            onClick={toggleCollapse}
            className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition flex-shrink-0 touch-target"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Grouped Navigation Sections */}
        <nav className="p-3 flex-1 space-y-4 overflow-y-auto">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && section.title && (
                <h3 className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
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
                        isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'
                      } py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'text-slate-900 dark:text-white font-bold'
                          : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/80 dark:hover:bg-white/5'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebarActivePill"
                          className="absolute inset-0 rounded-2xl bg-slate-100 dark:bg-white/10 dark:border dark:border-white/10 shadow-sm"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className={`h-4 w-4 relative z-10 transition-colors ${
                        isActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200'
                      }`} />
                      {!isCollapsed && (
                        <span className="relative z-10 truncate tracking-tight">{item.label}</span>
                      )}
                    </Link>

                    {/* Tooltip for Collapsed Sidebar */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-zinc-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-950/40">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5 shadow-sm`}>
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                  {userInitials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate tracking-tight">{userName}</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">pro_workspace</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition flex-shrink-0 touch-target"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ── Native Mobile Drawer (Slide-Over) ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-xs bg-white dark:bg-[#12151D] border-r border-slate-200 dark:border-white/10 z-50 p-5 flex flex-col justify-between md:hidden shadow-2xl overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                  <Logo variant="full" className="h-8" />
                  <button
                    onClick={() => setIsMobileOpen(false)}
                    className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400 flex items-center justify-center touch-target"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="space-y-4">
                  {navSections.map((section, idx) => (
                    <div key={idx} className="space-y-1">
                      {section.title && (
                        <h3 className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
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
                            className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold transition touch-target ${
                              isActive
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md flex-shrink-0">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{userName}</p>
                    <p className="text-[10px] text-slate-400 truncate">Pro Account</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 flex items-center justify-center touch-target flex-shrink-0">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content Container ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 pb-16 md:pb-0">
        
        {/* Responsive Mobile Top Header Bar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 m-2 sm:m-3 mb-0 rounded-[20px] sm:rounded-[24px] exec-card z-20 bg-white dark:bg-[#12151D] border border-slate-200/60 dark:border-white/5">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center touch-target"
              aria-label="Open Mobile Menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                Hello, {userName}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:block truncate">Automate your content pipeline from Google Drive to Instagram & TikTok with AMAI.</p>
            </div>
          </div>

          {/* Top Header Right Controls: Date Picker, Theme Toggle, + Create Post (NO Sparkle Icon) */}
          <div className="flex items-center space-x-2.5">
            
            {/* Live Date Badge */}
            <div className="hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-xs font-semibold text-slate-600 dark:text-zinc-300 border border-slate-200/60 dark:border-white/5">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-400" />
              <span>{currentDateStr}</span>
            </div>

            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/10 transition border border-slate-200/60 dark:border-white/5 flex items-center justify-center touch-target"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>

            {/* Primary Action Button (Clean: + Create Post ONLY, Sparkle Icon Removed) */}
            <Link
              href="/dashboard/composer"
              className="flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 rounded-full hover:opacity-95 transition shadow-lg shadow-rose-500/25 active:scale-95 border border-white/20 touch-target"
            >
              <span className="hidden xs:inline">+ Create Post</span>
              <span className="xs:hidden">+ Post</span>
            </Link>
          </div>
        </header>

        {/* Scrollable Mobile Page Body */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 md:p-8 lg:p-10">
          <div className="max-w-[1536px] mx-auto space-y-8 sm:space-y-12">
            {children}
          </div>
        </div>

        {/* ── Native Mobile Glass Bottom Navigation Bar (Thumb Ergonomics) ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 dark:bg-[#12151D]/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 px-3 flex items-center justify-around z-30 shadow-2xl">
          {mobileTabItems.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition touch-target ${
                  isActive
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
              </Link>
            );
          })}
        </nav>

      </main>
    </div>
  );
}
