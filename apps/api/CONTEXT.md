# API application context

## Purpose and boundaries

`apps/api` is a NestJS modular monolith. Controllers expose HTTP contracts, guards establish identity/access, services own domain behavior, Prisma owns persistence, and provider adapters isolate external systems. Keep cross-domain orchestration in the Engine or Brain instead of controllers.

## Runtime

`src/app.module.ts` composes modules. `src/main.ts` is local/container bootstrap. In production, the Next.js catch-all API route boots the Nest application in a Vercel function. QStash and daily Vercel Cron backstops call authenticated `/api/cron/*` endpoints; there is no persistent worker.

## Major domains

- `auth`, `brands`: session identity and organization/brand access.
- `business-brain`, `ai-layer`, `capabilities`: proprietary intelligence and replaceable providers.
- `engine`, `queue`, `posts`: content workflow, scheduling, approval, and publishing.
- `oauth`, `webhooks`: external account lifecycle and callbacks.
- `billing`: plans, subscriptions, usage, and entitlements.
- `media`, `storage`, `media-optimization`: upload ownership and derived assets.
- `metrics`, `growth`: outcome collection, learning, and replies.
- `admin`, `health`, `common`: operator visibility and incident capture.

## Invariants

- Guard every user route at the correct user, organization, and brand boundary.
- OAuth secrets remain encrypted at rest and are decrypted only inside server-side integration paths.
- External side effects require deterministic status, approval, entitlement, capability, and idempotency checks.
- Models never decide authorization or execute side effects directly.
- Avoid module cycles; use exported services and event boundaries already present.

## Validation

Run API TypeScript/build checks and relevant root tests. Database work also requires the Prisma context. Architecture changes require updating this file or a domain context.
