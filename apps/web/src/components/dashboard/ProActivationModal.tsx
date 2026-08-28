"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getBillingSummary, markProActivationSeen, type BillingSummary } from '@/lib/billing';
import { brandFetch } from '@/lib/api';
import { CheckCircle2, Gem, ArrowRight } from 'lucide-react';

interface ContentIntelligence {
  hasEnoughData: boolean;
  recommendation?: string | null;
  bestFormat?: { label: string } | null;
  bestCategory?: { label: string } | null;
}

/**
 * The section 5/6 "activation moment" from the premium-conversion brief:
 * shown exactly once, right after a genuine upgrade to Pro/Agency (see
 * BillingSummary.showProActivation / Subscription.proActivationSeenAt).
 *
 * Deliberately only lists capabilities that are actually real and actually
 * unlocked by this plan change -- no "Trend Radar activated" or "Oyinca
 * Agent activated" line, because neither of those exists yet. Same
 * discipline applies to the analysis block below: if Oyinca genuinely
 * doesn't have enough published/measured content yet to say anything real
 * (very likely true for a just-upgraded org), it says so instead of
 * pretending to have analyzed something.
 */
export default function ProActivationModal() {
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [intelligence, setIntelligence] = useState<ContentIntelligence | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    getBillingSummary()
      .then((b) => {
        setBilling(b);
        if (b.showProActivation) {
          setVisible(true);
          brandFetch<ContentIntelligence>('/posts/content-intelligence').then(setIntelligence).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const dismiss = async () => {
    setDismissing(true);
    try {
      await markProActivationSeen();
    } catch {
      // best-effort -- still close locally; worst case it shows again next load
    }
    setVisible(false);
  };

  if (!billing) return null;

  const planName = billing.entitlements.displayName;
  const isCreator = billing.entitlements.tier === 'CREATOR';
  const capabilities = [
    'Advanced analytics activated',
    'Oyinca Intelligence activated',
    'Autopilot (hands-off publishing) available',
    'Full Business Brain (voice learning, goals, competitive context) unlocked',
    // Creator's whole point is running more than one account side by side --
    // the maxBrands figure IS the account count for this tier (see
    // plans.config.ts), so this line stays accurate even if that number
    // changes later.
    ...(isCreator ? [`${billing.entitlements.maxBrands} managed accounts activated`, 'Creator Command Center activated', 'Cross-account intelligence activated'] : []),
    ...(billing.entitlements.clientManagement ? ['Multi-brand workspace activated'] : []),
    ...(billing.entitlements.prioritySupport ? ['Priority support activated'] : []),
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(10, 11, 20, 0.7)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 6 }}
            className="glass-panel w-full max-w-lg rounded-[var(--radius-xl)] p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="space-y-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: 'var(--accent-secondary-subtle)', color: 'var(--accent-secondary)' }}
              >
                <Gem className="h-3 w-3" />
                Welcome to {planName}
              </span>
              <h2 className="text-h1" style={{ color: 'var(--text-primary)' }}>
                Your social media manager is now online.
              </h2>
              <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                Let's put Oyinca to work.
              </p>
            </div>

            <div className="space-y-2.5">
              {capabilities.map((c) => (
                <div key={c} className="flex items-center gap-2.5 text-body-sm" style={{ color: 'var(--text-primary)' }}>
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-success)' }} />
                  <span>{c}</span>
                </div>
              ))}
            </div>

            <div className="exec-card p-4 sm:p-5" style={{ backgroundColor: 'var(--bg-surface-raised)' }}>
              {!intelligence ? (
                <div className="h-16 animate-pulse rounded-lg" style={{ backgroundColor: 'var(--bg-surface-sunken)' }} />
              ) : intelligence.hasEnoughData ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Gem className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
                    <span className="text-overline" style={{ color: 'var(--text-muted)' }}>Oyinca already analyzed your content</span>
                  </div>
                  <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {intelligence.recommendation || `${intelligence.bestFormat?.label || 'Your content'} is already showing a clear pattern.`}
                  </p>
                </>
              ) : (
                <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Oyinca will start surfacing real content patterns &mdash; your strongest format, topic and posting
                  window &mdash; once you've published a few more posts. Check back on Oyinca Intelligence soon.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Link
                href="/dashboard/intelligence"
                onClick={dismiss}
                className="flex-1 inline-flex items-center justify-center gap-2 btn-primary-gradient px-5 py-3 rounded-[var(--radius-md)] text-sm font-bold touch-target"
              >
                <span>See Oyinca Intelligence</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={dismiss}
                disabled={dismissing}
                className="px-5 py-3 rounded-[var(--radius-md)] text-sm font-bold touch-target"
                style={{ color: 'var(--text-secondary)' }}
              >
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
