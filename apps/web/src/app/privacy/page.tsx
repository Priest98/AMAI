import React from 'react';

export const metadata = {
  title: 'Privacy Policy | Marketing OS',
  description: 'Privacy Policy and Data Protection Notice for Marketing OS',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-rose-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/dashboard/integrations" className="flex items-center space-x-3 text-rose-500 font-bold text-xl tracking-tight">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-rose-500/20">
              M
            </div>
            <span>Marketing OS</span>
          </a>
          <a
            href="/dashboard/integrations"
            className="text-xs font-semibold text-zinc-400 hover:text-white transition px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800"
          >
            ← Back to Integrations
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div className="border-b border-zinc-800/80 pb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20 mb-4">
            <span>🛡️ Data Protection & Trust</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Last Updated: July 26, 2026 • Effective Date: July 26, 2026
          </p>
        </div>

        <section className="space-y-6 text-zinc-300 leading-relaxed text-sm">
          <div>
            <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
            <p>
              Welcome to <strong>Marketing OS</strong> ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy governs our data practices when you use our platform at{' '}
              <a href="https://marketing-os-eight-virid.vercel.app" className="text-rose-400 underline hover:text-rose-300">
                marketing-os-eight-virid.vercel.app
              </a>{' '}
              and our connected API services.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-3">
              We collect information to provide, maintain, and improve our automated AI social media publishing services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Account Credentials & Contact Information:</strong> Name, email address, workspace preferences, and brand configuration settings.
              </li>
              <li>
                <strong className="text-zinc-200">OAuth Credentials & Access Tokens:</strong> When you connect social media platforms (such as Instagram, TikTok, or Google Drive) via standard OAuth 2.0 authorization flows, we receive access tokens, refresh tokens, platform account IDs, and user handles.
              </li>
              <li>
                <strong className="text-zinc-200">Media Content & Metadata:</strong> Media assets (images, videos, captions, scheduling timestamps) uploaded or synced to your AutoPilot queue.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">3. How We Encrypt & Store OAuth Tokens</h2>
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
              <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                AES-256 Security Guarantee
              </p>
              <p className="text-zinc-300 text-sm">
                All OAuth access tokens and refresh tokens are encrypted at rest using industry-standard <strong>AES-256-CBC</strong> cryptography prior to storage in our PostgreSQL database. Plaintext tokens are never exposed to client-side scripts or third-party loggers.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">4. Third-Party API Integrations</h2>
            <p className="mb-3">
              Marketing OS integrates directly with official developer APIs:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-200">TikTok Open API (Login Kit v2 & Content Posting API):</strong> Used solely to authenticate your TikTok Creator/Business account and publish authorized video posts.
              </li>
              <li>
                <strong className="text-zinc-200">Meta Graph API (Instagram Business Login):</strong> Used solely to fetch profile handles, publish reels/posts, and manage comments per your explicit commands.
              </li>
              <li>
                <strong className="text-zinc-200">Google Drive API:</strong> Used solely to read media assets from your designated Auto-Pilot sync folder.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">5. Data Retention & Account Disconnection</h2>
            <p>
              You retain full ownership of your connected accounts. You may disconnect any integration at any time directly from your{' '}
              <a href="/dashboard/integrations" className="text-rose-400 underline hover:text-rose-300">
                Integrations Dashboard
              </a>. Upon disconnection, stored tokens are permanently scrubbed from our database immediately.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">6. Contact & Support</h2>
            <p>
              If you have any questions regarding this Privacy Policy or wish to request data deletion, please contact us at:
            </p>
            <p className="mt-2 text-rose-400 font-mono text-xs">
              support@marketing-os-eight-virid.vercel.app
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-800/80 pt-8 text-center text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Marketing OS. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
