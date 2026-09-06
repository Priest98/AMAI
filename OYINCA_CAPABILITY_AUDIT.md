# Oyinca Intelligence & Capability Stack Audit

**Date:** 2026-09-06  
**Scope:** Architecture and integration assessment only. No implementation was performed.  
**Decision principle:** The Oyinca Brain remains the product's intelligence and decision layer. External projects are replaceable providers, tools, or references.

## Executive decision

Oyinca should build one small capability boundary, then add market intelligence and a curated marketing skill registry behind it. It should not import or run any of the ten repositories inside the main application at this stage.

The best near-term work is:

1. **ADAPT NOW:** Last30Days concepts into an original, typed `ResearchProvider` contract and a policy-compliant provider adapter.
2. **ADAPT NOW:** Marketing Skills concepts into an original, versioned Oyinca skill catalog selected by the Brain.
3. **STUDY / BORROW:** Dify's provider, workflow-state, retry, tracing, and structured-output patterns; gstack's engineering gates; shadcn/ui's accessible primitive patterns.
4. **DEFER:** Novu, OpenReplay, Papermark, Cap, and Devopness until concrete scale or product triggers justify their operational and licensing cost.

This produces the highest intelligence gain while preserving the existing production pipeline, QStash scheduling, Supabase data layer, premium UI, and provider independence.

## 1. Current Oyinca architecture

### Runtime shape

Oyinca is a TypeScript monorepo with a NestJS API in `apps/api`, a Next.js web application in `apps/web`, shared packages, and a Prisma/PostgreSQL data model. Vercel hosts the application. QStash and authenticated HTTP endpoints drive durable scheduled work; Supabase provides PostgreSQL and Realtime; Vercel Blob provides media storage.

```text
Web (Next.js)
  ├─ onboarding, brand, content, media, scheduling, growth, billing, admin
  ├─ PostHog product events
  └─ Sentry client errors
             │ HTTP / Realtime
             ▼
API (NestJS)
  ├─ Auth / organizations / billing / entitlements
  ├─ Brands + Products + Business Brain memory
  ├─ AI service → AI gateway → Gemini | Groq
  ├─ Media → optimization registry → platform optimizers
  ├─ Posts → Engine → Queue → publishing
  ├─ Growth + Metrics + Learning
  ├─ OAuth + Webhooks
  ├─ Email + Telegram + Engine events
  └─ Health + errors + audit logs + admin
             │
             ├─ QStash / authenticated cron callbacks
             ├─ PostgreSQL via Prisma
             ├─ Supabase Realtime
             └─ platform and AI APIs
```

### What is mature

| Area | Current state | Assessment |
|---|---|---|
| AI provider layer | `AiProviderAdapter`, `AiGatewayService`, Gemini/Groq adapters, key health, provider ordering, timeouts, usage logs | Strong reusable pattern for the new capability layer |
| Business Brain | Persistent `BusinessBrain` and `MemoryEntry`; brand, audience, voice, goal, product and learned-insight prompt context | Useful foundation; context is still largely a formatted string rather than a typed context pack |
| Engine | Scheduling, approval/autopilot states, publishing jobs, events, health checks, learning | Strong execution core; should remain independent of research availability |
| QStash/cron | Authenticated HTTP job entry points and scheduler health monitoring | Correct production model for serverless execution; preserve it |
| Media optimization | Interface, registry, per-platform optimizers, image/video engines | Best internal example of a replaceable capability registry |
| Billing | Provider interface with Stripe and Paystack, entitlements and usage | Good separation; no capability work needed |
| Observability | Sentry, PostHog, error groups/events, audit log, health checks, AI usage, engine events | Broad coverage, but no unified Brain decision trace |
| Security | JWT, encrypted credentials, webhook verification, throttling, audit records | Solid base; external research expands the threat surface materially |

### What is partial or coupled

| Area | Finding | Implication |
|---|---|---|
| Publishing | Instagram and TikTok behavior lives inside `PublishingService` | Extract an interface only when adding another publisher or substantially changing these adapters |
| Notifications | Email, Telegram, engine events and the web notification bell are separate mechanisms | Add one domain-level notification contract before adding Novu |
| Intelligence | Brand memory and performance learning exist; market/audience trend intelligence does not | Phase 1 should fill this gap |
| Skills | Prompt behavior exists in services, but no named/versioned skill registry | Marketing knowledge cannot yet be selected, measured, or improved independently |
| Context assembly | `BusinessBrainService` creates compact prompt context | Evolve it into typed, relevance-filtered context sections; do not create one giant prompt |
| Decision observability | AI usage and engine events exist separately | Store reason codes, selected skills/providers, latency and cost without chain-of-thought |
| Feature flags | Frontend has environment-based flags for platforms | Add server-side capability flags; provider secrets must never use `NEXT_PUBLIC_` |

