import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center font-sans">
      <main className="flex flex-col items-center text-center px-6 max-w-4xl">
        <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl mb-8">
          M
        </div>
        
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6">
          The Ultimate <span className="text-blue-600">Marketing OS</span>
        </h1>
        
        <p className="text-xl leading-8 text-zinc-600 dark:text-zinc-400 max-w-2xl mb-12">
          Automate your social media presence. Drop your files into Google Drive or iCloud, and our AI will generate captions, optimize hashtags, and schedule posts for you.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/register"
            className="flex h-12 items-center justify-center rounded-xl bg-blue-600 px-8 text-white font-semibold shadow-md transition hover:bg-blue-700"
          >
            Start 14-Day Free Trial
          </Link>
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-8 text-zinc-900 dark:text-white font-semibold shadow-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Log in to Dashboard
          </Link>
        </div>
      </main>
      
      <footer className="absolute bottom-8 text-zinc-500 text-sm">
        &copy; {new Date().getFullYear()} Marketing OS. All rights reserved.
      </footer>
    </div>
  );
}
