# Database context

## Purpose

`schema.prisma` is the authoritative PostgreSQL data model. `migrations` contains additive production migrations. Prisma is used through `PrismaService`; Supabase hosts Postgres and provides a separate Realtime publishing channel.

## Core ownership

`User` joins `Organization` through `OrganizationMember`; an organization owns `Brand` records and one `Subscription`. Most product data is brand-scoped. Brain records carry both `organizationId` and `brandId` for explicit tenant isolation and queryability.

## Important model groups

- Identity: `User`, `AuthIdentity`, `OAuthTransaction`, `Organization`, `OrganizationMember`, `Brand`.
- Brain: `BusinessBrain`, `MemoryEntry`, `ContentAnalysis`, `BrainEvent`, `LearnedInsight`, `InsightEvidence`, `LearningRun`, `BrainDecision`.
- Workflow: `MediaAsset`, `OptimizedMediaAsset`, `Post`, `PostMedia`, `PostTarget`, `EngineEvent`, `AmaiEngineConfig`, `PlatformPostingSlot`.
- Integrations/outcomes: `SocialAccount`, `PublishingLog`, `PostPerformance`, `PendingCommentReply`.
- Commercial/admin: `Subscription`, `PlanPrice`, `UsageRecord`, `BillingWebhookEvent`, `AuditLog`, error and health models.

## Invariants

- New tenant data must have an ownership path and all reads must apply it.
- Use additive migrations. Do not edit an applied migration or perform destructive renames without an explicit migration plan.
- Use unique constraints/transactions for idempotency and concurrency; application check-then-write alone is insufficient.
- Never store plaintext credentials. Raw analytics and durable derived learnings are distinct records.

## Current limitations

There is no repository-managed Supabase RLS policy set; tenant isolation is primarily enforced in Nest guards and Prisma queries. `Post` has no general optimistic version column. `AiUsageLog` stores raw prompts/completions and should be minimized in a future privacy migration.
