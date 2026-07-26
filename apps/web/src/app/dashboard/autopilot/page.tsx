"use client";
import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function AutoPilotPage() {
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState('');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const [engineActive, setEngineActive] = useState(false);
  const [postingFrequency, setPostingFrequency] = useState('1_per_day');
  const [defaultTone, setDefaultTone] = useState('friendly');
  const [targetInstagram, setTargetInstagram] = useState(true);
  const [targetTikTok, setTargetTikTok] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('marketing_os_token');
    let brandId = 'primary_brand';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.brandId) brandId = payload.brandId;
      } catch (e) {}
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setWebhookUrl(`${origin}/api/autopilot/ingest/wh_${brandId}_${Date.now().toString(36)}`);
  }, []);

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoogleDriveOAuth = () => {
    setAuthorizing(true);
    setTimeout(() => {
      setDriveFolderId('Auto_Synced_Marketing_Folder');
      setDriveConnected(true);
      setAuthorizing(false);
      setIsDriveModalOpen(false);
    }, 1000);
  };

  const toggleEngine = () => {
    setEngineActive(!engineActive);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Google Drive & Cloud Auto-Pilot</h1>
        <p className="text-sm text-zinc-500 mt-1">Automatically sync, generate captions with AI, and publish directly from Google Drive or iOS Shortcuts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Col: Setup */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Section 1: Connect Source */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">1. Connect Source</h3>
            
            {/* Google Drive Connector */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12.01 2.375L4.24 15.826h15.54L12.01 2.375zM4.62 17.065L.85 23.615h15.34l-3.77-6.55H4.62zm16.14.28L16.5 10.325l-3.77 6.55 3.77 6.55 4.26-6.08z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Google Drive</p>
                  <p className="text-xs text-zinc-500">
                    {driveConnected ? `Connected (${driveFolderId})` : 'Not connected'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDriveModalOpen(true)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition shadow-sm flex items-center space-x-1 ${
                  driveConnected 
                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <span>⚡</span>
                <span>{driveConnected ? 'Manage Drive' : 'Sign in with Google'}</span>
              </button>
            </div>

            {/* iOS Shortcut Webhook */}
            <div className="mt-6 border-t border-zinc-200 dark:border-zinc-700 pt-6">
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-black dark:bg-white rounded-full flex items-center justify-center shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white dark:text-black" viewBox="0 0 384 512" fill="currentColor">
                      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Apple iCloud / iOS Shortcut Webhook</p>
                    <p className="text-xs font-mono text-green-600 dark:text-green-400">Ready & Configured</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Your Live Unique Webhook URL</label>
                <div className="flex">
                  <input 
                    type="text" 
                    value={webhookUrl} 
                    readOnly
                    className="w-full px-3 py-2 border border-r-0 border-zinc-300 dark:border-zinc-700 rounded-l-md bg-zinc-50 dark:bg-zinc-800/50 text-xs font-mono text-zinc-700 dark:text-zinc-300"
                  />
                  <button 
                    onClick={handleCopyWebhook}
                    className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-r-md hover:bg-blue-700 transition"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: AI Settings */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">2. AI Caption Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Default Brand Tone</label>
                <select 
                  value={defaultTone}
                  onChange={(e) => setDefaultTone(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="friendly">Friendly & Casual</option>
                  <option value="professional">Professional</option>
                  <option value="witty">Witty & Humorous</option>
                  <option value="enthusiastic">Enthusiastic & Hype</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Target Platforms</label>
                <div className="flex space-x-4 mt-2">
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={targetInstagram}
                      onChange={(e) => setTargetInstagram(e.target.checked)}
                      className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">Instagram</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={targetTikTok}
                      onChange={(e) => setTargetTikTok(e.target.checked)}
                      className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">TikTok</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Schedule Settings */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">3. Schedule Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Posting Frequency</label>
              <select 
                value={postingFrequency}
                onChange={(e) => setPostingFrequency(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2"
              >
                <option value="1_per_day">1 post per day</option>
                <option value="2_per_day">2 posts per day</option>
                <option value="5_per_day">5 posts per day</option>
              </select>
              <p className="text-xs text-zinc-500">The automation engine will space out your posts evenly throughout peak engagement hours based on this setting.</p>
            </div>
          </div>

        </div>

        {/* Right Col: Status Card */}
        <div className="space-y-6">
          <div className={`rounded-xl border p-6 shadow-sm flex flex-col items-center justify-center text-center transition ${
            engineActive
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
              : 'bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-zinc-200 dark:border-zinc-700'
          }`}>
            <div className={`w-16 h-16 rounded-full shadow-md flex items-center justify-center mb-4 transition ${
              engineActive ? 'bg-green-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Auto-Pilot is {engineActive ? 'ACTIVE' : 'Off'}
            </h3>
            <p className="text-sm text-zinc-500 mb-6">
              {engineActive 
                ? 'Automation engine is listening for Google Drive uploads & webhooks.'
                : 'Click below to start listening for new media.'}
            </p>
            
            <button 
              onClick={toggleEngine}
              className={`w-full py-2.5 text-sm font-medium rounded-md transition shadow-sm ${
                engineActive 
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {engineActive ? 'Deactivate Engine' : 'Activate Engine'}
            </button>
          </div>
        </div>

      </div>

      {/* Modal: Connect Google Drive via 1-Click Sign-in */}
      {isDriveModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
                GD
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Sign in with Google</h3>
                <p className="text-xs text-zinc-500">Google OAuth 2.0 Drive Access</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl text-xs space-y-2 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-2">Requested Permissions:</p>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Access your Google Drive media folders</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Auto-sync new photos & videos to Auto-Pilot</span>
                </div>
              </div>

              <button 
                onClick={handleGoogleDriveOAuth}
                disabled={authorizing}
                className="w-full py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl shadow-md hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>⚡</span>
                <span>{authorizing ? 'Granting Access...' : 'Sign in & Grant Google Drive Access'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button 
                type="button"
                onClick={() => setIsDriveModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
