# Oyinca — $1M ARR Product & Growth Blueprint

*Grounded in a direct audit of the live codebase (apps/api NestJS + apps/web Next.js, Postgres/Prisma, Vercel), not a theoretical rebuild. Where a claim below can't be verified from the code or a search, it's flagged as such rather than asserted.*

---

## A. Current State Audit

**Stack.** Next.js 15 (`apps/web`) with NestJS (`apps/api`) mounted in-process inside it (no separate API deploy — `backendPort.ts` + `src/app/api/[...path]/route.ts`), Postgres via Prisma, Vercel hosting. There is deliberately no Redis/BullMQ — background work runs through Vercel Cron / QStash-triggered endpoints under `/cron/*`, because serverless functions don't stay warm between requests. This is a real constraint, not a gap: Vercel's Hobby tier only allows daily-granularity cron schedules, which caps how "real-time" anything cron-driven (publishing, metrics sync, health checks) can be without upgrading or adding QStash for the routes that need tighter timing (publish-due already does this).

**Data model — much more built than the brief assumes.** `Brand` + `BusinessBrain` already function as a working Brand Brain: business description, target audience (plus age-range/location fields added this session), brand voice, personality tags, writing samples with an AI-generated voice-summary (also added this session, replacing a raw-sample-injection anti-pattern), content pillars, goals, competitive context, competitor handles, avoid-topics, banned phrases, hashtag/emoji/CTA preferences, and a `learnedInsights`/`MemoryEntry` scaffold for accumulated intelligence. `SocialAccount` handles TikTok + Instagram OAuth with encrypted tokens. `MediaAsset`/`OptimizedMediaAsset` already include a **Media Optimization Engine** that derives per-platform-correct crops/formats — most products at this stage don't have this. `Post`/`PostTarget`/`PostMedia` support both single posts and 2-5 image carousels. `PostPerformance` (added this session) now gives TikTok posts a real, time-series engagement history instead of throwing stats away. `AmaiEngineConfig` + `PlatformPostingSlot` already implement engine state, approval mode, posting cadence, and a DB-seeded generic best-time table. `EngineEvent` is a full pipeline audit trail, streamed live over SSE — every approve/reject/edit is already captured as a signal, it's just never been read back into strategy. Billing is real: Paystack-backed `Subscription`/`UsageRecord`/`EntitlementsService` already meter AI generations and post-publishing against FREE/PRO/AGENCY plans. Admin-grade reliability tooling (`ErrorGroup`/`ErrorEvent`/`HealthCheckResult`, Telegram alerting, an admin dashboard) already exists — this is unusual for a pre-revenue product.

**AI architecture** is already an abstraction layer, not a hardcoded single-provider call: `AiGatewayService` routes between Groq (multi-key, cheap/fast, default first) and Gemini (the only current vision-capable adapter), provider order configurable via env. Section 23's "don't hard-code to one LLM" requirement is already satisfied structurally — it just has two providers, not four.

**The Engine** (`EngineService.processMediaAsset`) is a genuine, working Strategy+Content engine already: vision analysis of an upload → Business Brain context injection → caption + hashtag generation → content-pillar matching → posting-slot assignment → approval-mode-gated publish, wrapped in a 50-second timeout so it always resolves inside Vercel's function limit. This is most of sections 7 and 8 already built — it's just not exposed to the user as a visible, reviewable "strategy," and it isn't yet trend- or performance-aware.

