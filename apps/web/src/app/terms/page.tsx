import React from 'react';

export const metadata = {
  title: 'Terms of Service | Marketing OS',
  description: 'Terms of Service and End-User Agreement for Marketing OS',
};

export default function TermsOfServicePage() {
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
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold border border-purple-500/20 mb-4">
            <span>⚖️ Legal Terms & Conditions</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Last Updated: July 26, 2026 • Effective Date: July 26, 2026
          </p>
        </div>

        <section className="space-y-6 text-zinc-300 leading-relaxed text-sm">
          <div>
            <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account or connecting social media profiles to <strong>Marketing OS</strong> ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must discontinue use of the Platform immediately.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">2. Service Description</h2>
            <p>
              Marketing OS provides automated social media management tools, including AI content generation, media storage synchronization via Google Drive, and automated multi-platform publishing to Instagram, TikTok, and connected social networks.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">3. Acceptable Use & Content Standards</h2>
            <p className="mb-3">
              You agree that you will not use Marketing OS to publish or transmit content that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-400">
              <li>Violates any platform rules or community guidelines of Instagram, TikTok, or Google.</li>
              <li>Contains unlawful, harmful, defamatory, or deceptive material.</li>
              <li>Infringes upon any third-party intellectual property or copyright.</li>
              <li>Generates spam, automated abuse, or unauthorized commercial solicitations.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">4. Connected Platform Accounts & API Terms</h2>
            <p>
              When connecting third-party platform accounts (such as TikTok Login Kit or Meta Instagram Graph API), you are also bound by the respective Terms of Service of those third-party providers. Marketing OS is not responsible for any enforcement actions, rate limits, or account restrictions imposed by external social platforms.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">5. Disclaimer of Warranties & Limitation of Liability</h2>
            <p>
              Marketing OS is provided on an "AS IS" and "AS AVAILABLE" basis. We disclaim all warranties of any kind, whether express or implied. In no event shall Marketing OS be liable for indirect, incidental, or consequential damages resulting from your use of the Platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">6. Contact & Legal Inquiries</h2>
            <p>
              For legal inquiries or notices regarding these Terms, please contact us at:
            </p>
            <p className="mt-2 text-purple-400 font-mono text-xs">
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
