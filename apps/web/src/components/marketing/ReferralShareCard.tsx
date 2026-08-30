'use client';

import React, { useState } from 'react';
import { Copy, Check, Share2, Trophy, Gift, MessageSquare, Twitter, Linkedin } from 'lucide-react';

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
}: ReferralShareCardProps) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://oyinca.com';
  const shareUrl = `${origin}/r/${referralCode}`;
  const shareText = `I'm getting early access to Oyinca — an AI social media manager built to handle the repetitive work behind running content. Join me: ${shareUrl}`;

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
    <div className="lp-card p-6 md:p-10 w-full max-w-xl mx-auto text-left space-y-6">
      {/* Top Banner */}
      <div className="text-center">
        <h2 className="lp-heading text-2xl md:text-3xl font-bold" style={{ color: 'var(--lp-text-primary)' }}>
          You're in, {fullName.split(' ')[0]}!
        </h2>
        <p className="text-sm mt-2" style={{ color: 'var(--lp-text-secondary)' }}>
          Your spot is reserved. Invite fellow creators to jump the queue and unlock founding perks.
        </p>
      </div>

      {/* Position Metric Badge */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl lp-glass text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--lp-text-muted)' }}>
            Your Position
          </div>
          <div className="lp-heading text-3xl font-bold mt-1" style={{ color: 'var(--lp-cyan)' }}>
            #{position}
          </div>
          <div className="text-[11px] mt-1" style={{ color: 'var(--lp-text-muted)' }}>
            out of {totalSignups} creators
          </div>
        </div>

        <div className="p-4 rounded-xl lp-glass text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--lp-text-muted)' }}>
            Verified Referrals
          </div>
          <div className="lp-heading text-3xl font-bold mt-1" style={{ color: 'var(--lp-gold)' }}>
            {referralCount}
          </div>
          <div className="text-[11px] mt-1" style={{ color: 'var(--lp-text-muted)' }}>
            creators invited
          </div>
        </div>
      </div>

      {/* Unique Link Copy Box */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--lp-text-secondary)' }}>
          Your Personal Referral Link
        </label>
        <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)' }}>
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="w-full bg-transparent px-3 py-1 text-xs font-mono outline-none selection:bg-[#7FB0DB] selection:text-black"
            style={{ color: 'var(--lp-text-primary)' }}
          />
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 rounded-lg text-xs font-semibold lp-btn-primary shrink-0 transition-transform active:scale-95 flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied
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
      <div>
        <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--lp-text-secondary)' }}>
          Share With Creators
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center justify-center p-3 rounded-xl lp-glass hover:border-[var(--lp-border-strong)] text-xs font-medium transition-all"
            style={{ color: 'var(--lp-text-secondary)' }}
          >
            <MessageSquare className="w-4 h-4 mb-1" style={{ color: 'var(--lp-cyan)' }} />
            WhatsApp
          </button>
          <button
            onClick={handleTwitter}
            className="flex flex-col items-center justify-center p-3 rounded-xl lp-glass hover:border-[var(--lp-border-strong)] text-xs font-medium transition-all"
            style={{ color: 'var(--lp-text-secondary)' }}
          >
            <Twitter className="w-4 h-4 mb-1" style={{ color: 'var(--lp-cyan)' }} />
            X
          </button>
          <button
            onClick={handleLinkedIn}
            className="flex flex-col items-center justify-center p-3 rounded-xl lp-glass hover:border-[var(--lp-border-strong)] text-xs font-medium transition-all"
            style={{ color: 'var(--lp-text-secondary)' }}
          >
            <Linkedin className="w-4 h-4 mb-1" style={{ color: 'var(--lp-cyan)' }} />
            LinkedIn
          </button>
          <button
            onClick={copyToClipboard}
            className="flex flex-col items-center justify-center p-3 rounded-xl lp-glass hover:border-[var(--lp-border-strong)] text-xs font-medium transition-all"
            style={{ color: 'var(--lp-text-secondary)' }}
          >
            <Share2 className="w-4 h-4 mb-1" style={{ color: 'var(--lp-cyan)' }} />
            Copy
          </button>
        </div>
      </div>

      {/* Milestone Rewards Roadmap */}
      <div className="pt-4 border-t" style={{ borderColor: 'var(--lp-border)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--lp-text-muted)' }}>
          <Trophy className="w-4 h-4" style={{ color: 'var(--lp-gold)' }} />
          Referral Milestones
        </h3>

        <div className="space-y-2.5">
          {/* Milestone 1 */}
          <div className="p-3 rounded-xl lp-glass flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="w-4 h-4" style={{ color: 'var(--lp-cyan)' }} />
              <div>
                <div className="text-xs font-bold text-white">3 Referrals</div>
                <div className="text-[11px]" style={{ color: 'var(--lp-text-muted)' }}>Priority Access Queue Jump</div>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
              {referralCount >= 3 ? 'Unlocked ✓' : `${referralCount}/3`}
            </span>
          </div>

          {/* Milestone 2 */}
          <div className="p-3 rounded-xl lp-glass flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-4 h-4" style={{ color: 'var(--lp-gold)' }} />
              <div>
                <div className="text-xs font-bold text-white">10 Referrals</div>
                <div className="text-[11px]" style={{ color: 'var(--lp-text-muted)' }}>Founding Creator Launch Badge</div>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
              {referralCount >= 10 ? 'Unlocked ✓' : `${referralCount}/10`}
            </span>
          </div>

          {/* Milestone 3 */}
          <div className="p-3 rounded-xl lp-glass flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-4 h-4" style={{ color: 'var(--lp-cyan)' }} />
              <div>
                <div className="text-xs font-bold text-white">25 Referrals</div>
                <div className="text-[11px]" style={{ color: 'var(--lp-text-muted)' }}>3 Months Free Oyinca Pro</div>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
              {referralCount >= 25 ? 'Unlocked ✓' : `${referralCount}/25`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
