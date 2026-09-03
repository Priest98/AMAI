# Production audit fixes

## Changes

- Caption generation fails explicitly when providers cannot return usable text. Existing engine error handling releases the reserved AI credit; the uploader displays failed processing.
- Groq recognizes numbered API keys, supports a `GROQ_MODEL` override, and aborts timed-out requests.
- Direct-upload tokens require access to the brand in the pathname and have a storage-based size limit. Registration checks authenticated Blob metadata, brand ownership, actual bytes and folder ownership. Re-registering a known upload returns its existing record.
- Publishing waits for both pending and actively publishing destinations before finalizing. Failed destinations retain originals for retry. TikTok originals remain stored because upload acceptance does not confirm completion of its asynchronous download.
- Retrying a failed post runs publishing preflight first.
- Metrics refresh TikTok credentials and resolve publishing job IDs to public video IDs before matching engagement. TikTok API errors no longer look like empty successful responses.
- Integration cards use the same derived connection health as the dashboard. Browser storage alone cannot establish a connection.
- On Vercel, the loopback API trusts the local proxy so rate limits distinguish client IPs.
- Builds enforce TypeScript checks and no longer run `prisma db push --accept-data-loss`. No database migration was applied.
- Billing usage links say “View plan options” instead of asking existing Pro subscribers to upgrade to Pro.

## Verification

Ten isolated regression tests cover failed AI output, in-flight publishing, partial failure, asynchronous TikTok media retention, upload ownership, byte verification and quota accounting, plus TikTok ID resolution and API errors. Run `npm test` from the repository root.

API and web TypeScript checks passed. The web production build passed using its workspace-local Next.js 15.5.21 executable and generated all 43 pages; it retained an image-library bundling warning. The full lint scan still reports 200 errors; its existing build bypass remains enabled. The unrelated document and untracked files present before this work were preserved.

## Live follow-up

These are local code changes, not a deployment. No existing post was retried or published, and no further paid generation was performed.

After deployment, verify the AI provider configuration with one controlled generation, verify TikTok token refresh and metrics for a public post, and review failed posts before individually retrying them. Historical content and previously charged credits were not modified.

TikTok private posts may not provide public video IDs or engagement data. Retained originals continue using storage; a later cleanup policy should confirm provider completion before deleting them. The application still needs a complete asynchronous TikTok publication-status lifecycle; an accepted publishing job is not proof of public availability.

Future schema changes need reviewed migrations. Baseline the existing database before introducing a migration deployment step; do not restore destructive schema synchronization in the application build.

References: [TikTok publishing status](https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status), [Groq models](https://console.groq.com/docs/models), [Vercel request headers](https://vercel.com/docs/headers/request-headers).