### Existing data model

The Prisma schema already covers users, organizations, subscriptions and usage; brands, products, Business Brain and memory; social accounts; media and optimized assets; posts, targets, publishing logs and performance; engine configuration/events; pending replies and growth settings; AI provider health/usage; health checks, incidents, errors and audit logs; and marketing attribution. This is sufficient for the abstraction work. Only one new durable market-intelligence cache model is justified in Phase 1.

## 2. Gap analysis

### Product intelligence gaps

- No market-research provider contract, normalized research result, provenance policy, or durable research cache.
- No typed `AudienceContext`, `MarketContext`, `PerformanceContext`, or `StrategyContext` assembled by relevance and token budget.
- No versioned catalog for hooks, captions, positioning, repurposing, experiments, campaigns, or competitor analysis.
- No explicit orchestration record connecting an objective to context, selected skill, provider, model, decision, execution, and outcome.
- Learning is downstream of posts, but it does not yet close the loop into a persistent strategy artifact.

### Platform gaps

- Notification events, preferences, routing, retries and delivery outcomes lack one abstraction.
- Session replay is absent; PostHog and Sentry cover analytics/errors but not UI reproduction.
- Some capable areas use registries while publishing and notifications do not share that pattern.
- External-content defenses are absent because external research has not yet been introduced: source allowlists, prompt-injection isolation, URL validation, provenance, freshness and tenant-scoped caching are required first.

### Avoidable duplication

- Do not add another AI gateway, workflow engine, database, queue, scheduler, analytics event system, design system, authentication system, or media pipeline.
- Do not create a second Brain. The capability registry reports facts and executes bounded tasks; the Brain combines evidence and decides.

## 3. Repository evaluation

### 3.1 gstack — STUDY / BORROW ARCHITECTURE

