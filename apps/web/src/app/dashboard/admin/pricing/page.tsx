"use client";

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Pencil } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice, CURRENCY_SYMBOLS, type Currency } from '@/lib/currency';

type PlanTier = 'PRO' | 'AGENCY';
type BillingInterval = 'MONTHLY' | 'ANNUAL';

interface PriceRow {
  tier: PlanTier;
  currency: Currency;
  billingInterval: BillingInterval;
  regularAmount: number | null;
  newUserAmount: number | null;
  source: 'database' | 'static_config';
  providerObjectId: string | null;
  updatedByEmail: string | null;
  updatedAt: string | null;
}

const TIERS: PlanTier[] = ['PRO', 'AGENCY'];
const CURRENCIES: Currency[] = ['USD', 'GBP', 'NGN'];
const INTERVALS: BillingInterval[] = ['MONTHLY', 'ANNUAL'];

/**
 * Oyinca's internal pricing console. Every save here creates a REAL, new,
 * live Stripe Price or Paystack Plan (see PricingAdminService.setPrice on
 * the backend) -- both providers' price objects are immutable once
 * created, so there is no "undo" on a save, only "set a new one." Existing
 * subscribers are never affected: this only changes what NEW checkouts are
 * offered.
 */
export default function AdminPricingPage() {
  const [rows, setRows] = useState<PriceRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PriceRow | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch<{ prices: PriceRow[] }>('/admin/pricing')
      .then((d) => setRows(d.prices))
      .catch((e: any) => setError(e?.message || "Couldn't load pricing."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const cell = (tier: PlanTier, currency: Currency, interval: BillingInterval): PriceRow | undefined =>
    rows?.find((r) => r.tier === tier && r.currency === currency && r.billingInterval === interval);

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Pricing</h1>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Changing a price here creates a real, new Stripe Price or Paystack Plan and applies to new checkouts
          immediately. Existing subscribers keep billing at whatever rate they signed up at.
        </p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      ) : error || !rows ? (
        <div className="p-10 max-w-md mx-auto text-center">
          <ShieldAlert className="h-6 w-6 mx-auto mb-3" style={{ color: 'var(--accent-error)' }} />
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error || 'Not available.'}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {TIERS.map((tier) => (
            <div key={tier} className="space-y-3">
              <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>{tier === 'PRO' ? 'Pro' : 'Agency'}</h2>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${CURRENCIES.length}, minmax(0, 1fr))` }}>
                {CURRENCIES.map((currency) => (
                  <div key={currency} className="exec-card card-pad space-y-3">
                    <p className="text-caption font-bold" style={{ color: 'var(--text-muted)' }}>
                      {currency} ({CURRENCY_SYMBOLS[currency]})
                    </p>
                    {INTERVALS.map((interval) => {
                      const row = cell(tier, currency, interval);
                      return (
                        <div key={interval} className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
                          <div>
                            <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
                              {interval === 'MONTHLY' ? 'Monthly' : 'Annual'}
                            </p>
                            <p className="text-body-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                              {row?.newUserAmount != null ? formatPrice(row.newUserAmount, currency) : row?.regularAmount != null ? formatPrice(row.regularAmount, currency) : '—'}
                            </p>
                            {row?.regularAmount != null && row.newUserAmount != null && row.newUserAmount !== row.regularAmount && (
                              <p className="text-caption line-through" style={{ color: 'var(--text-muted)' }}>
                                {formatPrice(row.regularAmount, currency)}
                              </p>
                            )}
                            <p className="text-caption" style={{ color: row?.source === 'database' ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                              {row?.source === 'database' ? `Live · set by ${row.updatedByEmail}` : 'Static default'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setEditing(
                                row || {
                                  tier,
                                  currency,
                                  billingInterval: interval,
                                  regularAmount: null,
                                  newUserAmount: null,
                                  source: 'static_config',
                                  providerObjectId: null,
                                  updatedByEmail: null,
                                  updatedAt: null,
                                },
                              )
                            }
                            className="btn-secondary p-2 rounded-[var(--radius-md)] touch-target"
                            aria-label={`Edit ${tier} ${currency} ${interval}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditPriceModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditPriceModal({ row, onClose, onSaved }: { row: PriceRow; onClose: () => void; onSaved: () => void }) {
  const [regularAmount, setRegularAmount] = useState(row.regularAmount != null ? String(row.regularAmount) : '');
  const [newUserAmount, setNewUserAmount] = useState(row.newUserAmount != null ? String(row.newUserAmount) : '');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const regular = Number(regularAmount);
    const newUser = newUserAmount.trim() === '' ? null : Number(newUserAmount);
    if (!Number.isFinite(regular) || regular < 0) {
      setError('Enter a valid regular price.');
      return;
    }
    if (newUser != null && (!Number.isFinite(newUser) || newUser < 0)) {
      setError('Enter a valid new-user price, or leave it blank.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/admin/pricing', {
        method: 'POST',
        body: JSON.stringify({
          tier: row.tier,
          currency: row.currency,
          billingInterval: row.billingInterval,
          regularAmount: regular,
          newUserAmount: newUser,
        }),
      });
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Could not save this price. Check that the required Stripe/Paystack setup (Product id / secret key) is configured.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="exec-card card-pad max-w-sm w-full space-y-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
        <div>
          <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>
            {row.tier === 'PRO' ? 'Pro' : 'Agency'} · {row.currency} · {row.billingInterval === 'MONTHLY' ? 'Monthly' : 'Annual'}
          </h3>
          <p className="text-caption mt-1" style={{ color: 'var(--accent-warning)' }}>
            This creates a new live {row.currency === 'NGN' ? 'Paystack Plan' : 'Stripe Price'}. New checkouts use it immediately; existing subscribers are unaffected.
          </p>
        </div>

        <label className="block">
          <span className="text-caption font-bold" style={{ color: 'var(--text-muted)' }}>Regular price (display "was" price)</span>
          <input
            type="number"
            min={0}
            value={regularAmount}
            onChange={(e) => setRegularAmount(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius-md)] border px-3 py-2 text-body-sm"
            style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }}
          />
        </label>

        <label className="block">
          <span className="text-caption font-bold" style={{ color: 'var(--text-muted)' }}>New-user price (leave blank for no promo -- this is the amount actually charged)</span>
          <input
            type="number"
            min={0}
            value={newUserAmount}
            onChange={(e) => setNewUserAmount(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius-md)] border px-3 py-2 text-body-sm"
            style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }}
          />
        </label>

        {error && <p className="text-caption" style={{ color: 'var(--accent-error)' }}>{error}</p>}

        <label className="flex items-start gap-2">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
          <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
            I understand this creates a real, live, irreversible {row.currency === 'NGN' ? 'Paystack Plan' : 'Stripe Price'} and confirm the amount above.
          </span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold touch-target">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!confirmed || saving}
            className="btn-primary-gradient px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold touch-target disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save price'}
          </button>
        </div>
      </div>
    </div>
  );
}
