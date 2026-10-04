# Media processing migration

## Implemented locally

Registration persists the asset before publishing a QStash message addressed to
`POST /api/cron/process-media/:assetId`. The worker validates the cron secret,
derives brand ownership from the asset, and uses the Engine's atomic claim.
QStash flow control limits deliveries to one concurrent request and six starts
per minute. The recovery endpoint dispatches up to twenty eligible records;
it does not run twenty AI pipelines inside one function.

`processingIntent` separates single uploads from staged carousel files.
`processingStage`, `processingAttempts`, and `processingNextAttemptAt` persist
progress and retry eligibility. Automatic recovery stops after three attempts.
Existing pending records migrate to STAGED because their original intent is
unknown. A user can explicitly retry an existing single upload.

The Brain generates caption and hashtags in one structured response, validates
the output, and evaluates policy deterministically. Analysis fingerprints no
longer depend on mutable processing timestamps. Post creation checks ownership
and writes the media link in the same transaction as the post and its targets.
The browser polls durable status when SSE delivery is missed.

Optimization has a separate authenticated QStash endpoint and status field.
Direct uploads and Drive imports dispatch it independently from approval
generation, and the recovery sweep republishes missed or stale optimization
jobs. The original media remains the publishing fallback.

AI quota reservations are stored on the claimed asset with their billing
period. Reservation and usage increment commit together; failed or interrupted
attempts release the reservation idempotently, while successful post creation
clears the reservation marker and retains the consumed usage.

## Deployment requirements and remaining work

- Apply `20261001120000_media_processing_state`, then
  `20261004120000_media_ai_reservation`, before deploying this code.
- Configure QSTASH_TOKEN, CRON_SECRET, and the public APP_URL. None of the first
  two values are present in the inspected local environment files.
- Configure a QStash schedule calling `/api/cron/process-media` every minute
  with the forwarded cron secret. The daily Vercel cron remains a backstop;
  this change does not prove or create a live schedule.
- Native Gemini video understanding currently supports at most 14 MiB. The
  upload token, server registration, multipart upload, and Drive import paths
  all enforce that same limit before a processing job is created.
- The generation worker still has the existing 50-second pipeline deadline.
  Separate persisted analysis/generation stages into individual deliveries
  before describing the entire stage-resumable architecture as complete.
- Validate real QStash redelivery, provider cancellation, and reservation
  reconciliation against a staging database before production rollout.

No production migration, schedule change, or deployment was performed during
this implementation.