**What it is:** An AI engineering workflow of role-oriented skills plus browser, review, QA, planning, release and documentation tools. Its package declares MIT. Sources: [repository](https://github.com/garrytan/gstack), [package metadata](https://github.com/garrytan/gstack/blob/main/package.json).

**Useful ideas:** Explicit planning, design review, code review, QA, release checks, browser verification, and documented gates. These improve how Oyinca is built rather than what customers run.

**Decision:** Keep outside production dependencies. Adapt a small set of repository-local development checklists or agent skills only when the team chooses them. Retain the MIT notice for copied substantial material. No runtime credentials or customer data should be exposed to development tools.

**Overlap:** Existing test/build/deployment workflow. **Value:** medium-high for engineering. **Complexity:** low if used as process, high if its tooling is embedded. **Cost:** developer time only. **Risk:** tool permissions and workflow lock-in.

### 3.2 Last30Days — ADAPT NOW

**What it is:** A Python 3.12+/Node agent skill that gathers and synthesizes recent public discussion from multiple sources. The current skill lists Reddit, X, YouTube, TikTok, Hacker News, GitHub and web sources, with optional provider and session credentials. It is MIT licensed. Sources: [repository](https://github.com/mvanhorn/last30days-skill), [skill contract](https://github.com/mvanhorn/last30days-skill/blob/main/skills/last30days/SKILL.md), [license](https://github.com/mvanhorn/last30days-skill/blob/main/LICENSE).

**Useful ideas:** Recency windows, source health checks, multi-source synthesis, engagement-weighted evidence and citations.

**Decision:** Do not embed the agent skill or invoke an unrestricted shell from the NestJS request path. Define an original TypeScript `ResearchProvider` contract. Start with lawful official APIs and ordinary web search through a separately deployed, least-privileged adapter. Normalize output, validate it, cache it, and keep source evidence. Treat cookie-based X credentials (`AUTH_TOKEN`, `CT0`), unofficial clients, browser automation, and scraping as prohibited for production until legal/security review approves a specific method.

**Overlap:** None in market intelligence; AI gateway can synthesize results but should not fetch them. **Value:** very high. **Complexity:** medium-high. **Cost:** search/API calls, one synthesis call per cached briefing, storage. **Risk:** ToS, data quality, prompt injection, credential handling, provider churn.

### 3.3 Marketing Skills — ADAPT NOW

**What it is:** A broad catalog of AI-agent marketing skills covering CRO, copywriting, SEO, analytics, research and growth engineering, licensed MIT. Source: [repository and license statement](https://github.com/coreyhaines31/marketingskills).

**Useful ideas:** Task decomposition, structured instructions, checklists and domain-specific output expectations for copywriting, positioning, customer research, content strategy, experiments and competitive analysis.

**Decision:** Curate only the social-media-relevant concepts into original Oyinca skill definitions. Each skill should have an ID, version, objective schema, required context, output schema, safety rules, cost tier and evaluation criteria. Copying substantial text requires retaining its MIT notice; original reimplementation is preferable for Oyinca-specific behavior.

**Overlap:** `AiService`, `GrowthService`, `MarketingService`, and Business Brain prompts. **Value:** very high. **Complexity:** medium. **Cost:** mostly model tokens and evaluation effort. **Risk:** prompt sprawl, generic advice, untraceable version changes, and accidental copyrighted text reuse.

### 3.4 Novu — DEFER

**What it is:** Notification infrastructure for workflows and multiple channels. It uses an open-core model: core is MIT while named enterprise directories use a commercial license. Source: [repository README and license boundaries](https://github.com/novuhq/novu/blob/next/README.md).

**Useful ideas:** Domain-event triggers, templates/workflows, channel routing, preferences, digesting and delivery state.

**Decision:** First create Oyinca's own `NotificationService` and providers for current email, Telegram/admin and in-app engine events. Add a Novu adapter only when end-user push, per-user preferences, localization or high notification volume makes build-vs-buy favorable. Never emit Novu calls from domain services directly.

**Overlap:** Email service, Telegram service, engine events, notification bell. **Value now:** medium. **Complexity:** medium. **Cost:** hosted subscription or self-hosted services plus maintenance. **Risk:** customer metadata leaves Oyinca, template/provider lock-in, mixed license boundaries.

### 3.5 Papermark — DEFER

**What it is:** A document-sharing and analytics product suited to secure links, branded reports and data rooms. Core content defaults to AGPLv3 and enterprise code has a commercial license. Sources: [repository](https://github.com/papermark/papermark), [root license](https://github.com/papermark/papermark/blob/main/LICENSE), [enterprise license](https://github.com/papermark/papermark/blob/main/ee/LICENSE.md).

**Useful ideas:** Expiring links, viewer analytics, branded report sharing, domains and access controls.

**Decision:** Borrow product requirements, not code. When Agency reporting becomes a validated paid need, build a small native Oyinca report-share capability or use Papermark as an external service after privacy and commercial review. Do not mix AGPL server code into the proprietary API.

**Overlap:** Marketing/admin data but no client reporting portal. **Value now:** low-medium. **Complexity:** high. **Cost:** hosted product or substantial self-hosting. **Risk:** AGPL obligations, private analytics exposure, scope expansion.

### 3.6 OpenReplay — DEFER

**What it is:** Self-hostable session replay, product analytics and debugging. The repository uses mixed licensing: specified directories are MIT and remaining content defaults to AGPLv3. Sources: [repository](https://github.com/openreplay/openreplay), [license](https://github.com/openreplay/openreplay/blob/main/LICENSE).

**Useful ideas:** Session replay, network/error correlation, funnels and issue reproduction.

**Decision:** PostHog plus Sentry is adequate now. Run a short hosted evaluation only after a privacy design is approved. Default-deny recording on auth, billing, OAuth, media preview/upload, private content and token-bearing routes; mask text inputs and network payloads; use short retention and tenant-independent access controls. Do not self-host its stack at current scale.

**Overlap:** PostHog, Sentry, ErrorEvent/ErrorGroup, health monitoring. **Value now:** medium. **Complexity:** medium hosted/high self-hosted. **Cost:** event/session volume or storage/compute. **Risk:** replaying sensitive customer content and AGPL obligations if code is incorporated.

### 3.7 shadcn/ui — STUDY / BORROW ARCHITECTURE

**What it is:** Open-code component recipes distributed into an application's source; MIT licensed. Sources: [repository](https://github.com/shadcn-ui/ui), [license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md), [architecture description](https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/%28root%29/index.mdx).

**Useful ideas:** Accessible interaction patterns for dialogs, drawers, dropdowns, popovers, commands, tooltips, tabs, forms, calendars and tables.

**Decision:** Keep Oyinca's design tokens and existing primitives. Adopt a missing primitive selectively, compare dependencies and bundle impact, then fully restyle it. Preserve license notices for copied source. Do not initialize a second generic visual system or bulk-install components.

**Overlap:** Existing Button, Input, Modal, Badge, Skeleton and premium UI. **Value:** medium. **Complexity:** low per primitive. **Cost:** maintenance and dependencies. **Risk:** visual drift and duplicated primitives.

### 3.8 Cap — DEFER

**What it is:** A Loom-style recorder/editor/share product with recordings, comments, transcripts, analytics, workspaces and storage. Most content is AGPLv3; named camera/capture crate families are MIT. Source: [repository README and license split](https://github.com/CapSoftware/Cap/blob/main/README.md).

**Useful ideas:** Local capture, multipart upload, asynchronous processing, transcripts, share/review flows and custom storage.

**Decision:** Do not integrate its application. If customers later request screen-based social creation, evaluate the MIT capture crates independently and send outputs through Oyinca's existing media pipeline. A browser-native recorder built around standard APIs may be simpler.

**Overlap:** Media upload, optimization and storage already exist. **Value now:** low. **Complexity:** high. **Cost:** video compute, storage, bandwidth and transcription. **Risk:** AGPL, native binaries, sensitive screen content.

### 3.9 Dify — STUDY / BORROW ARCHITECTURE; REJECT RUNTIME INTEGRATION

**What it is:** A broad AI application/workflow platform with model providers, tools, RAG, agent execution, workflow state and observability. Its modified Apache 2.0 license adds conditions, including a commercial-license requirement for specified multi-tenant use and frontend branding restrictions. Sources: [repository](https://github.com/langgenius/dify), [license](https://github.com/langgenius/dify/blob/main/LICENSE).

**Useful ideas:** Typed nodes, execution state, retries, provider health, structured outputs, prompt versions, tool permissions, run tracing and model fallback.

**Decision:** Translate these patterns into small native Oyinca abstractions. Do not deploy Dify, proxy Brain calls through it, use its frontend, or copy source. Its additional multi-tenant condition is especially unsuitable for Oyinca's SaaS core without a commercial agreement.

**Overlap:** AI gateway, Brain, QStash orchestration, Prisma, metrics. **Value as reference:** high. **Complexity as runtime:** very high. **Cost:** duplicate application, workers, databases/vector store and operations. **Risk:** architectural duplication, license limits, data exposure, split observability.

### 3.10 Devopness — DEFER

**What it is:** An API/MCP-centered platform for provisioning and operating cloud infrastructure, deployment and CI/CD; its public repository contains SDKs, UI, documentation and examples under Apache-2.0. Source: [repository](https://github.com/Devopness/devopness).

**Useful ideas:** Declarative environments, deployment history, controlled infrastructure operations, RBAC and cross-cloud workflows.

**Decision:** Vercel, Supabase, QStash and Blob match current needs. Revisit only when there is a documented move to VPS/container infrastructure, multi-cloud requirements, or a material cost/residency reason. Evaluate the hosted platform/API separately from the open-source SDK license.

**Overlap:** Vercel deployment and managed services. **Value now:** low. **Complexity:** high during migration. **Cost:** platform plus servers and operating labor. **Risk:** infrastructure credential scope, migration downtime, two control planes.

## 4. Integration matrix

| Repository | Capability | Integration Type | Oyinca Location | Priority | Complexity | Risk | License | Recommendation |
|---|---|---|---|---|---|---|---|---|
| Last30Days | Recent market research | External adapter + original contract | `apps/api/src/capabilities/research` | P0 | M-H | High | MIT | **ADAPT NOW** with official/approved sources, validation and cache |
| Marketing Skills | Marketing reasoning skills | Curated original skill definitions | `packages/oyinca-skills` + Brain selector | P0 | M | Medium | MIT | **ADAPT NOW**; retain notice for copied material |
| Dify | Workflow/provider patterns | Architecture reference only | Brain/capability design docs | P1 | L to study | Low | Modified Apache 2.0 | **STUDY / BORROW**; **REJECT** runtime use |
| gstack | Engineering workflow | Development process/tooling | Repository development workflow | P1 | L | Medium | MIT | **STUDY / BORROW** outside production |
| shadcn/ui | Accessible UI primitives | Selective source adoption | `apps/web/src/components/ui` | P2 | L per item | Low-M | MIT | **STUDY / BORROW** only when a primitive is missing |
| Novu | Notification routing | Optional provider adapter | `apps/api/src/capabilities/notifications` | P2 | M | Medium | MIT core + commercial EE | **DEFER** until notification abstraction and scale trigger |
| OpenReplay | Session replay/debugging | Hosted SDK evaluation | `apps/web` observability boundary | P3 | M | High | Mixed MIT/AGPLv3 | **DEFER** pending privacy review |
| Papermark | Branded report sharing | External service or native feature | Future agency reporting | P4 | H | High | AGPLv3 + commercial EE | **DEFER**; borrow requirements only |
| Cap | Screen recording workflow | Future isolated capture provider | Future creator/media capability | P4 | H | High | AGPLv3; select crates MIT | **DEFER** |
| Devopness | Infrastructure operations | Future external control plane | Deployment/operations | P4 | H | High | Apache-2.0 repo | **DEFER** until infrastructure trigger |

## 5. Proposed architecture

```text
User objective / scheduled objective
                 │
                 ▼
              OYINCA BRAIN
  ┌───────────────────────────────────────┐
  │ Context Pack Builder                  │
  │ brand · audience · platform · content │
  │ market · performance · strategy       │
  ├───────────────────────────────────────┤
  │ Skill Selector + Decision Policy      │
  │ reason codes · budget · approval mode │
  └───────────────────────────────────────┘
                 │ typed request
                 ▼
          CAPABILITY REGISTRY
  ┌──────────┬───────────┬───────────────┐
  │ Research │ Marketing │ Notifications │
  │ Analytics│ Publishing│ Media         │
  └──────────┴───────────┴───────────────┘
                 │ bounded provider calls
                 ▼
 Providers: approved research APIs/search, Gemini/Groq,
 current email/Telegram, social APIs, media engines
                 │
                 ▼
     QStash-backed Engine execution
                 │
                 ▼
     Measure → Learning → Brain memory/strategy
```

### Responsibility boundaries

- **Brain:** interprets objectives, requests context, selects skills, creates a structured plan, decides subject to approval policy, and records reason codes.
- **Context Pack Builder:** fetches only relevant tenant-scoped data and enforces token/age limits.
- **Skill Registry:** deterministic, versioned marketing knowledge and schemas; it never publishes.
- **Capability Registry:** resolves enabled providers by capability and health. It owns timeouts, fallback, caching policy and telemetry wrappers.
- **Provider adapter:** translates one external API/process into an internal contract. It never reads arbitrary database tables.
- **Engine/QStash:** executes durable approved work and remains available when optional intelligence providers fail.
- **Learning:** measures published outcomes and updates bounded facts/strategies, preserving provenance and confidence.

### Core contracts

```ts
interface CapabilityProvider<TRequest, TResult> {
  readonly id: string;
  readonly capability: CapabilityKind;
  isAvailable(): Promise<boolean>;
  execute(request: TRequest, context: ExecutionContext): Promise<TResult>;
}

interface ResearchProvider extends CapabilityProvider<ResearchRequest, MarketIntelligence> {}

interface OyincaSkill<TInput, TOutput> {
  id: string;
  version: string;
  requiredContext: ContextSection[];
  costTier: 'low' | 'standard' | 'deep';
  inputSchema: unknown;
  outputSchema: unknown;
}
```

`ExecutionContext` should contain organization/brand IDs, correlation ID, deadline, cost budget and privacy policy. It must not contain raw OAuth tokens; adapters receive only the provider-specific secret they need from server-side configuration.

### Context pack policy

1. Start from the objective and selected candidate skill.
2. Load only declared context sections.
3. Summarize persistent brand facts separately from time-sensitive signals.
4. Attach provenance, captured time, confidence and expiration to external facts.
5. Enforce per-section and total token budgets.
6. Keep external text in a quoted data boundary with instructions that it is untrusted.
7. Validate model output against the selected skill's schema.

## 6. Exact file plan

The paths below are the recommended implementation plan, not changes made by this audit.

### CREATE — Phase 1 foundation

```text
apps/api/src/capabilities/capabilities.module.ts
apps/api/src/capabilities/capability-registry.service.ts
apps/api/src/capabilities/interfaces/capability-provider.interface.ts
apps/api/src/capabilities/interfaces/capability-execution.types.ts

apps/api/src/capabilities/research/research-provider.interface.ts
apps/api/src/capabilities/research/research.types.ts
apps/api/src/capabilities/research/market-intelligence.service.ts
apps/api/src/capabilities/research/providers/last30days.adapter.ts
apps/api/src/capabilities/research/research-cache.service.ts

apps/api/src/business-brain/context/context-pack.types.ts
apps/api/src/business-brain/context/context-pack.service.ts
apps/api/src/business-brain/skills/skill-selector.service.ts

packages/oyinca-skills/package.json
packages/oyinca-skills/src/index.ts
packages/oyinca-skills/src/types.ts
packages/oyinca-skills/src/registry.ts
packages/oyinca-skills/src/content/*.ts
packages/oyinca-skills/src/marketing/*.ts
packages/oyinca-skills/src/growth/*.ts
packages/oyinca-skills/src/strategy/*.ts

apps/api/src/capabilities/**/*.spec.ts
packages/oyinca-skills/src/**/*.spec.ts
docs/third-party-attribution.md
```

The first skill set should be small: `content.generate_hook`, `content.generate_caption`, `content.repurpose`, `marketing.positioning`, `marketing.customer_research`, `growth.content_strategy`, `growth.experiment_design`, `strategy.competitor_analysis`, and `strategy.campaign_planning`.

### CREATE — only when Phase 2 is approved

```text
apps/api/src/capabilities/notifications/notification-provider.interface.ts
apps/api/src/capabilities/notifications/notification.types.ts
apps/api/src/capabilities/notifications/notification.service.ts
apps/api/src/capabilities/notifications/providers/email.adapter.ts
apps/api/src/capabilities/notifications/providers/telegram.adapter.ts
apps/api/src/capabilities/notifications/providers/engine-event.adapter.ts
apps/api/src/capabilities/notifications/providers/novu.adapter.ts

apps/web/src/lib/observability/session-replay.ts
apps/web/src/lib/observability/privacy-policy.ts
```

### MODIFY — Phase 1

```text
apps/api/src/app.module.ts
  Import CapabilitiesModule.

apps/api/src/business-brain/business-brain.module.ts
  Provide/export context-pack and skill-selection services.

apps/api/src/business-brain/business-brain.service.ts
  Delegate context assembly; preserve existing public behavior during migration.

apps/api/src/ai/ai.service.ts
  Accept a typed context pack and selected skill; continue using AiGatewayService.

apps/api/src/engine/engine.service.ts
  Request Brain plans, never call research providers directly.

apps/api/src/metrics/learning.service.ts
  Feed measured results into typed performance/strategy context.

apps/api/prisma/schema.prisma
  Add only MarketIntelligenceSnapshot in Phase 1; add decision execution records later if needed.

.env.example files / deployment configuration
  Document feature flags, provider configuration, deadlines and cache TTLs.
```

### KEEP

```text
apps/api/src/ai-layer/**
apps/api/src/engine/** QStash/cron execution model
apps/api/src/media-optimization/**
apps/api/src/billing/providers/**
apps/api/src/encryption/**
apps/api/src/oauth/**
apps/api/src/webhooks/**
apps/web/src/components/ui/** visual language and existing primitives
PostHog and Sentry integrations
existing database models and migrations
```

### DEPRECATE — after replacement and parity tests, not immediately

```text
Inline prompt fragments superseded by versioned Oyinca skills
Direct notification calls from domain services after NotificationService exists
BusinessBrainService string-only context assembly after typed context-pack parity
Provider-specific publishing branches only after a publishing interface has a real second use case
```

No file should be deleted in the first capability release.

## 7. Database changes

### Phase 1: one new model

```prisma
model MarketIntelligenceSnapshot {
  id             String   @id @default(cuid())
  organizationId String
  brandId         String
  provider        String
  queryHash       String
  topic           String
  timeWindow      String
  payload         Json
  sourceSummary   Json
  confidence      Float?
  status          String
  generatedAt     DateTime
  expiresAt       DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizationId, brandId, provider, queryHash])
  @@index([brandId, expiresAt])
}
```

Implementation must add proper relations if the current schema's deletion policy supports them. `queryHash` must include provider version, normalized query, source policy, locale and time window. Never use a global cache across tenants where brand context is part of the request.

### Defer

- `BrainDecision` or `CapabilityExecution`: first test whether extending existing `EngineEvent` metadata and `AiUsageLog` correlation is sufficient. Add a dedicated append-only record only when queryability or retention requires it.
- `NotificationPreference`: add with the end-user notification product, not the provider abstraction.
- `Strategy` and `Experiment`: add only after the closed-loop strategy UX and lifecycle are specified.
- Separate `TrendSignal`: keep normalized signals inside snapshot JSON until cross-snapshot querying is proven necessary.

Migration rules: additive migration, nullable/backfillable relations, no destructive rename, deploy schema before writers, feature flag writes, and test rollback by disabling the feature rather than deleting data.

## 8. Environment variables

### Phase 1 baseline

```text
MARKET_INTELLIGENCE_ENABLED=false
MARKETING_SKILLS_ENABLED=false
MARKET_INTELLIGENCE_PROVIDER=disabled
MARKET_INTELLIGENCE_TIMEOUT_MS=20000
MARKET_INTELLIGENCE_CACHE_TTL_HOURS=24
MARKET_INTELLIGENCE_STALE_TTL_HOURS=168
MARKET_INTELLIGENCE_MAX_SOURCES=30
```

Provider-specific keys should be added only for sources approved for production. Potential Last30Days upstream variables include `SCRAPECREATORS_API_KEY`, `BRAVE_API_KEY`, `APIFY_API_TOKEN`, `OPENAI_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY`, and session credentials for some social sources. This audit does **not** approve those providers or cookie/session credentials. Prefer an isolated adapter service with a single Oyinca-side credential:

```text
RESEARCH_PROVIDER_BASE_URL
RESEARCH_PROVIDER_API_KEY
```

### Deferred provider flags

```text
NOVU_ENABLED=false
NOVU_SECRET_KEY
NOVU_APPLICATION_IDENTIFIER

NEXT_PUBLIC_OPENREPLAY_ENABLED=false
NEXT_PUBLIC_OPENREPLAY_PROJECT_KEY
```

Confirm exact vendor variable names against the selected SDK version at implementation time. All capability flags must be server-authoritative. Only intentionally public SDK configuration may use `NEXT_PUBLIC_`.

## 9. Security risks and controls

| Risk | Required control |
|---|---|
| External text contains prompt injection | Treat fetched text as untrusted data, isolate it in the context schema, strip active markup, never grant it tools, and validate final output |
| Scraping or API ToS violations | Per-source approval register; official API first; robots/terms review; rate limits; immediate source kill switch |
| Cookie/session credential theft | Do not use personal browser cookies in production; store approved secrets server-side, encrypted, scoped and rotated |
| SSRF through research URLs | HTTPS-only allowlist, DNS/IP validation, block private/link-local ranges, redirect limits, byte/time limits |
| Cross-tenant cache leakage | Include organization and brand in cache keys and authorization checks; never expose raw cache rows by ID alone |
| Sensitive data sent to providers | Minimize context, redact OAuth/payment/user identifiers, provider data-processing review, documented retention |
| Unbounded cost or denial of service | Entitlements, per-tenant quotas, deduplication, TTL, concurrency caps, request deadlines and circuit breakers |
| False or stale intelligence | Provenance, source timestamps, confidence, expiry, minimum-source rules and user-visible uncertainty |
| Supply-chain compromise | Pin dependencies/commits, verify checksums where possible, dependency review and separate runtime identity |
| Copyleft/license contamination | No wholesale code import; record provenance; keep notices; legal review before AGPL or modified-license use |
| Session replay exposure | Default-deny sensitive routes, mask inputs/network bodies/media, short retention, RBAC and audited access |
| Secret leakage in telemetry | Structured allowlisted fields only; never log prompts, tokens, credentials or raw provider payloads by default |

Provider failure must return typed states such as `fresh`, `cached`, `stale`, `unavailable`, and `policy_blocked`. The Brain may use fresh/cached/stale evidence with clear confidence adjustments. The Engine must continue with existing brand/performance context when research is unavailable.

## 10. Cost implications

These are planning ranges, not vendor quotes; pricing and traffic vary.

| Capability | Primary cost driver | Expected initial impact | Control |
|---|---|---|---|
| Market intelligence | Search/social API requests and synthesis tokens | Low to moderate if generated per brand/topic daily or weekly; expensive if per post | 24h fresh TTL, 7d stale fallback, dedupe, source caps, scheduled refresh |
| Marketing skills | LLM tokens and evaluation | Low; definitions themselves cost no runtime infrastructure | Context budgets, model routing, cached strategy, skill-specific max tokens |
| Novu hosted | Active contacts/events/channels | Additional recurring SaaS cost | Defer; digest; route only actionable events |
| Novu self-hosted | API, workers, Redis/database, operations | Higher operational burden than current needs | Avoid now |
| OpenReplay hosted | Sessions, events, retention | Usage-linked recurring cost | Sampling, route exclusions, short retention |
| OpenReplay self-hosted | Ingestion, object storage, search/database, compute | Material and operationally complex | Avoid now |
| Papermark | Hosted seats/usage or self-host compute | Moderate for an agency feature | Validate paid demand first |
| Cap | Storage, encoding, bandwidth, transcription | High for video-heavy usage | Separate entitlement and quotas |
| Dify | Duplicate services, database/Redis/vector storage, workers | High with no compensating near-term value | Reject runtime integration |
| Devopness/VPS | Platform fee, servers, backups, monitoring, operator time | Migration can exceed managed-stack savings | Revisit from measured Vercel/Supabase costs |

Add cost metadata to capability calls: provider request count, model, input/output tokens, latency, estimated cost and cache status. Aggregate by organization and capability without storing private reasoning.

## 11. Implementation sequence

### Phase 0 — completed by this document

Architecture, overlap, license, security and cost audit. No product code change.

### Phase 1A — capability foundation

1. Write contracts and types first; add a disabled provider registry.
2. Add server-side feature flags and health states.
3. Add tests for provider selection, disabled state, timeout, schema rejection, fallback and tenant separation.
4. Import the module without changing user behavior.

**Exit gate:** existing build/tests pass; disabled capabilities make no outbound request and no database write.

### Phase 1B — market intelligence

1. Approve a source policy and choose one compliant provider path.
2. Implement `MarketIntelligenceSnapshot` with additive migration.
3. Implement Last30Days-inspired adapter in an isolated service boundary.
4. Normalize and validate output; add provenance, cache, stale fallback, rate limiting and cost telemetry.
5. Run in admin-only shadow mode. Compare output quality manually before the Brain consumes it.

**Exit gate:** provider outages do not affect posting; no cross-tenant results; every claim has source metadata; cost is observable.

### Phase 1C — Oyinca skills and context pack

1. Create nine initial skill definitions and schemas.
2. Build the context pack from existing Brain, post-performance and market snapshot data.
3. Add deterministic selection rules before considering LLM-based selection.
4. Route a narrow content-idea flow through the new path behind a flag.
5. Record skill/version, context section IDs, provider/model, reason codes, latency and cost.
6. Compare with current output, roll out by organization, then expand to strategy and growth.

**Exit gate:** quality improves in a documented evaluation set, token cost remains bounded, and disabling the feature restores current behavior.

### Phase 2 — notification abstraction

Unify current providers first. Measure volume and user preference needs. Add Novu only if the measured trigger exists. OpenReplay requires a separate privacy approval and masked staging pilot.

### Phase 3 — engineering and UI

Adopt selected gstack-style review/QA gates outside runtime. Add shadcn-derived primitives individually only when Oyinca lacks an accessible equivalent.

### Later phases

Evaluate agency report sharing (Papermark requirements), screen creation (Cap ideas), and infrastructure migration (Devopness) only from validated product or operational requirements. Continue studying Dify patterns without adding Dify.

## 12. What not to integrate

- Do not clone, vendor or merge any complete external repository into Oyinca.
- Do not make Last30Days, Marketing Skills, Dify or an LLM provider the Brain.
- Do not run an agent skill with unrestricted Bash, filesystem or browser permissions from a customer request.
- Do not use personal session cookies or bypass platform APIs, ToS, robots rules or rate limits.
- Do not perform market research per post; refresh reusable intelligence on a controlled schedule.
- Do not send OAuth tokens, payment data, private media, private messages or complete customer histories to research/analytics providers.
- Do not deploy Dify's runtime or frontend in the Oyinca request path.
- Do not self-host Novu or OpenReplay before current scale proves the need.
- Do not copy Papermark, Cap or OpenReplay AGPL application code into Oyinca's proprietary services.
- Do not use Dify's modified-license source for Oyinca's multi-tenant SaaS core.
- Do not replace PostHog/Sentry until an alternative demonstrates a clear measured advantage.
- Do not replace the current premium design system or bulk-install shadcn components.
- Do not migrate from Vercel/Supabase/QStash to VPS infrastructure during capability work.
- Do not add separate tables for every trend, skill, decision, provider run, strategy and experiment before query and retention needs are proven.
- Do not store private chain-of-thought. Store concise reason codes and structured decision metadata.
- Do not let optional provider failure pause publishing, approvals, scheduling, billing, auth or media access.

## Approval boundary

The recommended first implementation package is **Phase 1A only**: capability contracts, disabled registry, feature flags, tests and no behavior change. Market sources, copied/adapted skill content, database migration and production provider credentials require explicit review after that foundation is inspectable.

