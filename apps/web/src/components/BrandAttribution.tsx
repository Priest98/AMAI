import React from 'react';

/**
 * Company (not product) attribution. Oyinca is the customer-facing product
 * name and stays the star everywhere; Turaab Technology is the parent/company
 * brand behind it, surfaced subtly (small, muted, never bolded or sized to
 * compete with the Oyinca logo/wordmark) on auth and dashboard chrome per the
 * brand attribution spec's exact required wording -- always "Powered by
 * Turaab Technology", never a lowercase/abbreviated/altered variant.
 */
export default function BrandAttribution({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[11px] text-center ${className}`} style={{ color: 'var(--text-muted)' }}>
      Powered by Turaab Technology
    </p>
  );
}
