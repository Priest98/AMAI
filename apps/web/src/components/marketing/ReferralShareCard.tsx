'use client';

import React, { useState } from 'react';
import { Copy, Check, Share2, Sparkles, Trophy, Gift, ArrowRight, MessageSquare, Twitter, Linkedin, Instagram } from 'lucide-react';

interface ReferralShareCardProps {
  fullName: string;
  position: number;
  totalSignups: number;
  referralCode: string;
  referralCount: number;
  rewardTier: string;
}

export function ReferralShareCard({
  fullName,
  position,
  totalSignups,
  referralCode,
  referralCount,
  rewardTier,
}: ReferralShareCardProps) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://oyinca.ai';
  const shareUrl = `${origin}/r/${referralCode}`;
  const shareText = `I'm getting early access to Oyinca — an AI social media manager built to handle the repetitive work behind running your content. Join me: ${shareUrl}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  return (
    <div className="w-full max-w-xl mx-auto rounded-3xl p-6 md:p-8 bg-slate-900/90 border border-purple-500/20 backdrop-blur-xl shadow-2xl text-white">
      {/* Top Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Priority Waitlist Active
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
          You're in, {fullName.split(' ')[0]}! 🚀
        </h2>
        <p className="text-slate-400 text-sm mt-2">
          Your spot is reserved. Move up the list by inviting fellow creators.
        </p>
      </div>

      {/* Position Metric Badge */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-900/30 to-slate-950 p-5 rounded-2xl border border-purple-500/20 text-center">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Your Position</div>
          <div className="text-3xl font-black text-purple-300 mt-1">#{position}</div>
          <div className="text-[11px] text-slate-500 mt-1">out of {totalSignups} creators</div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-slate-950 p-5 rounded-2xl border border-purple-500/20 text-center">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Verified Referrals</div>
          <div className="text-3xl font-black text-pink-400 mt-1">{referralCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">codes used</div>
        </div>
      </div>

      {/* Unique Link Copy Box */}
      <div className="mb-8">
        <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider mb-2">
          Your Personal Referral Link
        </label>
        <div className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="w-full bg-transparent px-3 py-1.5 text-xs text-purple-200 font-mono outline-none selection:bg-purple-500 selection:text-white"
          />
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-all shrink-0 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Share Triggers */}
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase text-slate-300 tracking-wider mb-3">
          Instant One-Click Share
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 hover:bg-emerald-900/40 text-emerald-300 text-xs font-medium transition-all group"
          >
            <MessageSquare className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            WhatsApp
          </button>
          <button
            onClick={handleTwitter}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-sky-950/40 border border-sky-500/20 hover:bg-sky-900/40 text-sky-300 text-xs font-medium transition-all group"
          >
            <Twitter className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            X (Twitter)
          </button>
          <button
            onClick={handleLinkedIn}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-950/40 border border-blue-500/20 hover:bg-blue-900/40 text-blue-300 text-xs font-medium transition-all group"
          >
            <Linkedin className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            LinkedIn
          </button>
          <button
            onClick={copyToClipboard}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 hover:bg-purple-900/40 text-purple-300 text-xs font-medium transition-all group"
          >
            <Share2 className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            TikTok Bio
          </button>
        </div>
      </div>

      {/* Milestone Rewards Roadmap */}
      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          Referral Reward Milestones
        </h3>

        <div className="space-y-3">
          {/* Milestone 1 */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              referralCount >= 3
                ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${referralCount >= 3 ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-500'}`}>
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">3 Referrals</div>
                <div className="text-[11px] text-slate-400">Priority Access Queue Jump</div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              {referralCount >= 3 ? 'Unlocked ✓' : `${referralCount}/3`}
            </span>
          </div>

          {/* Milestone 2 */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              referralCount >= 10
                ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${referralCount >= 10 ? 'bg-pink-500/20 text-pink-300' : 'bg-slate-800 text-slate-500'}`}>
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">10 Referrals</div>
                <div className="text-[11px] text-slate-400">Founding Launch Badge & Beta Access</div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              {referralCount >= 10 ? 'Unlocked ✓' : `${referralCount}/10`}
            </span>
          </div>

          {/* Milestone 3 */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              referralCount >= 25
                ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${referralCount >= 25 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">25 Referrals</div>
                <div className="text-[11px] text-slate-400">3 Months Free Oyinca Pro Plan</div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              {referralCount >= 25 ? 'Unlocked ✓' : `${referralCount}/25`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
