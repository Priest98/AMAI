import Link from 'next/link';
import '@/styles/landing.css';

/**
 * Custom 404 page.
 *
 * Next.js renders its own generic, unstyled "404 / This page could not be
 * found." page for any unmatched route when no not-found.tsx exists at the
 * app root -- confirmed live on production (QA pass, Aug 2026): a visitor
 * hitting a dead link, an old bookmark, or a typo'd URL landed on a plain
 * black-on-white page with no branding, no nav, and no way back into the
 * site except the browser's back button. That's a real, user-facing gap on
 * an otherwise fully rebranded, dark/gold luxury site.
 *
 * Reuses the landing page's own design tokens (`.amai-landing` scope in
 * landing.css) rather than inventing a one-off palette, so this reads as
 * the same product a lost visitor just came from. Deliberately minimal --
 * no GSAP, no client component, no animation -- a 404 page's only job is to
 * load instantly and get someone back on track.
 */
export default function NotFound() {
  return (
    <div className="amai-landing min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--lp-bg)', color: 'var(--lp-text-primary)' }}>
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--lp-gold)' }}>
          404
        </p>
        <h1 className="lp-heading-display mt-4 text-3xl sm:text-4xl">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
          The link you followed may be broken, or the page may have moved. Let&apos;s get you back to Oyinca.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm lp-btn-primary lp-focus-ring"
          >
            Back to home
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-semibold lp-btn-ghost lp-focus-ring"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
