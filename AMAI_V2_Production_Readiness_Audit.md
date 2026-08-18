# AMAI V2 — Full Production Readiness Audit

**Scope:** Can AMAI reliably support ~200 users (150 active, 100 on AutoPilot, 50-100 scheduling) within the next 2 months, without reliability, performance, security, or runaway-cost problems?

**Method:** Direct code inspection across the whole monorepo (`apps/web` — Next.js frontend + API proxy; `apps/api` — NestJS backend running in-process inside a Vercel serverless function, 60s hard cap; Postgres via Supabase/Prisma; Vercel Blob for media; Groq + Gemini for AI). Every claim below is grounded in an actual file/line read, not inferred from naming or assumed from common SaaS patterns. Where something couldn't be verified from code alone (e.g. live env var values, actual production traffic), that's stated explicitly rather than guessed.

**Rule followed throughout this document: no code was modified during this audit.** Four quick fixes (brand-scoped opportunistic publish, bounded publish concurrency, spread AI-key round robin, and a scheduling-slot unique constraint + retry) were implemented, typechecked, and committed *before* this audit began, at the user's explicit direction ("begin, and after that do this audit"). Everything from here down is analysis only.

---

## 1. Understanding the Existing System

**Deployment model.** There is no standalone NestJS server. `apps/web/src/app/api/[...path]/route.ts` is a Next.js catch-all Route Handler (`maxDuration = 60`) that proxies every `/api/*` request to a NestJS app booted in-process via `apps/web/src/lib/backendPort.ts`. This exists because Vercel's `framework: "nextjs"` mode reserves the entire `/api/*` namespace, so NestJS can't run as a sibling serverless function. `backendPortPromise` is cached per warm instance only — every cold start boots a fresh NestJS app, fresh Prisma Client, fresh in-memory state (round-robin counters, key-health cache, etc.).