**Publishing is genuinely hardened**: atomic claim-based retry (max 3 attempts, stale-claim reclaim after 10 minutes), per-platform carousel-compatibility checks (TikTok can't mix photo/video or do multi-video), proactive + reactive TikTok token refresh, Instagram aspect-ratio repair via sharp, and an honest hardcoded limitation — TikTok forces every unaudited app's posts to `SELF_ONLY` (private) until Oyinca passes TikTok's own content-posting audit, which the code already accounts for via a `TIKTOK_CONTENT_AUDITED` flag rather than pretending otherwise.

**Real gaps, confirmed by reading the code, not assumed:**
- No Products/Services model exists at all.
- Vision analysis runs on every upload but is discarded after one caption call — never persisted as reusable content-library intelligence.
- No social/trend intelligence, no competitor monitoring, no viral/outlier analysis exists anywhere.
- No repurposing pipeline (YouTube/podcast/blog → multi-platform content).
- Onboarding is a **product tour** (`WelcomeModal`/`TourOverlay`), not a data-capture flow — it writes only `User.onboardingCompleted`, nothing into `Brand` or `BusinessBrain`. The "holy shit it understands my business" moment section 13 wants does not currently exist.
- No product-analytics instrumentation was found wired to real events (PostHog env vars exist as optional config; no confirmed event-tracking calls were found in the app code this session — flagging as unverified rather than absent, since a full instrumentation audit wasn't run).
- Instagram is fully built end-to-end (OAuth, publishing) but hidden behind a frontend-only feature flag, `INSTAGRAM_ENABLED`.

---

## B. Competitive Gap: Postel

Verified via search (not the brief's description alone): Postel is an X/Twitter-only content tool, $19–29/mo (Starter/Professional) plus custom "Done for You" pricing, publicly cited around 650 users, launched 2024. Its real feature set: a personal knowledge base (voice/style learning), voice-to-post, a viral-post library, tone-of-voice analysis, content flows, scheduling, post-performance analysis, and repurposing (YouTube/podcast/reels/blog → posts). **No public ARR figure for Postel was found in search** — the "$1M+ ARR is reachable this way" framing in the brief should be treated as a market thesis, not a confirmed fact about Postel specifically.

The real gap: Postel is a content-creation copilot for one person on one platform — there's no public evidence it autonomously publishes across platforms, monitors competitors, or runs a closed performance-learning loop. Oyinca's actual codebase already goes further on autonomy, multi-platform publishing, and operational reliability than what's publicly documented about Postel. Oyinca's real gap versus Postel is content-input richness — Postel's "knowledge base" and "viral-post library" are exactly what today's Business Brain/voice-summary work and this roadmap's Products/Services + content-library-intelligence items are aimed at closing.

---

## C. Product Architecture — The Oyinca Engine, Mapped to Reality

| Layer | Status | Concrete plan |
|---|---|---|
| Brand Brain | **Built** (`BusinessBrain`) | Extend with a `Product` model — the one structural gap. |
| Social/Trend Intelligence | **Not built** | Scope to what TikTok/Instagram's *official* APIs actually expose (see Risks — this is the brief's shakiest assumption). Realistic v1: user-added competitor handles + that account's own public profile/video data, not open trend discovery. |
| Viral/Outlier Intelligence | **Newly unlocked** | `PostPerformance` (built this session) makes an account's own historical percentile/z-score computable now. Cross-account "what's viral globally" needs TikTok's Research API or similar gated access — not guaranteed available. |
| Strategy Engine | **Implicit, not explicit** | Currently fused inside `EngineService.processMediaAsset`. Recommend extracting a `StrategyService` that produces a reviewable content-plan object *before* generation runs, so the user sees a plan, not just output. |
| Content Engine | **Built** (`AiService`) | Extend with Product-aware generation and persisted media intelligence. |
| Autopilot | **Built as a 2-state system** (`EngineState` + `ApprovalMode`) | The brief's 4-tier Manual/Assisted/Automated/Autopilot is mostly a UI/policy framing over what already exists, not new plumbing. |
| Publishing | **Built, hardened** | No material changes needed. |
| Performance/Learning | **Half built** | `PostPerformance` now exists; `MemoryEntry`/`learnedInsights` exist in schema but nothing writes to them. The single highest-leverage next build: a `LearningService` that reads `PostPerformance` + `EngineEvent` on a schedule and actually populates them. |

---

## D. Database / Data Model

**Reuse as-is:** `User`, `Organization`, `Subscription`, `UsageRecord`, `Brand`, `BusinessBrain`, `MemoryEntry`, `SocialAccount`, `MediaAsset`/`OptimizedMediaAsset`, `Post`/`PostTarget`/`PostMedia`, `PublishingLog`, `PostPerformance`, `AmaiEngineConfig`, `PlatformPostingSlot`, `EngineEvent`, `GrowthSettings`/`PendingCommentReply`.

**New, needed:**
- `Product` (brandId, name, description, price, currency, features[], benefits[], usp, targetCustomer, offers[], availability, purchaseUrl, faqs Json, objections[]) — so generation can reference real facts instead of inventing them.
- A structured analysis column on `MediaAsset` (e.g. `aiAnalysis Json?`) — persist the vision output that's currently thrown away after one use.
- `CompetitorAccount` (brandId, platform, handle, lastCheckedAt) — the realistic v1 shape of "social intelligence," scoped to public/official data only.
- `ContentPlan`/`StrategyRecommendation` (brandId, objective, pillarMix Json, rationale, generatedAt, status) — makes the Strategy Engine's output a real, storable, user-reviewable artifact instead of an invisible intermediate step.
- Repurposing source types can likely extend the existing `ContentSource` enum (add `YOUTUBE`/`PODCAST`/`BLOG`/`URL`) rather than needing a new table.

---

## E. API / Services / Background Jobs

- **`MetricsModule`** (built this session) → extend with a **`LearningService`** (weekly cron) that reads `PostPerformance` + `EngineEvent`, writes `MemoryEntry` rows, and refreshes `BusinessBrain.learnedInsights.summary` — which `buildPromptContext` already reads on every generation, so this closes the flywheel without touching the prompt-building code again.
- **`ProductsModule`** — standard brand-scoped CRUD, entitlement-gated like every other AI-adjacent route.
- **`StrategyModule`** — `GET /brands/:id/strategy` returns the current recommended pillar mix + rationale, computed from `BusinessBrain` + recent `PostPerformance`; regenerable on demand or by cron.
- **Onboarding rework** — a real `POST` flow that writes straight into `BusinessBrain` during signup, replacing the current product-tour-only flow.
- **Free tools (section 17)** — should be unauthenticated, IP-rate-limited, standalone routes reusing the existing `AiGatewayService` (no new AI infra needed) — purely a marketing/acquisition surface, not a product feature.

---

## F. AI Architecture

Already the right shape — extend, don't rebuild. Add a third provider adapter (e.g. Claude or OpenAI) behind the same `AiGatewayService` interface for tasks where Groq/Gemini quality is insufficient (strategy rationale, longer repurposing output). Worth splitting `AI_PROVIDER_ORDER` per task rather than one global order — vision already effectively does this implicitly (only Gemini's adapter handles `image_url`), but caption/strategy/repurposing could each have their own cost/quality tradeoff instead of sharing one global preference list.

---

## G. Feature Roadmap

**Phase 1 — Now (buildable directly on the existing foundation):**
Products/Services model wired into generation · persist media vision analysis as content-library intelligence · `LearningService` to finally populate `MemoryEntry`/`learnedInsights` from real performance + approval-behavior data · replace the onboarding product-tour with an actual Brand Brain capture wizard · surface real performance deltas in the dashboard (nothing currently shows engagement trends anywhere).

**Phase 2 — Next (product-market fit):**
Explicit 4-tier Autopilot framing over the existing engine-state mechanism · competitor-account tracking scoped to official, public data only · text-based repurposing v1 (URL/YouTube link → multiple content ideas, no new video infra) · 2-3 free tools as an unauthenticated growth surface.

**Phase 3 — Later (scale-stage):**
Viral/outlier pattern extraction from a brand's own historical performance once volume is real · agency/multi-client workspace (the `Organization` → multiple `Brand`s relationship already supports this structurally) · third AI provider for higher-stakes generation.

**Phase 4 — Expansion:**
Flip Instagram on (it's already built, just flagged off — the fastest platform expansion available) · true cross-account trend intelligence, contingent on TikTok Research API access or an equivalent official program that is not guaranteed to be grantable.

---

## H. $1M ARR Model

The brief's own planning table (≈2,000 paying customers, ~$42 average revenue/customer, ≈$83.5K MRR) is a reasonable target shape, not a forecast. One concrete implementation note: the schema currently only has three plan tiers (`FREE`/`PRO`/`AGENCY`) — adding a fourth (`Creator`, below `Pro`) is a small, well-understood change to the existing `PlanTier` enum and `plans.config.ts`, not new billing infrastructure.

The harder truth: **the acquisition engine this model depends on is currently 0% built** — no free tools, no referral/affiliate system, no case-study infrastructure, no outbound workflow. Reaching 2,000 paying customers depends far more on building and running that acquisition machine than on additional product features.

---

## I. Risks

**TikTok content-posting audit (the single biggest blocker).** Every post from an unaudited app is forced private (`SELF_ONLY`) by TikTok itself — already handled defensively in code, but this is an external approval process, not something more engineering solves. Until it passes, "grow your following" isn't a deliverable promise on TikTok.

**Trend/competitor intelligence access.** Official platform APIs don't broadly expose "what's trending" or arbitrary competitor data to third-party apps. Sections 5 and 6 of the brief may not be buildable as literally described without a TikTok Research API grant or equivalent — not guaranteed.

**AI cost at scale.** The current Groq-first setup is cheap at low volume; before locking in a $19 Creator tier, model the actual per-customer generation cost at realistic usage, or a low tier could be unprofitable.

**Platform concentration.** A TikTok-only product has TikTok policy/API changes as a single point of failure. Instagram is already built and just switched off — turning it on is real diversification, not just a feature.

**Acquisition execution risk.** This is the harder half of the $1M ARR goal and is currently unstarted — independent of any engineering work.

**Learning-loop data volume.** `PostPerformance`/`MemoryEntry`-driven insight needs real published-post volume per brand before it's statistically meaningful — early customers won't feel the "gets smarter over time" pitch for weeks or months, which matters for how that's messaged during onboarding and early retention.

---

## J. Recommendation — Honest Assessment

The engineering foundation is unusually mature for a pre-revenue product: reliability, publishing correctness, billing, AI-provider abstraction, and brand-context modeling are already real, working systems, not sketches. That's the part most SaaS founders underbuild, and it's already done here.

The gap to $1M ARR is **not primarily more AI features**. It's three specific things: passing TikTok's content-posting audit (a structural, non-engineering blocker), building an acquisition engine that currently doesn't exist at all, and accumulating enough real usage volume for the personalization/learning loop to actually differentiate the product the way this brief describes. Products/Services and closing the learning loop (`LearningService` actually writing insights instead of leaving the scaffolding empty) are the two highest-leverage product investments left, because they're cheap relative to how much they change the product's perceived intelligence.

Is $1M ARR realistic for this product? Yes, as a product — the hard technical parts are largely solved or well-scoped. But the outcome depends far more on the TikTok audit and on actually executing distribution (free tools, creators, agencies, outbound) than on shipping additional intelligence features. Building more product without also building the acquisition engine and clearing the TikTok audit will not, by itself, produce the revenue outcome.

---

Sources: [Postel Software Pricing — Capterra](https://www.capterra.com/p/10029598/Postel/) · [Postel — Features & Pricing, SaaSworthy](https://www.saasworthy.com/product/postel-app) · [Postel.app official site](https://www.postel.app/) · [Postel — Crunchbase](https://www.crunchbase.com/organization/postel-7be7)
