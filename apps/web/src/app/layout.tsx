import type { Metadata } from 'next';
import './globals.css';

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
