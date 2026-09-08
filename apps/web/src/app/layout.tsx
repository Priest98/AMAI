import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import AnalyticsInit from '@/components/analytics/AnalyticsInit';

/** Keep the existing font identity, served locally without build-time network requests. */
const inter = localFont({
  src: '../../../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--font-body-var',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});
const playfairDisplay = localFont({
  src: [
    { path: '../../../../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2', weight: '400 900', style: 'normal' },
    { path: '../../../../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-italic.woff2', weight: '400 900', style: 'italic' },
  ],
  variable: '--font-display-var',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
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
