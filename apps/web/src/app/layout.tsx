import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import AnalyticsInit from '@/components/analytics/AnalyticsInit';

/**
 * Oyinca typography system (luxury rebrand): Inter (product/UI/body) +
 * Playfair Display (display/brand headlines).
 *
 * Loaded once here at the root so every route -- dashboard, auth pages and
 * the marketing site -- shares one typographic identity. Both are fetched
 * via next/font/google, which downloads the files at build time and
 * self-hosts them from our own domain (no runtime request to Google) while
 * giving each a complete Latin glyph set and a real weight range.
 *
 * Replaces the previous Plus Jakarta Sans + Instrument Serif pairing as
 * part of the "premium/luxurious" landing-page rebrand: Inter reads as a
 * cleaner, more neutral workhorse sans at body sizes (leading-relaxed
 * paragraphs), and Playfair Display's high-contrast serif strokes read as
 * editorial/high-end at large display sizes in a way a geometric sans
 * can't. Variable names (--font-body-var / --font-display-var) are
 * unchanged from the prior pair so every existing var(--font-body-var) /
 * var(--font-display-var) reference across landing.css and the app keeps
 * working without a find-and-replace.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-body-var',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});

/**
 * PLAYFAIR DISPLAY is the display/brand face -- used for every major
 * landing-page headline (Hero, section headings, Final CTA) per the
 * luxury-rebrand brief, not just two isolated moments like the previous
 * Instrument Serif treatment. High-contrast serif strokes and a full
 * weight range (400-800) give it real presence at 5xl-7xl sizes without
 * tipping into a purely decorative display face.
 */
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: 'variable',
  style: ['normal', 'italic'],
  variable: '--font-display-var',
  display: 'swap',
  fallback: ['var(--font-body-var)', 'system-ui', 'serif'],
});

export const metadata: Metadata = {
  title: 'Oyinca: Your AI Social Media Manager',
  description: 'Oyinca is your AI Social Media Manager, powered by Turaab Technology. Give it your content and Oyinca creates, plans, schedules and publishes your TikTok content, with Google Drive content sourcing built in.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Oyinca: Your AI Social Media Manager',
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
      <body className={`antialiased ${inter.variable} ${playfairDisplay.variable}`}>
        <AnalyticsInit />
        {children}
      </body>
    </html>
  );
}
