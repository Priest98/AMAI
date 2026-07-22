import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketing OS — AI-Powered Social Media Management",
  description: "Automate your social media content with AI captions, smart scheduling, and intelligent comment replies. Manage all your brands from one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
