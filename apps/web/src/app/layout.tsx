import type { Metadata } from 'next';
import { Space_Grotesk, Inter, Bebas_Neue } from 'next/font/google';
import './globals.css';
import AnalyticsInit from '@/components/analytics/AnalyticsInit';

// Design System v2: loaded once, app-wide, at the root so every route --
// dashboard, auth pages, and the marketing site -- shares one typographic
// identity. Previously the dashboard's CSS referenced a font named 'Geist'
// that was never actually loaded anywhere as a webfont (only the landing
// page loaded real fonts, scoped to its own --lp-font-* variables), so the
// entire authenticated app was silently rendering in the browser's system
// font this whole time. globals.css consumes these as --font-heading-var /
// --font-body-var.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-heading-var',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body-var',
  display: 'swap',
});
// Bold condensed display face, used only for hero-scale headlines
// (globals.css's .text-display / .text-display-giant) -- synthesized from
// the reference moodboard's dramatic oversized hero typography, kept
// separate from Space Grotesk so regular headings stay readable at UI
// sizes while hero copy gets the poster-style treatment.
const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display-var',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AMAI — AI Social Media Automation',
  description: 'AMAI is an intelligent AI operating system for social media automation, content syncing from Google Drive, and automated publishing to Instagram & TikTok.',
  openGraph: {
    title: 'AMAI — AI Social Media Automation',
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
        <link rel="icon" href="/app-icon.jpg" />
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
      <body className={`antialiased ${spaceGrotesk.variable} ${inter.variable} ${bebasNeue.variable}`}>
        <AnalyticsInit />
        {children}
      </body>
    </html>
  );
}
