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
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-xs text-zinc-400 mt-1">Manage your workspace preferences, profile, and security health.</p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center space-x-2"
          >
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glass Tab Bar */}
      <div className="p-1.5 rounded-2xl glass-panel border border-white/10 flex space-x-2">
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
                isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="settingsTabPill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-500/20 via-purple-500/10 to-transparent border border-rose-500/30"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`h-4 w-4 relative z-10 ${isActive ? 'text-rose-400' : 'text-zinc-400'}`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 shadow-xl">
        {activeTab === 'workspace' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight">Workspace Preferences</h3>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full p-3 rounded-xl border border-white/10 bg-zinc-950/60 text-sm text-white focus:outline-none focus:border-rose-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Default Brand Name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full p-3 rounded-xl border border-white/10 bg-zinc-950/60 text-sm text-white focus:outline-none focus:border-rose-500/50"
              />
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight">User Account</h3>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full p-3 rounded-xl border border-white/10 bg-zinc-950/60 text-sm text-white focus:outline-none focus:border-rose-500/50"
              />
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight">Publishing & Failure Alerts</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-rose-500" />
                <span className="text-xs font-semibold text-zinc-200">Email alert when a post fails to publish</span>
              </label>
              <label className="flex items-center space-x-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-rose-500" />
                <span className="text-xs font-semibold text-zinc-200">Notify 7 days before an OAuth token expires</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight">Encryption & Security Health</h3>
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="h-5 w-5" />
                <span>AES-256-CBC Token Storage Active</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                All connected social media access tokens and refresh tokens are encrypted at rest prior to storage in PostgreSQL.
              </p>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-white/10 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/25 transition border border-white/20"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
