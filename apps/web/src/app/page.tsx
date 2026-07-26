import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
          <span>✨ Welcome to AMAI</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          AMAI — AI Social Media Automation Engine
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
          Automate your content pipeline from Google Drive straight to Instagram Reels and TikTok Videos using intelligent AI copywriters and AutoPilot scheduling.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-500/25 hover:opacity-95 transition"
          >
            Launch AMAI Dashboard
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold text-sm rounded-xl transition border border-white/10"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
