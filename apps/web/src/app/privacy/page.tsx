import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white p-8 max-w-4xl mx-auto space-y-6 font-sans">
      <Link href="/login" className="text-xs text-rose-400 hover:underline">← Back to AMAI</Link>
      <h1 className="text-3xl font-bold">AMAI Privacy Policy</h1>
      <p className="text-sm text-zinc-400 leading-relaxed">
        AMAI accesses your Google Drive files solely to sync media for social media publishing to Instagram and TikTok. Token credentials are encrypted using AES-256 and never shared with third parties.
      </p>
    </div>
  );
}
