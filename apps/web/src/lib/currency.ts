"use client";

/**
 * Best-effort visitor currency detection from signals the browser already
 * exposes -- no geo-IP API call, so it's free, has zero external
 * dependency, and works offline in local dev. This is NOT authoritative
 * (a VPN, a misconfigured OS locale, or a non-standard timezone will fool
 * it) -- it's meant for pre-selecting a marketing price and a checkout
 * currency, not anything that needs to be legally precise about where the
 * customer actually is. Must stay in sync with SupportedCurrency in
 * apps/api/src/billing/plans.config.ts.
 */
export type Currency = 'USD' | 'GBP' | 'NGN';

export const DEFAULT_CURRENCY: Currency = 'USD';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  GBP: '£',
  NGN: '₦',
};

// IANA timezones that map unambiguously to one of our priced countries.
const TIMEZONE_CURRENCY_MAP: Record<string, Currency> = {
  'Africa/Lagos': 'NGN',
  'Europe/London': 'GBP',
};

// Locale region codes (the part after the hyphen in e.g. "en-NG") as a
// second signal, used only if the timezone check didn't match.
const REGION_CURRENCY_MAP: Record<string, Currency> = {
  NG: 'NGN',
  GB: 'GBP',
};

/** Reads the browser's timezone/locale once and returns the currency to price in. Defaults to USD for every other location, per product decision. */
export function detectCurrency(): Currency {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone && TIMEZONE_CURRENCY_MAP[timeZone]) return TIMEZONE_CURRENCY_MAP[timeZone];
  } catch {
    // Intl.DateTimeFormat can throw in locked-down environments -- fall through to the locale check.
  }

  try {
    const locale = navigator.language || navigator.languages?.[0] || '';
    const region = locale.split('-')[1]?.toUpperCase();
    if (region && REGION_CURRENCY_MAP[region]) return REGION_CURRENCY_MAP[region];
  } catch {
    // navigator.language can be unavailable in some embedded/webview contexts.
  }

  return DEFAULT_CURRENCY;
}

/** Formats a whole-number price with the currency's symbol and locale-appropriate thousands separators, e.g. formatPrice(9900, 'NGN') -> "₦9,900". */
export function formatPrice(amount: number, currency: Currency): string {
  return `${CURRENCY_SYMBOLS[currency]}${amount.toLocaleString('en-US')}`;
}
