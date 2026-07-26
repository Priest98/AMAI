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
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/app-icon.jpg" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
