import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white p-8 max-w-4xl mx-auto space-y-6 font-sans">
      <Link href="/login" className="text-xs text-rose-400 hover:underline">← Back to AMAI</Link>
      <h1 className="text-3xl font-bold">AMAI Terms of Service</h1>
      <p className="text-sm text-zinc-400 leading-relaxed">
        By using AMAI, you authorize automated media syncing from your designated Google Drive folder and automated content publishing to connected Instagram and TikTok creator profiles.
      </p>
    </div>
  );
}
