"use client";

import { useEffect } from 'react';
import { captureClientException } from '@/lib/sentry';

/**
 * Next.js App Router's required top-level error boundary -- catches render
 * errors that escape every nested error.tsx boundary. Reports to Sentry
 * (no-ops if NEXT_PUBLIC_SENTRY_DSN isn't set) so a crash is something we
 * find out about from a dashboard, not from a support ticket.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureClientException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-[#09090b] text-white">
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-sm text-zinc-400">
              An unexpected error occurred. It's been reported automatically. Try again, and if it keeps happening, let us know.
            </p>
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
