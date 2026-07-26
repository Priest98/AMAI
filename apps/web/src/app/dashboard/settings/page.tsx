"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Building,
  User,
  Bell,
  ShieldCheck,
  Key,
  Check,
  Lock,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'profile' | 'notifications' | 'security'>('workspace');
  const [orgName, setOrgName] = useState('My Marketing Workspace');
  const [brandName, setBrandName] = useState('Primary Brand');
  const [userEmail, setUserEmail] = useState('user@marketing-os.com');
  const [message, setMessage] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Settings saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Manage your workspace preferences, profile, and security health.</p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2"
          >
            <Check className="h-4 w-4 text-emerald-500" />
            <span>{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Bar */}
      <div className="p-1.5 rounded-[22px] soft-card flex space-x-2">
        {[
          { id: 'workspace', label: 'Workspace', icon: Building },
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'security', label: 'Security & API Keys', icon: Key },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="settingsTabPill"
                  className="absolute inset-0 rounded-xl bg-slate-200/80 dark:bg-gradient-to-r dark:from-rose-500/20 dark:via-purple-500/10 dark:to-transparent dark:border dark:border-rose-500/30 shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`h-4 w-4 relative z-10 ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-zinc-400'}`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="soft-card p-8 rounded-[22px] space-y-6">
        {activeTab === 'workspace' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Workspace Preferences</h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Default Brand Name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500/50"
              />
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">User Account</h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500/50"
              />
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Publishing & Failure Alerts</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-rose-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">Email alert when a post fails to publish</span>
              </label>
              <label className="flex items-center space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-rose-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">Notify 7 days before an OAuth token expires</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Encryption & Security Health</h3>
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <ShieldCheck className="h-5 w-5" />
                <span>AES-256-CBC Token Storage Active</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                All connected social media access tokens and refresh tokens are encrypted at rest prior to storage in PostgreSQL.
              </p>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-slate-200/60 dark:border-white/10 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md transition border border-white/20"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
