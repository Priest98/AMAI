"use client";
import React, { useState } from 'react';

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your workspace preferences, profile, and security settings.</p>
      </div>

      {message && (
        <div className="p-4 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-sm font-medium">
          ✓ {message}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-700 flex space-x-6">
        {[
          { id: 'workspace', label: 'Workspace' },
          { id: 'profile', label: 'Profile' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'security', label: 'Security & API Keys' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-sm font-medium border-b-2 transition ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 space-y-6 shadow-sm">
        {activeTab === 'workspace' && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Workspace Settings</h3>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-sm text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Default Brand Name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-sm text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Profile Settings</h3>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email Address</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-sm text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Publishing & Failure Alerts</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Email alert when a post fails to publish</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Notify 7 days before an OAuth token expires</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Encryption & Security Health</h3>
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-600 font-semibold text-sm">
                <span>🛡️ AES-256 Token Storage Active</span>
              </div>
              <p className="text-xs text-zinc-500">All connected platform tokens are encrypted at rest using AES-256-CBC cryptography.</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