**Data flow, real not assumed:**
- **Upload → AI pipeline:** `MediaController`/`MediaService` accepts an upload (small files through the NestJS function; anything that would exceed Vercel's ~4.5MB body limit goes client-direct to Vercel Blob via `@vercel/blob/client`, confirmed in `apps/web/src/app/api/media-upload-token/route.ts`). `EngineService.handleMediaUploaded` → `processMediaAsset` runs vision analysis → caption generation → hashtag generation (all via `AiGatewayService`, Groq-first/Gemini-fallback) → `SchedulingService.assignNextSlot` → `Post` creation, all inside one request, bounded by `PIPELINE_TIMEOUT_MS = 50_000` to stay under Vercel's 60s ceiling.
- **Scheduling:** `SchedulingService.assignNextSlot` reads `PlatformPostingSlot` (a DB-configured best-times table per platform), finds the next free slot respecting `postsPerDay`, then `EngineService` creates the `Post` row.
- **Publishing:** No persistent worker/queue exists — deliberately removed historically because Vercel functions can't host one (`apps/api/src/queue/queue.module.ts` documents this: BullMQ + Redis was tried and abandoned). Publishing is driven by (a) Vercel Cron hitting `/api/cron/publish-due`, and (b) "opportunistic publish" — `PublishingService.publishDuePosts()` runs inline on every `GET /posts`/`GET /posts/stats` call, i.e. every dashboard load.
- **Cron cadence — verified against Vercel's current docs:** Hobby plan cron jobs fire **once per day only**, with an imprecise ±59-minute window. Pro plan ($20/mo) drops the minimum interval to once per minute. `vercel.json` currently defines exactly two crons at `0 12 * * *` and `0 13 * * *` — consistent with Hobby tier. This is a real, already self-documented constraint in the code (`posts.service.ts` explicitly explains opportunistic-publish exists *because of* this).
- **Auth/authz:** JWT (Passport strategy, fails closed at boot if `JWT_SECRET` unset). No global auth guard — applied per-controller via `@UseGuards(JwtAuthGuard, BrandAccessGuard)`. Authorization for almost every resource is enforced by re-checking brand/organization membership against the DB on each request (`BrandAccessGuard`, plus hand-rolled equivalents in `OAuthController`). **Supabase Row Level Security is confirmed disabled on every table** (self-documented in `apps/api/src/engine/supabase-realtime.service.ts`), and Prisma connects via the `postgres` superuser role, which bypasses RLS even if it were enabled — meaning 100% of tenant isolation rests on the NestJS application code, with no database-level backstop.
- **Storage:** Vercel Blob. Original media is deleted from Blob once a post successfully publishes ("the platform has its own copy now") — confirmed AMAI does *not* accumulate a permanent media archive for successfully published content. Failed/unpublished/never-approved media has no expiry.
- **Social platforms:** Instagram and TikTok, both OAuth-based, tokens AES-256-GCM encrypted at rest (`EncryptionService`). Publishing for both routes through one function, `publishOne`, gated by an atomic compare-and-swap claim on `PostTarget.status`.
- **Google Drive sync:** A cron-triggered per-brand sync (`/api/cron/sync-drive`, once daily) lists new Drive files, dedupes via a `DriveSyncLog` unique constraint, downloads, and feeds each file through the same AI pipeline as a manual upload.
- **AI providers:** Groq (primary, 14,400 req/day free tier) and Gemini (fallback, small free tier), selected via `AiGatewayService`, with a multi-key round-robin + health/cooldown system (`ApiKeyManagerService`) for Groq specifically. No paid-tier fallback exists — if every key on every provider is exhausted, the app falls back to static template captions/hashtags, not a paid API call.
- **Billing:** Stripe and Paystack, webhook-verified (HMAC, official SDK), idempotent via a `BillingWebhookEvent` unique-constraint dedup table.
- **Email:** Plain SMTP via `nodemailer` (works with Gmail SMTP + an app password, or any SMTP host) — **not** a transactional email provider like Resend or Postmark. No email-sending infrastructure decision is needed today because none is in use; but if the SMTP account is a plain Gmail account, that has a real practical sending cap (historically ~500/day) worth being aware of well before 200 users all trigger welcome/reset emails.
- **Logging/error-tracking:** Sentry is wired both server-side (`main.ts`, a global `SentryExceptionFilter`) and client-side, gated on DSN env vars (whether it's actually capturing in production depends on whether those are set — not verifiable from code).
- **Deployment config:** Vercel, `maxDuration: 60` on the catch-all API route, two daily crons, no other infra config found.
- **Third-party deps:** Prisma/Postgres (Supabase), Vercel Blob, Groq SDK, Google Generative AI SDK (Gemini), Google APIs (Drive), Stripe, Paystack, nodemailer, Sentry, PostHog (frontend analytics), sharp (image processing), fluent-ffmpeg/ffmpeg-static/ffprobe-static (video — currently gated off by default, see §7).

---

## 2. Codebase Audit (Duplication, Dead Code, Unused Deps, Race Conditions, N+1s, Validation)

**Unused dependencies — confirmed, safe to remove:**
- `bullmq` and `@nestjs/bullmq` (`apps/api/package.json`): zero imports anywhere. `queue.module.ts` explicitly documents that BullMQ+Redis was tried and abandoned because Vercel serverless can't host the persistent worker it requires. Never removed from `package.json`. **DELETE.**
- `passport-oauth2`: zero references outside `package.json` — leftover from an earlier, since-replaced OAuth implementation. **DELETE.**
- Everything else spot-checked (17 API deps, 7 web deps including Sentry, PostHog, framer-motion, lucide-react) has live call sites. No further dead dependencies found.

**Dead code:** No unused exported services/controllers found — everything is wired into a module. No disabled-logic comment blocks found (comments in this codebase are consistently rationale/prose, not commented-out code). A `.orphan-trash/` directory exists at repo root but is already gitignored and untracked — evidence of a prior cleanup pass, not a live issue.

**Duplication (real, low-severity):**
- Timezone-validity check (`try { Intl.DateTimeFormat(...) } catch`) duplicated verbatim in `scheduling.service.ts` and `engine.service.ts`.
- Brand-membership authorization query duplicated between `BrandAccessGuard` and `OAuthController.assertBrandAccess` — same security-critical Prisma where-clause maintained in two places (the OAuth controller's own comment explains this is because it takes `brandId` from query/body rather than a route param the guard can read, so it's not careless — but it is a real double-maintenance risk if the membership rule ever changes).

**N+1 / sequential-await patterns (real, one significant):**
- `engine-jobs.service.ts`'s Google Drive sync (`syncOneConfig`) does a fully sequential per-file loop: dedup check → download → upload → DB create → full AI pipeline, one `await` chain per file, no batching or bounded concurrency. For a brand with a large new-file backlog, this risks running long inside a function that also has the 60s ceiling. The rest of the codebase (admin dashboard, brands service, usage service) consistently uses the correct batch-then-tally pattern — this Drive-sync loop is the exception, not the rule.
- `scheduling.service.ts`'s slot search has nested sequential awaits too, but it's already bounded by an explicit 15s search deadline and a 120-day cap, and is clearly a deliberate, reasoned design (heavily commented) rather than an oversight.

**Missing input validation — real, the most concrete finding here.** `main.ts` sets a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, but that only validates `class-validator`-decorated DTO classes. Only `auth/dto.ts` and one Business Brain DTO actually use that pattern. Several POST/PATCH endpoints instead type `@Body()` as an inline TypeScript object literal, which the pipe silently skips — meaning **zero runtime validation**, not weaker validation, on: `posts.controller.ts` (`createPost`, `approvePost`, `editPost` — caption/hashtags/scheduledAt/targets all unchecked), `media.controller.ts`'s `registerAsset` (partially mitigated by manual re-validation in the service, but `size`/`filename` remain unchecked), `engine.controller.ts` (config updates, and raw enum strings taken from the client with no membership check against the actual enum), `brands.controller.ts` (`name` unchecked for length/emptiness), `auth.controller.ts` (onboarding body unchecked). This isn't a style nit — `forbidNonWhitelisted` gives a false sense of coverage that doesn't actually extend to these routes.

**Frontend performance:**
- `dashboard/page.tsx` already fixed a real problem (its own comment documents replacing 6 requests / 3 full-payload list fetches with 3 requests / a counts-only `/posts/stats` call).
- `dashboard/analytics/page.tsx` still has the **exact pre-fix pattern the dashboard page already solved**: 4 parallel full `/posts?status=X` list fetches (each capped at 300 rows, but each row carries nested `targets` + `media.asset` payloads) purely to read `.length` off each. `getStats` doesn't currently return a failed-count, which is likely why Analytics wasn't switched over — adding one field is trivial next to shipping four full nested-payload fetches on every Analytics page load.
- No unbounded/unpaginated fetches, no heavy client bundles (no moment.js/chart-lib/PDF-lib bloat), no client-side fetch waterfalls elsewhere.
- No `setInterval`-style polling found anywhere in the frontend — but the SSE connection powering live dashboard updates (`EngineEventsContext` → `GET /engine/events`) self-terminates every 50 seconds (intentional, to stay under the 60s function cap) and the browser auto-reconnects — functionally this is 50-second polling wearing an SSE costume, standing up a fresh Supabase Realtime channel each cycle for every open dashboard tab. Deliberate tradeoff given Vercel's constraints, but a real cost/connection-count line to watch at scale (see §14).

---

## 3. 200-User Scale Test

Assumptions stated explicitly per the brief: 200 registered / 150 active / 100 on AutoPilot / 50-100 actively scheduling.

**Concurrent requests:** No app-level concern found — NestJS/Vercel serverless scales horizontally by design; the only shared bottleneck is the database connection pool (see DB below), which is already correctly configured for pooled/serverless use.

**Concurrent AI jobs:** Bounded per-request by `AiGatewayService`'s 10s per-call timeout and a max-3-key-attempts-per-provider cap. The real risk fixed this session was thundering-herd on Groq key #1 across many concurrent cold Lambda instances (each previously defaulting its round-robin start to 0); that's now randomized per-instance. Estimated aggregate call volume at 200 users (roughly 15 uploads/user/month × 3 AI calls each) is ~9,000 calls/month — comfortably inside Groq's 14,400/day free tier in raw count, contingent on the key pool being wide enough to avoid per-key TPM limits during a burst (already has a differentiated, short TPM-specific cooldown for this).

**Concurrent publishing (30 posts due at once):** This session's fix (bounded 5-way concurrency + 45s pass deadline in `publishDuePosts`, safe specifically because the existing `PostTarget` atomic claim prevents double-publish under concurrency) should comfortably clear a 30-post batch inside one pass. Not load-tested live — no way to simulate genuine concurrent traffic from this sandbox — but the mechanism is sound by construction, not by hope.

**Google Drive sync at scale:** The sequential per-file loop (§2) is the one part of the system that hasn't been reasoned through for volume — a brand with many new files could push a single sync invocation close to the function's time ceiling. Bounded risk (per-file try/catch means partial failure doesn't cascade), but not scale-tested.

**Database:** `PrismaService` already forces `pgbouncer=true&connection_limit=1` onto the pooled connection string — correct for serverless + Supabase pgbouncer, verified. Aggregate concurrent-connection ceiling at 200 users depends on the actual Supabase plan tier, which isn't visible from this sandbox — Supabase Pro ($25/mo) includes an 8GB database and a base compute tier; whether that's enough headroom for 200 users' query volume is a fact to confirm against the live project, not something code alone can answer. Indexes are generally well-targeted to real query patterns (not blanket over-indexed) — `idx_post_brand_status`, `idx_post_brand_scheduled_at` (new), `idx_org_member_user`/`org` all map to real hot-path queries. One possible gap (unconfirmed, flagged honestly rather than guessed): `PendingCommentReply` lookups by `platformAccountId`/`originalCommentId` for webhook-triggered reply dedup may lack a supporting index — didn't have time to confirm whether that exact query pattern exists.

**Storage:** Vercel Blob usage should stay modest given the confirmed publish-time cleanup, *except* for a real leak: `OptimizedMediaAsset` blobs (per-platform re-encoded copies / thumbnails) are never deleted when their parent asset is deleted or when a post publishes — only the DB rows cascade-delete, not the actual Blob files. Currently low real-world impact because video transcoding is gated off by default (`MEDIA_OPTIMIZATION_VIDEO_TRANSCODE` unset), so today most assets never generate an `OptimizedMediaAsset` in the first place — but this becomes a real, unbounded leak the moment that feature is turned on. No storage-quota enforcement exists at upload time either (tracked for billing display, never used as a blocking guard) — see §7.

**Third-party API failure/timeout/rate-limit behavior:** Instagram and TikTok publish calls have real, provider-specific error parsing and a working retry-to-next-cron-pass mechanism, but **no differentiation in backoff timing** between a 429 (should retry soon) and a permanent 4xx content-policy rejection (will never succeed) — both currently get the same "released back to PENDING, picked up next pass" treatment, which for the current once-daily cron means up to ~24h between retries regardless of whether the error was transient or permanent.

---

## 4. AutoPilot Audit

**Explicit answer: NOT YET — one concrete, unfixed gap prevents a clean yes.**

Everything downstream of a `Post` row being created (publishing itself) is genuinely solid: the `PostTarget` atomic claim (conditional `updateMany`, stale-claim reclamation after 10 minutes) makes concurrent publish attempts safe by construction, confirmed still wired correctly through both the Instagram and TikTok code paths, not a partial implementation.

The gap is upstream, in **media processing**: `EngineService.processMediaAsset` marks a `MediaAsset` `PROCESSING` via a plain `update()` — not a conditional/atomic claim like `PostTarget` has. `handleMediaUploaded` is triggered from three separate places (initial upload, a stale-processing self-heal sweep that runs on *every* Media Library page load, and Drive sync), with no coordination between them. Because `PostMedia`'s primary key is `(postId, assetId)` — not unique on `assetId` alone — nothing in the schema stops the same media asset from being independently picked up twice and linked to two different `Post` rows at two different scheduled times. If both runs land while AutoPilot mode is set to auto-approve, **both resulting posts will genuinely, independently auto-publish to the customer's real Instagram/TikTok account** — an actual duplicate public post, plus double-counted usage. This is a real double-execution risk, not a theoretical one, and it's exactly the class of bug the user's brief calls out by name as P0-worthy ("duplicate publishing").

Restart/outage survival is partially covered: a hung in-process pipeline is caught by its own 50s internal timeout well before Vercel's 60s hard kill, and falls back cleanly to `MediaStatus.FAILED`. But a genuine process-level kill (mid-deploy, OOM) leaves nothing running — the timer dies with the process — and recovery then depends entirely on someone loading the Media Library page to trigger the stale-sweep, since no cron exists for stuck media (only `publish-due` and `sync-drive` are cron-covered). A stuck asset in a brand nobody checks can sit forever.

Every individual external call in the pipeline (AI calls, platform polling) is independently timeout-bounded — no evidence of a single hung call silently blowing the budget.

**Bottom line:** publishing is reliable; getting a `Post` created from an upload in the first place has one real concurrency hole. This is fixable without new infrastructure (an atomic claim on `MediaAsset`, same pattern already proven on `PostTarget`) — see the P0 list in §18.

---

## 5. Queue / Background Job Audit

Four options, scored against the ground truth that (a) the existing atomic claims already make sweep-based publishing *correctness*-safe at any frequency, and (b) the only real gap is *frequency*, not throughput or safety:

| Option | Reliability | Complexity | Cost | Scalability | Maintenance | Verdict for 200 users |
|---|---|---|---|---|---|---|
| **A — current, as-is (Hobby cron, once/day + opportunistic publish)** | Weak for inactive brands — a post scheduled at 2am with nobody's dashboard open can sit up to ~24h past due, self-documented in the code as an already-known limitation | Lowest (nothing to build) | $0 | Throughput within one pass is already fine (5 concurrent workers, 45s deadline, comfortably clears a 30-post batch) — the gap is purely about *how often* a pass runs | Lowest | Not sufficient — real user-visible delay |
| **B — current + Vercel Pro cron (1-5 min interval)** | Closes the 2am gap to ≤1-5 min worst case, using code that already exists and is already correctness-safe at any frequency | Zero new code, zero new services | $20/month flat | Same throughput headroom as A, just triggered far more often | Same as A | **Recommended.** Solves the actual identified gap with no new infrastructure, no new secrets, no new failure surface |
| **C — current + Upstash QStash (push-based, exact-instant delivery)** | Would deliver at-the-instant publishing and remove reliance on sweeping entirely | New external dependency; new webhook endpoint to secure and keep verified (this codebase already has one real precedent for a webhook shipping *without* signature verification — TikTok's, see §9 — a caution about how easily a new callback endpoint could repeat that mistake under time pressure); new idempotency-key plumbing to re-derive from scratch | Usage-based, non-zero | No meaningful scalability advantage over B at this volume — no queue-depth problem exists today (max 50 due posts per pass) | Higher — new service to monitor, rotate keys for, and reason about | **Not justified at 200 users.** Solves a problem Option B already solves for $20/month |
| **D — other** | — | — | — | — | — | No evidence found justifying anything beyond B; no queue-depth, no fan-out, no delivery-guarantee gap that a $20/month cron upgrade doesn't already close |

**Recommendation: Option B.** Upgrade to Vercel Pro (needed anyway for other reasons — see §15) and drop the cron interval to 1-5 minutes. This is "the simplest option that is actually sufficient," not a default to the fashionable choice — Upstash was deliberately *not* recommended because nothing in this audit surfaced a problem it uniquely solves at this scale.

---

## 6. AI Cost Audit

**Operations found (all through `AiGatewayService.generate`):** vision/image analysis (`maxTokens: 30` requested, but Groq's "thinking" model floors every call at `MIN_TOKENS = 600` internally regardless of what's requested — real token cost is meaningfully higher than the requested caps imply), caption generation (300), hashtag generation (300), content-idea suggestions for Business Brain (500). "Best posting time" is a pure heuristic — **no AI call at all**, despite the name.

**Caching:** none exists anywhere in the AI layer. A retried/re-run pipeline re-triggers vision analysis from scratch every time.

**Necessity/cacheability:** vision analysis and caption/hashtag generation are all genuinely per-asset and not meaningfully cacheable (each is unique content). The Business Brain content-idea suggestions are a better caching candidate if that feature sees repeat calls with similar inputs, but wasn't confirmed as a hot path.

**Enforcement — real, but with confirmed gaps.** A hard entitlement guard (`EntitlementGuard` + `@RequireEntitlement`) genuinely blocks the AI pipeline pre-flight once a brand's monthly quota (Free 10 / Pro 300 / Agency 2000) is exhausted — this isn't just a display counter, it throws before the handler runs. But it's only wired to two of the entry points that actually trigger AI spend: the direct "process asset" endpoint and Business Brain. Two other paths call straight into the engine pipeline **without** going through the guard: the stale-processing self-heal sweep (runs on every Media Library page load) and Google Drive sync (runs daily via cron, and on-demand via a "Sync Now" button). Usage still gets *recorded* after the fact on these paths, so billing numbers aren't wrong — but a brand already at or over its cap can still trigger real AI spend through these two side doors, which is a real, if narrow, quota-enforcement gap. Vision-analysis calls specifically aren't counted toward the quota at all (only caption+hashtag pairs are) — meaning a user can churn vision calls essentially for free from a quota-accounting standpoint, while still consuming real provider capacity.

**Rough monthly cost projection** (assumptions stated: ~15 uploads/user/month, 3 AI calls per upload at Groq's real ~600-900 token floor per call):

| Users | Est. AI calls/month | Groq free-tier headroom (14,400/day = ~432,000/month) | Est. cost |
|---|---|---|---|
| 10 | ~450 | Trivial fraction | $0 |
| 50 | ~2,250 | Trivial fraction | $0 |
| 100 | ~4,500 | ~1% of monthly capacity | $0 |
| 200 | ~9,000 | ~2% of monthly capacity | $0 |

At these volumes, provider cost is very likely $0 as long as (a) the Groq free tier holds at its current generosity and (b) the key pool is wide enough that per-key *per-minute* limits (not the daily cap) don't get hit during a synchronized burst — which is exactly the thundering-herd risk this session's key-manager fix targeted. Gemini is pure fallback capacity, not load-bearing. **This is the one area of the whole audit where the numbers say "don't worry about it yet."**

**Abuse scenario:** frontend upload concurrency is capped at 3, but processing-trigger calls are fired without server-side rate limiting per burst — a large burst upload (hundreds of files) can fan out many concurrent AI pipeline runs. For Free-tier brands the monthly quota (10) caps real damage quickly. For Pro/Agency (300/2000), nothing throttles the *rate* of consumption within a single day — a burst upload could burn a whole month's quota in one sitting, which is a UX/fairness problem for that customer more than a cost risk to AMAI (Groq calls are still free at this volume either way).

**Recommendation:** close the two entitlement-bypass paths (Drive sync, stale sweep) so quota enforcement is consistent everywhere AI spend can be triggered; consider adding vision calls to the counted quota; no need for model routing, response caching, or a paid AI tier at 200-user scale based on what the numbers show today.

---

## 7. Storage Audit (Vercel Blob)

**Limits:** client-side cap of 500MB per file (a "generous sanity limit," not a hard technical ceiling) is enforced in the uploader; the server-side token-issuing route validates MIME type but not size — meaning size is trusted, not verified, at the point Blob actually accepts the upload. File-type allowlist is duplicated across three places (uploader, token route, service) and kept manually in sync.

**Growth/lifecycle — better than a plausible worst-case assumption, with one real leak:**
- Media for **successfully published** posts is explicitly deleted from Blob right after publish confirmation — the code's own reasoning is "the platform has its own copy now." **AMAI is not, today, silently becoming a permanent video-hosting service for published content** — this was a real risk worth checking and it's confirmed not to be happening.
- What *is* leaking: `OptimizedMediaAsset` rows (per-platform re-encoded copies, thumbnails) cascade-delete in the database when their parent asset is deleted, but the actual Blob files behind them are never explicitly deleted on either the manual-delete path or the publish-cleanup path. Currently low real-world impact only because video transcoding is off by default — becomes a genuine unbounded leak the moment it's turned on.
- Media that's uploaded but never approved/published/deleted has no expiry at all — by design, since users may come back and retry — but there's also no visibility into how much of this exists, and no cleanup cron.
- No dedup on direct re-uploads — re-uploading an identical file creates a new asset and a new Blob object every time (Drive sync, by contrast, does dedupe correctly via a DB unique constraint).
- No storage quota enforcement at upload time — usage is computed and displayed on the billing page but never checked before accepting an upload, so a brand can exceed its plan's storage allotment indefinitely.

**Recommendation: fix the leak and wire up the existing (already-computed) quota check as a real guard — both are code-level fixes, not infrastructure changes.** Nothing found here justifies moving off Vercel Blob to Cloudflare R2 — actual usage patterns (aggressive cleanup on publish, video transcoding currently off) don't come close to the volume where R2's pricing advantage would matter, and introducing it now would be exactly the kind of "common in scalable SaaS" infrastructure the brief explicitly warns against adding without genuine need.

---

## 8. Social Media API Audit

**OAuth/token handling:** genuinely encrypted at rest (AES-256-GCM, random IV per value), fails closed at boot if the encryption secret is missing. Solid.

**Refresh — asymmetric, a real gap.** TikTok has proactive refresh built into the publish path itself (refreshes if within 10 minutes of expiry) plus a reactive one-shot retry on an auth-shaped error. Instagram does not — its refresh function exists but nothing calls it proactively; a long-lived Instagram token nearing its ~60-day expiry is only "rescued" by the publish attempt itself failing and surfacing a clear, user-facing reconnect prompt, not by the system healing itself in advance. Not silent (users do get told to reconnect), but strictly worse reliability than the TikTok path for no apparent reason other than it not having been built yet.

**Publish errors:** both platforms have real, provider-specific error parsing (Meta error codes/subcodes; TikTok structured errors), and Instagram has genuinely useful resilience — container-readiness polling with backoff for async media processing, and an automatic aspect-ratio crop-and-retry for feed photos that fail Instagram's dimension requirements. **What's missing:** no differentiated retry timing by error class — a rate-limit (429, should retry soon) and a permanent content-policy rejection (will never succeed) both currently fall through to the same "released back to PENDING, retried on the next cron/opportunistic pass" behavior. Under the current once-daily cron this means up to ~24h between retries either way, which will improve automatically once §5's cron-frequency fix lands, but the *lack of differentiation itself* is a separate, still-open gap.

**Duplicate posts:** protected — the atomic `PostTarget` claim genuinely gates both platforms' real publish call paths, confirmed not a partial/decorative implementation.

**Webhooks — asymmetric, one real security gap.** Instagram's webhook has real, unbypassable HMAC-SHA256 verification with a timing-safe comparison over the exact raw request bytes. **TikTok's webhook has zero signature verification** — explicitly acknowledged in the code's own comments as a known, unfixed gap, meaning anyone can currently forge a TikTok comment-webhook payload and trigger the app's AI-generated auto-reply flow under the brand's real account. This is exploitable today, not theoretical.

**Account isolation:** disconnecting a social account correctly cascades and removes pending publish targets rather than leaving stale references. One surprise-behavior risk found: if a user disconnects an account and connects a *different* account on the same platform, a post that had lost its target (because its original account was disconnected) can silently auto-reattach to and publish on the new account without any re-confirmation step. Not a security hole — it's still the same brand's own data — but a real "posted where I didn't expect" risk for a user.

**A significant, likely-undisclosed product gap:** both TikTok publish paths (video and photo) hard-code `privacy_level: 'SELF_ONLY'`, with no explanatory comment anywhere near it in an otherwise heavily-documented file. **Content "published" to TikTok through this app today is only visible to the account owner, not the public.** This wasn't possible to fully resolve from code alone — it may be a deliberate placeholder (TikTok requires apps that haven't passed platform audit to default new posts to private), or it may be an oversight — but either way, the *current behavior* is a fact: TikTok auto-publish does not currently make content public, and if users aren't explicitly told that, it directly contradicts the core product promise for that platform. This needs a product-level decision, not just a code fix, but it's flagged here as P0 because it's a silent, total failure of a headline feature with no user-facing error.

**Google Drive sync:** correctly dedupes via a DB unique constraint; per-file error handling means one bad file doesn't abort the whole sync; the sequential-loop performance concern is covered in §2/§3.

---

## 9. Security Audit

**The load-bearing question, answered directly: can User A access User B's media, posts, tokens, settings, or social accounts?**

Mostly no, with **one confirmed, real exception marked P0 below.** This codebase has clearly already been through at least one prior security pass — most controllers carry explicit comments describing IDOR bugs that were found and fixed previously, and the pattern used everywhere else (`BrandAccessGuard` doing a real DB membership check, never trusting a JWT-embedded brand claim alone; hand-verified ownership checks in the OAuth controller and elsewhere) is genuinely sound.

**P0 — confirmed IDOR gap.** `PostsService.createPost` accepts a list of `mediaAssetIds` from the request body and reassigns their `status`/`linkedPostId` via `updateMany({ where: { id: { in: dto.mediaAssetIds } } })` — **with no check that those media assets belong to the calling brand.** A logged-in user of one organization who knows (or guesses) another organization's `MediaAsset` id can, through this endpoint, silently reassign that asset into their own post — corrupting another tenant's data, and since post responses include the asset's Blob URL, potentially exposing another org's private media URL in the process. The same unchecked-ownership pattern exists, lower severity, in media-folder creation (`folderId`/`parentId` not verified as belonging to the brand). IDs here are non-sequential (cuid), so this isn't casually mass-exploitable by guessing, but it is a real, currently-open cross-tenant data-integrity and exposure gap, and per the brief's own stated bar ("if there is any possibility, mark it P0"), this qualifies.

**Row Level Security is confirmed disabled**, and the Prisma connection uses a role that bypasses RLS regardless — meaning the application-code checks above are the *entire* security boundary, with no database-level backstop if a future endpoint is added carelessly. This isn't itself an active vulnerability, but it raises the stakes on every other authorization finding in this section, and on code review discipline going forward.

**Secrets:** nothing found committed to git history (confirmed via `git ls-files`/`git check-ignore`/`git log --all --full-history`). Live plaintext secrets do exist in local `.env` files (expected/normal), but two different `.env` files reference two *different* Supabase project refs with the same password reused across them — worth the user personally confirming which project is actually live in production, since this kind of drift is exactly how a "dev" secret quietly becomes load-bearing in prod or vice versa. Not a code defect; a hygiene item to verify by hand.

**OAuth tokens:** genuinely AES-256-GCM encrypted at rest, fails closed if the encryption secret is missing. One minor nit: the key-derivation salt is a hardcoded literal rather than random/unique — low severity since the real secret entropy comes from `ENCRYPTION_SECRET`, but not best practice.

**Webhook verification:** Instagram and billing (Stripe, Paystack) are all genuinely, unbypassably verified. **TikTok's webhook has zero signature verification** — a real, currently-exploitable gap, already covered in §8, repeated here because it's squarely a security finding.

**File uploads:** validated by MIME-type allowlist only, no magic-byte content sniffing (a relabeled file with a spoofed `Content-Type` header would pass). SVG is excluded from the allowlist, which limits stored-XSS-via-SVG risk specifically. The direct-to-Blob upload path validates the target URL actually belongs to the app's own Blob storage domain, which closes a real path-traversal/arbitrary-registration risk that existed before that check was added (per the code's own comment).

**Rate limiting:** one global, undifferentiated limiter (10 requests/60s/IP) applied to every route including login/register/password-reset. No tighter brute-force protection or account lockout on auth endpoints specifically, and no cost-aware throttling on the expensive AI/publish endpoints (those rely on the entitlement/quota system instead, which is a different control and — per §6 — has its own gaps).

**Injection:** no SQL-injection surface found — zero raw `$queryRaw`/`$executeRaw` usage anywhere, everything goes through Prisma's parameterized query builder. No `eval`/`exec`/`child_process` usage found. No sensitive data (tokens, passwords) found logged anywhere near auth or webhook code.

**CORS:** `origin: '*'` combined with `credentials: true` is a real misconfiguration on paper, but practically lower severity than it looks — auth is confirmed bearer-token-only (JWT in `Authorization` header via `localStorage`), with zero use of `credentials: 'include'` anywhere in the frontend, meaning cookies are never actually sent cross-origin today. Still worth fixing (reflect the real origin instead of a wildcard) since it's a landmine waiting for the day cookie-based auth is ever added.

---

## 10. Database Audit

Schema fully read (`apps/api/prisma/schema.prisma`). Model map: `User → OrganizationMember → Organization → Brand → {Post, MediaAsset, SocialAccount, BusinessBrain, GrowthSettings, AmaiEngineConfig, EngineEvent, PendingCommentReply, MediaFolder}`, `Post → PostTarget → PublishingLog`, billing via `Organization → Subscription → UsageRecord` plus a `BillingWebhookEvent` idempotency table.

**No migrations directory exists** — schema changes go through `prisma db push` directly against the live database, with no rollback history and no reviewable generated SQL before it's applied. This already shaped one real design decision this session (the new scheduling unique constraint couldn't be a partial/filtered index because that requires hand-written migration SQL this project's workflow doesn't support). Acceptable for a small team moving fast; a genuine gap for production change-safety at larger scale.

**FK issues found:**
- `Organization.ownerId` is a bare `String` with no actual foreign-key relation to `User` — a deleted user leaves a dangling, DB-unenforced reference.
- `MediaAsset.brandId`/`userId` are both nullable while virtually every other resource requires a brand — if that null state is ever actually reachable (not confirmed it currently is, in service code), those rows would be invisible to brand-deletion cascades.
- Everything else cascades correctly and sensibly from `Brand`/`Organization`/`User` deletion — no dangerous over-cascading found.

**Indexes:** generally well-targeted to real, traced query patterns rather than blanket-applied — this is a codebase that has clearly thought about its indexes rather than adding them reflexively, consistent with the brief's instruction not to index everything. One possible gap, explicitly flagged as *unconfirmed* rather than asserted: comment-webhook reply lookups may lack a supporting index on the field they're matched against — worth a targeted follow-up, not stated here as fact.

**No data retention/cleanup policy exists** for append-only tables (`EngineEvent`, `PublishingLog`, AI usage logs) — nothing archives or prunes them. Over a long enough time horizon at 200+ users these will grow unbounded; not an urgent problem at 200 users specifically, but worth a plan before it becomes one.

---

## 11. Failure & Recovery Audit

| Operation | State model | Protected against a halfway failure? |
|---|---|---|
| Media upload → processing | PENDING/PROCESSING/READY/SCHEDULED/PUBLISHED/FAILED | **No** — no atomic claim; this is the AutoPilot double-execution gap from §4 |
| AI generation call | timeout-bounded, no formal state machine needed | Yes — every call is individually timeout-bounded |
| Scheduling slot assignment | new unique constraint + 3-attempt retry (this session's fix) | Yes, for the exact-instant-collision case — but does **not** protect against two independent pipeline runs landing on two *different* slots for the same asset (that's the §4 gap, one level up) |
| Post creation | DRAFT/NEEDS_APPROVAL/SCHEDULED/PUBLISHING/PUBLISHED/FAILED/REJECTED | Well-modeled per post; the gap is upstream (two posts can be created for one asset), not in the post state machine itself |
| Publish to platform | atomic claim + stale-claim reclamation | **Yes — the strongest, most hardened path in the system** |
| Billing webhook delivery | unique `(provider, eventId)` dedup table, checked before processing | Yes (a narrow, low-risk theoretical window on truly simultaneous redelivery of the identical event, acceptable given providers deliver sequentially in practice) |
| Instagram/TikTok comment-webhook delivery | no dedup constraint at all | **No** — a redelivered webhook event (Meta's delivery is documented at-least-once) will queue a second AI-generated reply for the same comment |
| Billing usage recording | atomic upsert-increment | Yes |

---

## 12. Idempotency Audit

Operations that must never happen twice, and their actual current protection:

- **Duplicate publish to a social platform** — protected (atomic `PostTarget` claim).
- **Duplicate billing charge/usage increment** — protected (atomic upsert).
- **Duplicate scheduled job execution** — not applicable; no separate job system exists to duplicate.
- **Duplicate media processing / duplicate post creation from one asset** — **not protected**, confirmed gap (§4/§11), the single highest-priority fix in this whole audit.
- **Duplicate AI-generated comment replies on webhook redelivery** — **not protected**, confirmed gap (§11).

Both open gaps are fixable with the exact same pattern already proven correct elsewhere in this codebase (`PostTarget`'s compare-and-swap claim, or a unique constraint analogous to `BillingWebhookEvent`'s) — no new concept or infrastructure is needed, just applying an existing, working pattern to two places it hasn't reached yet.

---

## 13. Observability Audit

Sentry is genuinely wired (not vestigial) on both server and client, gated on DSN env vars — whether it's actually capturing anything live depends on whether those vars are actually set in the Vercel/production environment, which isn't verifiable from code alone.

**A real, specific gap:** the global Sentry exception filter only catches errors that reach NestJS's HTTP boundary. `PublishingService`'s per-target publish loop explicitly swallows individual failures (`catch { failed++ }`) so a single post's publish failure never throws up to that boundary — it only produces a `Logger` line that lands in Vercel's log viewer, searchable but not alerted on, and **never reaches Sentry.** The same is true of the media pipeline's failure handling. This means the two most operationally important failure classes in the entire app — a post that failed to publish, and an asset whose AI pipeline failed — are currently invisible to whatever alerting Sentry would otherwise provide.

No correlation/request/trace IDs exist anywhere in the backend, so a single failure's log lines (pipeline start → AI call → DB write → failure) can only be reconstructed by eyeballing timestamps and the embedded asset/post ID, not by filtering on one ID that ties the whole request together.

The admin dashboard (confirmed real and cross-organization, not a mock) already surfaces failed-post counts, AI key health, expired connections, and an MRR estimate — and is admirably honest in its own code about what it explicitly does *not* yet track (a unified 4xx/5xx error log by endpoint). It has no "posts currently overdue by N minutes" backlog metric, and it's pull-only — nothing pushes a notification when system health degrades; a human has to go look.

No alerting integration (Slack, PagerDuty, email-on-failure) exists at all.

**Recommendation: this doesn't need new paid monitoring tooling.** The gap isn't a missing tool, it's that two swallowed-exception code paths never call the Sentry SDK they already have wired up. Adding `Sentry.captureException` (or equivalent) inside those two catch blocks, plus a simple threaded request-id through the pipeline's log lines, closes most of this gap with a few lines of code, not a new subscription. Supabase and Vercel's own dashboards already cover DB/storage performance monitoring adequately at this scale — no gap there justifying new tooling either.

---

## 14. Cost Architecture

Stated assumptions: ~15 uploads/user/month, roughly proportional growth in posts/scheduling/publishing activity, Vercel Pro adopted per §5/§15's recommendation, Supabase pricing confirmed current as of this audit (Pro plan: **$25/month base**, includes an 8GB database, 100GB storage, 100K MAUs, and roughly 200-500 concurrent Realtime connections depending on source — the exact current figure should be confirmed on Supabase's live pricing page since it's the kind of number that moves).

| Users | Vercel | Supabase | Blob storage | AI (Groq/Gemini) | Email (SMTP) | Monitoring (Sentry) | Rough total/mo |
|---|---|---|---|---|---|---|---|
| 10 | Hobby, $0 (fine at this volume even without the cron fix) | Free tier, $0 | ~$0 (well under free allotment) | $0 | $0 (Gmail SMTP fine) | Free tier, $0 | **~$0** |
| 50 | Pro, $20 (cron fix matters by now) | Free tier likely still adequate, $0 | ~$0-5 | $0 | $0, approaching Gmail's practical daily cap | Free tier, $0 | **~$20-25** |
| 100 | Pro, $20 | Pro, $25 (connection/compute headroom) | ~$5-15 | $0 (still well inside Groq free tier per §6) | Likely need a real transactional provider by now — Gmail SMTP was never meant for this volume | Free tier likely still $0 | **~$50-65** |
| 200 | Pro, $20 | Pro, $25 (may need compute add-ons depending on actual query load — unverified from here) | ~$10-30 | $0-low (per §6's math, still comfortably inside free tier unless usage patterns are much heavier than assumed) | A real provider becomes a genuine requirement, not optional, likely $10-20/mo at this volume | Possibly a paid tier if error volume grows, $0-26 | **~$65-120** |
| 500 | Pro + likely higher function-usage costs | Pro + likely compute add-ons | ~$25-75 | Still likely free-tier-adequate per the math, but worth re-verifying at this volume, not assuming | ~$20-35 | ~$26+ | **~$150-250** (wider uncertainty band — this is past where current assumptions are well-tested) |
| 1000 | Pro + meaningful function-usage overage | Team tier ($599/mo) likely needed | ~$50-150 | Groq free-tier math starts to feel tight — worth planning for a paid AI tier conversation by this point | ~$30-50 | Paid tier likely, ~$26-80 | **~$700-950+** |

**What could cause a cost explosion, and the safeguard for each:**
- **AI spend from one abusive/runaway user** — already bounded by the monthly entitlement cap on the two enforced paths; the fix is closing the two bypass paths (§6), not adding new cost controls.
- **Storage from the `OptimizedMediaAsset` leak** — currently near-zero impact only because video transcoding is off; becomes real the moment it's turned on, so that leak should be fixed *before* transcoding is ever enabled, not after.
- **Realtime connection count** from the 50-second SSE-reconnect pattern — worth watching specifically against Supabase's Realtime connection limit as concurrent open-dashboard-tab count grows; not an emergency at 200 users, but the first thing likely to need attention past that.
- **Email volume** — the SMTP setup has no daily cap awareness built in; a viral signup spike could hit a plain email provider's practical sending ceiling well before any other cost line becomes a problem.

---

## 15. Infrastructure Decision

| Infrastructure | Verdict | Reasoning |
|---|---|---|
| **Vercel Pro** | **ADD** | The one genuinely justified upgrade in this whole audit — $20/month directly closes the cron-frequency gap identified in §5, with no new services or failure surface |
| **Supabase Pro** | **ADD around 50-100 users** | Free tier is likely fine well below that; Pro's extra compute/connection headroom becomes relevant as concurrent load grows — exact crossover point should be confirmed against actual Supabase dashboard metrics, not guessed further than this |
| **Upstash QStash** | **NOT YET** | §5 found no problem it solves that Vercel Pro's cron upgrade doesn't already solve for less complexity and cost at this scale |
| **Upstash Redis** | **NOT YET** | No caching or rate-limiting need identified anywhere in this audit that the current in-memory/DB-backed approaches don't already handle at 200-user scale |
| **Cloudflare R2** | **NOT YET** | §7 found AMAI is not, in practice, accumulating a permanent media library — the one real storage problem found (the `OptimizedMediaAsset` leak) is a code bug to fix, not evidence the current storage provider is wrong |
| **Sentry** | **KEEP (already in place), fix its wiring** | Already the right tool; the fix needed is two missing `captureException` calls in swallowed-exception paths, not a different or additional product |
| **Resend (or a real transactional email provider)** | **ADD by ~100-200 users** | Not currently in use — the app runs on plain SMTP (works with Gmail). This is fine at low volume but a plain SMTP account was never built for hundreds of transactional sends a month; this is the cost line most likely to cause a real (not hypothetical) problem first as the user base grows, and it's currently unaddressed |
| **Additional workers/servers/infra beyond the above** | **NOT YET** | Nothing in this audit — not the AutoPilot gap, not the queue analysis, not the AI/storage/DB findings — points to a need for a persistent server or worker process. The serverless-plus-cron-plus-atomic-claims model is sufficient once the P0/P1 fixes below are applied |

---

## 16. Code Cleanup

- **DELETE:** `bullmq`, `@nestjs/bullmq`, `passport-oauth2` (unused dependencies, §2).
- **REFACTOR:** the duplicated timezone-check and brand-membership-check logic into shared helpers (§2); the Analytics page's four-full-list-fetch pattern, replacing it with the already-proven `/posts/stats`-based approach used elsewhere in the same codebase (§2); the Drive-sync sequential per-file loop, adding batched dedup checks and bounded concurrency (§2/§3); the plain-object `@Body()` DTOs across `posts`, `media`, `engine`, `brands`, and `auth` controllers, converting them to real `class-validator` classes (§2/§9).
- **REBUILD (small, targeted):** the `MediaAsset` processing claim, following the exact pattern already proven correct on `PostTarget` (§4/§11/§12) — this is the single most important fix in the whole audit, and it's a small, well-precedented change, not a rebuild in the scary sense.
- **DEFER:** the scheduling-service nested-loop pattern (already well-reasoned and bounded, not an oversight); the 50-second SSE-reconnect pattern (a deliberate, already-justified tradeoff — just worth monitoring, not changing); the DB retention/archival policy for append-only log tables (real, but not urgent at 200 users).

---

## 17. V2 Architecture Proposal

No architectural rewrite is warranted. The existing shape — Next.js hosting an in-process NestJS app on Vercel serverless, Postgres via Supabase/Prisma, Vercel Blob for media, Groq/Gemini for AI, atomic-claim-based publishing instead of a persistent queue — is sound and should be kept as-is. The proposal is a short list of targeted fixes layered onto the current architecture, not a new one:

- **Frontend:** unchanged. The one real perf fix (Analytics page) is a data-fetching change, not an architectural one.
- **Backend:** unchanged shape; add the `MediaAsset` atomic claim (the one structural gap found); close the two AI-entitlement bypass paths; add per-error-class retry backoff to the publish path; add signature verification to the TikTok webhook; scope `createPost`'s media-asset reassignment to the calling brand.
- **Database:** apply the already-written scheduling unique constraint via `prisma db push`; add the FK relation on `Organization.ownerId`; no other schema changes indicated.
- **Storage:** unchanged provider (Vercel Blob); fix the `OptimizedMediaAsset` cleanup gap; wire the existing storage-quota calculation up as an actual pre-upload guard.
- **AI:** unchanged providers and routing logic; extend entitlement enforcement to cover every AI-triggering path, not just two of them.
- **Background jobs / scheduling:** unchanged mechanism (cron + opportunistic publish + atomic claims); increase cron frequency via a Vercel Pro upgrade. No queue service added.
- **Social APIs:** unchanged connection model; add TikTok webhook verification; add proactive Instagram token refresh to match TikTok's existing pattern; resolve the TikTok `SELF_ONLY` privacy question at the product level.
- **Monitoring:** unchanged tool (Sentry); wire it into the two currently-swallowed exception paths; add a lightweight request-id threaded through pipeline logs.
- **Data flow:** unchanged end-to-end.

---

## 18. Priority System

**P0 — must fix before 200-user launch (all four are small, well-precedented, code-only fixes — none require new infrastructure):**
1. **`PostsService.createPost` IDOR gap** — media assets reassigned into a post with no check they belong to the calling brand (§9). Cross-tenant data-integrity and potential exposure risk.
2. **`MediaAsset` processing has no atomic claim** — can result in one upload independently producing two live `Post` rows, both of which can genuinely auto-publish duplicate content to a real social account under AutoPilot (§4/§11/§12). This is the "duplicate publishing" scenario the brief explicitly names as P0-worthy, and it's real, not theoretical.
3. **TikTok webhook has zero signature verification** — currently forgeable by anyone, triggers the app's AI auto-reply flow under the brand's real account (§8/§9).
4. **TikTok publish sets `privacy_level: SELF_ONLY`** — the core "auto-publish to TikTok" promise is silently not happening publicly today, with no error surfaced anywhere (§8). Needs an explicit product decision, but the current behavior itself is a fact, not a guess.

**P1 — high priority, fix soon after launch (none require new infrastructure):**
- AI entitlement enforcement bypassed by Drive sync and the stale-processing sweep (§6).
- Instagram token refresh is reactive-only, unlike TikTok's proactive refresh (§8).
- Publish retry has no differentiated backoff by error class — a 429 and a permanent rejection are treated identically (§8).
- Comment-reply webhook has no dedup — a redelivered webhook can queue a duplicate AI reply (§11/§12).
- Missing DTO validation across several POST/PATCH endpoints — a real, not stylistic, gap (§2/§9).
- Rate limiting is global/undifferentiated — no extra brute-force protection on auth endpoints (§9).
- Apply the already-written scheduling unique constraint (`prisma db push` — code is done, not yet applied to the live DB) (§11).

**P2 — medium priority:**
- `OptimizedMediaAsset` Blob-cleanup leak (currently low-impact since video transcoding is off; fix before turning that feature on) (§7).
- Storage quota computed but never enforced as a blocking guard (§7).
- Google Drive sync's sequential per-file loop — real latency/timeout risk at volume, not yet observed failing (§2/§3).
- Analytics page's inefficient full-list-fetch pattern (§2).
- `Organization.ownerId` missing a real FK relation (§10).
- CORS wildcard + credentials misconfiguration (low real risk today given bearer-token-only auth, but a landmine) (§9).
- No data retention/archival policy for append-only log tables (§10).
- Account-reattachment surprise behavior on disconnect/reconnect to a different account (§8).

**P3 — future/cleanup:**
- Remove `bullmq`, `@nestjs/bullmq`, `passport-oauth2` (§2/§16).
- Extract the duplicated timezone-check and brand-membership-check helpers (§2/§16).
- Hardcoded (non-random) scrypt salt in the encryption key derivation — low severity given the real secret comes from `ENCRYPTION_SECRET` (§9).
- Monitor (don't yet fix) the 50-second SSE-reconnect connection-churn pattern (§2/§14).
- Add Sentry `captureException` calls to the two swallowed-exception paths, plus lightweight request-id logging (§13).

---

## 19. Final Deliverables

### Executive Summary

**Is AMAI ready for 200 users today? No — but not because of a deep architectural problem. It's ready except for four specific, well-understood, code-only fixes**, plus applying one migration that's already written. The core design decisions — serverless-plus-cron instead of a persistent queue, atomic compare-and-swap claims instead of distributed locks, entitlement-gated AI usage, encrypted OAuth tokens — are all sound and were each independently verified as correct where they've actually been applied. The gaps found are narrow and specific: one unclaimed resource (`MediaAsset`) that mirrors a pattern already proven correct elsewhere (`PostTarget`), one unauthenticated webhook, one unscoped-ownership endpoint, and one social platform silently not doing what the product claims. None of these require new infrastructure, a rewrite, or months of work.

### Current Architecture

Next.js frontend hosting an in-process NestJS backend inside a single Vercel serverless function (60s cap), Postgres via Supabase/Prisma (pooled, correctly configured for serverless), Vercel Blob for media (with real publish-time cleanup, contrary to a plausible worst-case assumption), Groq-primary/Gemini-fallback AI with a multi-key round-robin, and a cron-plus-opportunistic-publish model instead of a persistent job queue, made safe by atomic database-level claims rather than a distributed lock service.

### Critical Problems (P0)

1. Cross-tenant media-asset reassignment in post creation, unscoped to the calling brand.
2. No atomic claim on media processing — can produce genuine duplicate live publishes under AutoPilot.
3. TikTok webhook accepts unsigned, forgeable requests.
4. TikTok content is published private-only (`SELF_ONLY`), silently, with no user-facing error.

### High-Priority Problems (P1)

AI entitlement bypass on two ingestion paths; asymmetric OAuth token refresh (Instagram vs. TikTok); undifferentiated publish-retry backoff; no dedup on comment-webhook redelivery; missing DTO validation on several endpoints; undifferentiated rate limiting; the scheduling unique-constraint migration not yet applied live.

### Medium/Future Problems (P2/P3)

Optimized-media Blob-cleanup leak (dormant until video transcoding is enabled); unenforced storage quota; sequential Drive-sync loop; an inefficient Analytics data-fetch pattern; a missing FK relation; a CORS misconfiguration with low practical impact today; no log-retention policy; account-reattachment surprise behavior; minor dependency and code-duplication cleanup; observability wiring gaps.

### Infrastructure Recommendation (pay for now)

**Vercel Pro ($20/month)** — directly closes the cron-frequency gap that's the single biggest reliability issue at 200-user scale, using code that already exists.

### Infrastructure We Should NOT Pay For Yet

Upstash QStash, Upstash Redis, Cloudflare R2, any paid AI tier, any additional monitoring product beyond Sentry's existing (free-tier-adequate) footprint. None of these were shown by this audit to solve a problem the current stack, once the P0/P1 list is closed, doesn't already handle.

### 200-User Capacity Analysis

Throughput within a single publish pass is already sufficient (bounded concurrency comfortably clears a 30-post batch). The real gap is *frequency*, not capacity, and it's fully addressed by the Vercel Pro cron upgrade. AI cost is very likely $0 at this volume per the token-count math in §6. The one open capacity question this audit could not resolve from code alone is the actual Supabase connection/compute headroom under real 200-user query load — that's a fact to confirm against the live project dashboard, not a code-level finding.

### Cost Projection (10 → 1000 users)

See the full table in §14. Rough total infrastructure cost: ~$0/month at 10 users, ~$20-25 at 50, ~$50-65 at 100, ~$65-120 at 200, rising toward ~$700-950+ by 1000 users (driven mainly by Supabase's Team tier and increased AI/storage/email volume at that scale) — with the important caveat that the 500-1000 user figures carry meaningfully wider uncertainty than the 10-200 range this audit was actually scoped to verify.

### Recommended V2 Architecture

Unchanged from the current one — see §17. This audit found a small, fixable punch list, not a case for redesign.

### Keep / Fix / Rewrite / Remove

**Keep:** the entire architectural shape — serverless deployment model, cron-plus-opportunistic-publish, atomic-claim publishing, encrypted OAuth storage, entitlement-based AI gating, Sentry, Vercel Blob, Supabase/Prisma.
**Fix:** the four P0 items, the P1 list, and the DTO-validation gap.
**Rewrite:** nothing — no component of this system was found to need a rewrite.
**Remove:** `bullmq`, `@nestjs/bullmq`, `passport-oauth2` (unused dependencies only).

### V2 Implementation Roadmap

1. P0 fixes — media-asset ownership check, `MediaAsset` atomic claim, TikTok webhook signature verification, resolve the TikTok privacy-level product decision.
2. Apply the already-written scheduling migration (`prisma db push`) and confirm it applies cleanly against live data.
3. Database fixes — `Organization.ownerId` FK, confirm/add the comment-reply dedup index if the follow-up check in §10 confirms it's needed.
4. Background-job/scheduling fix — upgrade to Vercel Pro and increase cron frequency to 1-5 minutes.
5. AI optimization — close the two entitlement-bypass paths; consider counting vision calls toward quota.
6. Storage optimization — fix the `OptimizedMediaAsset` cleanup leak; wire the existing quota calculation up as a real pre-upload guard.
7. Social API reliability — proactive Instagram token refresh; differentiated publish-retry backoff by error class; comment-webhook dedup.
8. Security hardening — remaining P1 items (DTO validation, rate-limit differentiation on auth endpoints, CORS origin fix).
9. Observability — wire Sentry into the two swallowed-exception paths; add lightweight request-id logging.
10. Load testing — specifically validate this session's concurrency fixes (bounded publish concurrency, spread AI key round robin) under genuine concurrent load, which this sandbox could not simulate.
11. Production deployment — confirm live Supabase plan/tier has adequate headroom for 200-user query volume; confirm which of the two divergent `.env` project refs is actually production; adopt a real transactional email provider before it becomes an active bottleneck, not after.

### Final Go/No-Go

**AMAI V2 STATUS: NO-GO**

Conditional: becomes a straightforward GO once the four P0 items above are fixed and the already-written scheduling migration is applied to the live database. None of that work requires new infrastructure, a redesign, or an extended timeline — it's a short, concrete list on top of an architecture that this audit found to be fundamentally sound. The P1 list should follow shortly after launch, not block it. Everything in P2/P3 can genuinely wait.
