# Oyinca Agent Guide

## Product mission

Oyinca is a multi-tenant AI social media manager. Its direction is tool → assistant → social media manager → increasingly autonomous operator. The proprietary layer is the Oyinca Brain: brand and audience knowledge, context selection, policy, memory, learning, and workflow decisions. Gemini, Groq, and future models are replaceable inference infrastructure.

## Repository map

- `apps/web`: Next.js App Router frontend and same-origin API bridge. Read `apps/web/CONTEXT.md`.
- `apps/api`: NestJS application and domain services. Read `apps/api/CONTEXT.md`.
- `apps/api/prisma`: authoritative Prisma/Postgres schema and additive migrations. Read `apps/api/prisma/CONTEXT.md`.
- `apps/api/src/business-brain`: Oyinca Brain, context, memory, skills, evaluation. Read `apps/api/src/business-brain/CONTEXT.md`.
- `apps/api/src/engine`: upload-to-draft orchestration, scheduling, QStash/Vercel cron jobs. Read `apps/api/src/engine/CONTEXT.md`.
- `apps/api/src/queue`: synchronous serverless publishing despite the legacy folder name. Read the engine context first.
- `apps/api/src/oauth`: social connection lifecycle and platform capability state. Read `apps/api/src/oauth/CONTEXT.md`.
- `apps/api/src/billing`: plans, subscriptions, usage, and entitlements. Read `apps/api/src/billing/CONTEXT.md`.
- `packages/oyinca-skills`: versioned, deterministic marketing skill definitions.
- `tests` and `e2e`: architecture/regression tests and browser flows.
- `docs/architecture.md` and `docs/repository-map.md`: system map and task routing.

## Architecture principles

- Understand before modifying. Search before creating. Reuse before duplicating. Extend before replacing.
- Preserve the modular monolith. Prefer simple deterministic code and Postgres over premature services, agents, queues, caches, or vector stores.
- Keep business rules out of UI components and provider adapters.
- Features ask the Brain for relevant context; the Brain reaches models through `AiGatewayService`.
- Models propose semantic output. Deterministic code owns authorization, entitlements, approval, scheduling, idempotency, and external side effects.
- Keep tenant identity in every private-data query and cache key. A `brandId` from input is never proof of access.
- Make the smallest coherent change and keep existing public behavior unless the task explicitly changes it.

## Mandatory workflow

1. Read this file and the nearest applicable `CONTEXT.md`.
2. Inspect the subsystem, its callers, consumers, schema models, and tests.
3. Search for an existing implementation or abstraction.
4. Trace authentication, tenant, database, API, cost, and side-effect implications.
5. Implement the smallest coherent change using existing boundaries.
6. Run focused tests, TypeScript/build checks, and relevant browser checks.
7. Report precisely what changed, what was verified, and any limitation.

## Anti-reinvention rule

Do not create a new API client, database abstraction, authentication system, scheduler, publishing pipeline, AI wrapper, analytics system, queue, cache, storage abstraction, or design primitive until the repository has been searched. Extend a suitable implementation unless a documented constraint prevents it.

## Architectural changes

Do not casually move major folders, replace core libraries, change database/auth/publishing/subscription architecture, bypass the Brain, couple product intelligence to one model, or introduce infrastructure. Before a major change, stop and present the current design, problem, proposal, benefits, risks, and migration impact for explicit approval.

## Security and cost

- Never expose or commit secrets, OAuth tokens, API credentials, service-role keys, or payment data. Keep server-only code server-side.
- Never weaken authorization, tenant checks, approval, subscription enforcement, or webhook verification to make a feature work.
- Redact logs. Do not send credentials or unrelated user data to models. Do not store private chain-of-thought.
- Consider inference, database, storage, bandwidth, serverless duration, social API, and third-party costs. Use bounded context and avoid unnecessary calls.

## Documentation drift

Code and schema are the implementation truth. When a change alters an architectural boundary, invariant, data flow, or public contract, update the corresponding `CONTEXT.md` and architecture document in the same change. Trivial implementation edits do not require documentation churn.

## UI design protocol

- Read `docs/design/OYINCA-DESIGN.md` and the nearest local `DESIGN.md` before changing user-facing UI.
- Use tokens from `apps/web/src/styles/tokens.css` and shared primitives from `apps/web/src/components/ui`; do not introduce page-local palettes or duplicate controls.
- Acquisition may be cinematic and editorial. Product workflows stay calm, dense enough for work, and explicit about state.
- One primary action owns each task region. Buttons act, links navigate, and destructive actions remain visibly separate.
- Preserve keyboard use, 44px touch targets, 16px mobile inputs, reduced motion, readable contrast, and content order without animation.
- Verify affected screens at 360px and 1440px, in light and dark themes, before declaring UI work complete.
