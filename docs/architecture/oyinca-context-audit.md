# Oyinca context architecture audit

## Scope and method

This audit reflects the repository at September 2026. It traced the Next.js/Nest boundary, Prisma schema and migrations, authentication and guards, Business Brain and AI calls, capability registry, scheduling/QStash jobs, approval and publishing, OAuth/TikTok, billing, media/storage, analytics/learning, admin/observability, tests, and existing design/architecture documents. Code and schema remain the implementation truth.

## Current architecture

Oyinca is a TypeScript workspace and modular monolith: Next.js serves the public/product UI and proxies `/api`; NestJS owns application behavior; Prisma accesses Supabase-hosted Postgres; Vercel Blob stores media; QStash triggers protected Nest cron endpoints with daily Vercel Cron backstops. Instagram and TikTok publishing live in one bounded `PublishingService`. PostHog, Sentry, database error groups, health checks, and privacy-gated session replay provide observability.

The Brain already has more than a prompt wrapper. `BusinessBrain` and `Product` hold explicit knowledge. `ContentAnalysis`, immutable `BrainEvent`, evidence-linked `LearnedInsight`, and `LearningRun` provide structured understanding and memory. `ContextPackService` selects bounded sections. Versioned Oyinca skills and `AiGatewayService` separate product intelligence from Groq/Gemini adapters. `brain-policy.ts`, Engine approval mode, entitlements, and publishing claims keep deterministic authority outside the model.

## Strengths

- Provider-independent AI contract, ordered fallback, timeouts, key health, usage, latency, and optional cost estimate.
- Existing 12,000-character global context bound; raw writing samples are summarized once rather than resent.
- Explicit owner knowledge outranks learned knowledge; insights require repeated evidence and decay.
- Tenant IDs appear on Brain events, decisions, insights, analyses, and research snapshots.
- Manual approval is the default; Brain confidence cannot enable Autopilot.
- Publishing uses atomic target claims, attempt state, stale recovery, and per-target provider IDs.
- TikTok identity scopes are separated from posting capabilities and unaudited publishing is private.
- Deterministic entitlements, quotas, schedules, validation, and platform state are not delegated to LLMs.

## Weaknesses and technical debt

### High

1. `AiUsageLog` persists complete prompts and completions. This aids debugging but duplicates customer context and generated content, increases retention/privacy exposure, and conflicts with the newer structured-observability design used by `BrainDecision`. Migrate to task/provider/model/token/cost/context-module metadata with an explicit short-lived debug policy.
2. Most tenant isolation is application-level. The repository contains no managed Supabase RLS policies. Brand guards are good at HTTP boundaries, but internal services must continue to include organization and brand filters explicitly.

### Medium

1. `BusinessBrainService.buildPromptContext` and `ContextPackService` overlap in formatting brand/audience/product/preferences. Engine caption generation used the former while Brain decisions used the latter, allowing drift and duplicated tokens.
2. `AiService` embeds platform guidance and prompt construction in one large method. Provider coupling is low, but system knowledge is not independently versioned or selected by task.
3. `ContextPackService` had only a global bound. Large early sections could consume the full budget and starve higher-value later context; selection reasons were implicit.
4. The active repository lacks a root agent guide and local domain contracts. Starter READMEs misdescribe the real deployment.
5. `Post.updatedAt` exists but manual/agent editing has no general compare-and-swap version contract. Publishing claims are protected; draft-edit conflicts are not uniformly protected.
6. The `queue` directory name suggests a resident queue although the implementation explicitly uses serverless sweeps.

### Low

- Root-level `api`, `packages/database`, and `packages/ui` are empty or inactive scaffolding. `oauth-system` is untracked/inactive legacy material. These are navigation traps; deletion is outside this task.
- Several landing hero experiments remain beside the active hero. They are useful design history but can confuse agents without route tracing.
- Generated `dist` and `.next` trees can pollute broad searches; agents should exclude them.

## Token and context findings

The previous caption path used one untyped string containing every configured Business Brain field plus every active product, then appended platform/topic/tone again in `AiService`. There was no per-section accounting or provenance. Actual production averages cannot be calculated from this checkout without querying customer `AiUsageLog` rows, so no average token reduction is claimed.

The implemented caption resolver caps the full dynamic context package at 6,000 characters and separately caps brand (2,000), audience (900), content preferences (900), platform (500), and performance learning (1,000), plus up to 700 task characters. Strategy and market context are omitted because caption generation does not require them. This establishes a measurable ceiling; deployment telemetry should compare real before/after token counts.

## Missing persistent knowledge

The current schema covers brand identity, audience summary, voice, content preferences, products, events, and evidence-backed learnings. It does not yet model separate platform-specific voice profiles, a general agent task lifecycle, or procedural/policy memories as first-class types. Existing `MemoryEntryType`, Brain events, engine events, and approval configuration should be extended only when a real workflow needs these distinctions.

## Model coupling

Business callers depend on `AiGatewayService`, not provider SDKs. Gemini and Groq are isolated adapters. Remaining coupling is chiefly knowledge/prompt construction in `AiService`, not infrastructure coupling. A GPT or Claude adapter can be added without changing Engine or Brain contracts.

## What should not change now

- Do not replace the modular monolith, Prisma/Postgres, Vercel Blob, QStash cron model, current provider gateway, or evidence-based memory.
- Do not add a vector database before SQL/structured selection fails a measured retrieval need.
- Do not create many autonomous agents or let a model perform billing, authorization, scheduling arithmetic, or publishing checks.
- Do not rewrite publishing into a generic platform framework until a third production platform creates concrete shared behavior.

## ICM principles selected and rejected

Adopted: progressive context discovery through root/local guides; explicit domain boundaries; task-specific context packages; stable logical resource names; per-section budgets; provenance and selection reasons; separation of static knowledge, persistent memory, and working context; human-inspectable decision metadata.

Rejected for now: representing customer memory as repository files; mirroring every runtime concept as a directory; loading all context into a single system prompt; a vector store without measured retrieval need; a general multi-agent runtime; a generic platform mount framework before multiple implementations share a stable contract. These would add cost and abstraction without solving a current production constraint.
