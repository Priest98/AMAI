'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Approval Queue', href: '/dashboard/approval-queue' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'AutoPilot', href: '/dashboard/autopilot' },
  { label: 'Composer', href: '/dashboard/composer' },
  { label: 'Brands', href: '/dashboard/brands' },
  { label: 'Integrations', href: '/dashboard/integrations' },
  { label: 'Media', href: '/dashboard/media' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [userInitials, setUserInitials] = useState('U');

  useEffect(() => {
    // Auth guard: redirect to login if no token present
    const token = localStorage.getItem('marketing_os_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    // Parse user info from token for display
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const email: string = payload.email || '';
      const name: string = payload.name || email.split('@')[0] || 'User';
      setUserName(name);
      setUserInitials(name.slice(0, 2).toUpperCase());
    } catch {
      // Token is malformed – clear it and redirect
      localStorage.removeItem('marketing_os_token');
      router.replace('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('marketing_os_token');
    router.replace('/login');
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3">M</div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Marketing OS</h2>
        </div>

        <nav className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md flex items-center transition-colors ${
                    isActive
                      ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-700'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{userName}</p>
              <button
                onClick={handleLogout}
                className="text-xs text-zinc-500 hover:text-red-500 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {navItems.find((n) => n.href === pathname)?.label ?? 'Dashboard'}
          </h1>
          <Link
            href="/dashboard/composer"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            + Create Post
          </Link>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
