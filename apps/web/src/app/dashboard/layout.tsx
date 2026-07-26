'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Command,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Create Post', href: '/dashboard/composer', icon: PenTool },
  { label: 'Automation', href: '/dashboard/autopilot', icon: Zap },
  { label: 'Media Library', href: '/dashboard/media', icon: FolderKanban },
  { label: 'Integrations', href: '/dashboard/integrations', icon: Radio },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [userInitials, setUserInitials] = useState('U');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // Auth guard: redirect to login if no token present
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
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('marketing_os_token');
    router.replace('/login');
  };

  const currentNav = navItems.find((n) => n.href === pathname) || navItems[0];

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans overflow-hidden selection:bg-rose-500 selection:text-white">
      {/* ── Desktop Floating Glass Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 260 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex flex-col m-3 rounded-2xl glass-panel relative z-30 shadow-2xl border border-white/10 overflow-hidden"
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
              M
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center space-x-2"
              >
                <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  Marketing OS
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  PRO
                </span>
              </motion.div>
            )}
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-7 w-7 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-400 hover:text-white flex items-center justify-center transition border border-white/5"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 flex-1 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-500/20 via-purple-500/10 to-transparent border border-rose-500/30"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`h-4 w-4 relative z-10 transition-colors ${isActive ? 'text-rose-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
                {!isCollapsed && (
                  <span className="relative z-10 truncate tracking-tight">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-white/10 bg-zinc-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                  {userInitials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate tracking-tight">{userName}</p>
                  <p className="text-[10px] text-zinc-400 truncate">pro_workspace</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition border border-transparent hover:border-rose-500/20"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-zinc-950 border-r border-white/10 z-50 p-4 flex flex-col justify-between md:hidden"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-base">
                      M
                    </div>
                    <span className="font-bold text-lg text-white">Marketing OS</span>
                  </div>
                  <button onClick={() => setIsMobileOpen(false)} className="text-zinc-400 hover:text-white">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                          isActive
                            ? 'bg-rose-500/20 text-white border border-rose-500/30'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isActive ? 'text-rose-400' : 'text-zinc-400'}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-rose-600 flex items-center justify-center font-bold text-white text-xs">
                    {userInitials}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{userName}</p>
                    <p className="text-[10px] text-zinc-400">Pro Account</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="text-zinc-400 hover:text-rose-400">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content Container ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top Floating Glass Header */}
        <header className="h-16 flex items-center justify-between px-6 m-3 mb-0 rounded-2xl glass-panel border border-white/10 z-20 shadow-md">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Workspace</span>
              <span className="text-zinc-600">/</span>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>{currentNav.label}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search Hotkey Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400">
              <Command className="h-3.5 w-3.5" />
              <span>Search or command...</span>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-800 text-zinc-300 rounded border border-white/10 font-mono">⌘K</kbd>
            </div>

            {/* Primary Action Button */}
            <Link
              href="/dashboard/composer"
              className="flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 rounded-xl hover:opacity-95 transition-all shadow-lg shadow-rose-500/25 active:scale-95 border border-white/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>+ Create Post</span>
            </Link>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
