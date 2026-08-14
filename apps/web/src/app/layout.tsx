import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import AnalyticsInit from '@/components/analytics/AnalyticsInit';

/**
 * AMAI typography system: Morrison (product) + Kugile (brand).
 *
 * Loaded once here at the root so every route -- dashboard, auth pages and
 * the marketing site -- shares one typographic identity, and self-hosted via
 * next/font/local (both faces are licensed files, neither exists on Google
 * Fonts). next/font inlines the @font-face, preloads the file and gives it a
 * stable CSS variable, so no component loads a font itself.
 *
 * MORRISON drives both --font-body-var and --font-heading-var: only the
 * Regular (400) file was supplied, so there is deliberately no separate
 * heading face and no weight array claiming weights the file doesn't
 * contain. adjustFontFallback lets Next compute fallback metrics to reduce
 * layout shift while the face loads.
 */
const morrison = localFont({
  src: [{ path: '../fonts/Morrison-Regular.otf', weight: '400', style: 'normal' }],
  variable: '--font-body-var',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});

/**
 * KUGILE is the display/brand face, used sparingly (hero headline and a
 * small number of marketing headings) so it stays a moment of contrast
 * rather than the page's default voice.
 *
 * IMPORTANT CONSTRAINT -- the supplied Kugile_Demo.ttf maps only 53 glyphs:
 * A-Z, a-z and space. It contains NO digits and NO punctuation (not even a
 * period, comma, apostrophe or ampersand). Any character outside A-Za-z will
 * silently fall back to Morrison mid-word, so Kugile must only be applied to
 * letters-only strings. The fallback below is Morrison rather than a system
 * font so that when a stray character does fall through, it lands on the
 * product face instead of Times New Roman.
 */
const kugile = localFont({
  src: [{ path: '../fonts/Kugile-Regular.ttf', weight: '400', style: 'normal' }],
  variable: '--font-display-var',
  display: 'swap',
  fallback: ['var(--font-body-var)', 'system-ui', 'serif'],
});

export const metadata: Metadata = {
  title: 'AMAI',
  description: 'AMAI is an intelligent AI operating system for social media automation, content syncing from Google Drive, and automated publishing to Instagram & TikTok.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'AMAI',
    description: 'Automate your content pipeline from Google Drive to Instagram & TikTok.',
    url: 'https://marketing-os-eight-virid.vercel.app',
    siteName: 'AMAI',
    images: [
      {
        url: 'https://marketing-os-eight-virid.vercel.app/app-icon.jpg',
        width: 1024,
        height: 1024,
        alt: 'AMAI Icon',
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
      <body className={`antialiased ${morrison.variable} ${kugile.variable}`}>
        <AnalyticsInit />
        {children}
      </body>
    </html>
  );
}
