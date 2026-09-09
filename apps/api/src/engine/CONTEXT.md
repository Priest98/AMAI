# Engine, scheduling, approval, and publishing context

## Purpose and architecture

The Engine turns uploads/events into analyzed drafts, captions, targets, schedules, approvals, and publication attempts. `EngineService` orchestrates; `SchedulingService` selects configured slots; `EngineJobsService` recovers pending media and Drive work; `../queue/PublishingService` performs real platform calls. The `queue` name is legacy: production uses synchronous bounded sweeps triggered through QStash/Vercel cron, not BullMQ or a resident worker.

## Data flow

Media upload/Drive sync → persisted `MediaAsset` → Brain analysis and bounded caption context → `Post` + `PostTarget` → manual approval or entitlement-gated Autopilot → due-post sweep → atomic target claim → platform API → publishing log/event → metrics → Brain learning.

## Invariants

- Default approval mode is manual. Brain confidence may reduce autonomy but never grant it.
- Publishing requires connected capability, entitlement/quota, approval policy, and due status.
- Atomic `PENDING`→`PUBLISHING` claims, unique targets, stale-claim recovery, and provider IDs prevent/reconcile duplicate work.
- TikTok remains `SELF_ONLY` until the external content-posting audit flag is explicitly enabled.
- Cron routes require `CRON_SECRET`; both GET and POST handlers are intentional for Vercel Cron and QStash.
- Preserve originals while any sibling target is pending/failed or TikTok processing is asynchronous.

## Dangerous changes and tests

Scheduling, retry, claim, approval, and quota changes can cause duplicate public posts or unauthorized actions. Inspect `tests/production-regressions.test.cjs`, content workflow E2E tests, `vercel.json`, and `../oauth/CONTEXT.md` before changing them.
