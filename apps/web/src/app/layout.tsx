import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';
import AnalyticsInit from '@/components/analytics/AnalyticsInit';

/**
 * Oyinca typography system: Plus Jakarta Sans (product/UI) + Instrument Serif
 * (display/brand).
 *
 * Loaded once here at the root so every route -- dashboard, auth pages and
 * the marketing site -- shares one typographic identity. Both are fetched
 * via next/font/google, which downloads the files at build time and
 * self-hosts them from our own domain (no runtime request to Google, same
 * privacy/perf profile as self-hosting manually) while giving each a
 * complete Latin glyph set and a real weight range.
 *
 * This replaces the previous Morrison + Kugile pair (audit findings, see
 * project history):
 *   - Kugile-Regular.ttf was licensed as a demo/trial file and, confirmed
 *     via direct font inspection, mapped only 53 glyphs -- A-Z, a-z, space
 *     -- with NO digits or punctuation. Any heading containing a period,
 *     comma or number silently fell back to the body face mid-word.
 *   - Morrison-Regular.otf was a single static weight (400 only, confirmed
 *     via font inspection -- no fvar/variable axis). Every `font-bold` /
 *     `font-semibold` utility in the app was therefore rendering as
 *     browser-synthesized ("faux") bold, not a real bold weight.
 * PLUS JAKARTA SANS drives --font-body-var across a full weight range
 * (400-800), so bold/semibold text renders with an actual bold face instead
 * of synthetic bolding.
 */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body-var',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});

/**
 * INSTRUMENT SERIF is the display/brand face, used sparingly (hero headline
 * and the final-CTA headline) so it stays a moment of contrast rather than
 * the page's default voice -- a condensed editorial serif built for large
 * sizes, which reads as premium/sophisticated without tipping into the
 * more decorative end of the display-serif spectrum (Playfair, Bodoni).
 * Full Latin glyph coverage (digits, punctuation) unlike Kugile, so no
 * character-set restriction on what copy can use it.
 */
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display-var',
  display: 'swap',
  fallback: ['var(--font-body-var)', 'system-ui', 'serif'],
});

export const metadata: Metadata = {
  title: 'Oyinca — Your AI Social Media Manager',
  description: 'Oyinca is your AI Social Media Manager, powered by Turaab Technology. Give it your content and Oyinca creates, plans, schedules and publishes your TikTok content -- with Google Drive content sourcing built in.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Oyinca — Your AI Social Media Manager',
    description: 'Give Oyinca your content. It creates, plans, schedules and publishes your TikTok content while you focus on your business.',
    // Production domain migrated from amai.codes to oyinca.com (the
    // brand-matching domain, purchased after the Oyinca rebrand). amai.codes
    // is kept configured as a redirect to this domain in Vercel's project
    // domain settings rather than removed, so old links/bookmarks still
    // resolve -- but every URL Oyinca itself generates should point at
    // oyinca.com, since a stale or inconsistent domain reference is exactly
    // what a TikTok reviewer or link-preview crawler would flag.
    url: 'https://oyinca.com',
    siteName: 'Oyinca',
    images: [
      {
        url: 'https://oyinca.com/app-icon.jpg',
        width: 1024,
        height: 1024,
        alt: 'Oyinca Icon',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon is set via metadata.icons (/icon.svg) above — a manual
            <link> here previously pointed at a .jpg, which several browsers
            and automated crawlers (e.g. TikTok's app reviewer) don't reliably
            render as a browser-tab favicon. */}
        {/*
          Applies the saved theme to <html> before first paint so both the
          CSS-variable theme AND Tailwind's `dark:` utilities agree on
          light/dark — previously <html> was hardcoded to "dark" forever,
          which silently broke Light Mode for any component using Tailwind
          dark: classes. Defaults to dark to match the product's prior look.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('marketing_os_theme');document.documentElement.classList.add(t==='light'?'light':'dark');}catch(e){document.documentElement.classList.add('dark');}`,
          }}
        />
      </head>
      <body className={`antialiased ${plusJakartaSans.variable} ${instrumentSerif.variable}`}>
        <AnalyticsInit />
        {children}
      </body>
    </html>
  );
}
