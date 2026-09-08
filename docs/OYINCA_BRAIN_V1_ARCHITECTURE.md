# Oyinca Brain V1 Architecture

Oyinca Brain V1 is the account-specific intelligence layer above replaceable AI providers. It extends the existing NestJS, Prisma, Supabase/Postgres, Next.js, TikTok, approval, Autopilot, analytics, and QStash architecture. It does not replace those systems.

## Lifecycle

```text
Media upload
  -> structured content analysis (cached by asset fingerprint)
  -> bounded identity, audience, platform, performance and learned context
  -> provider-routed structured decision
  -> deterministic evaluation
  -> existing approval/Autopilot permission checks
  -> existing scheduler and publisher
  -> normalized platform performance
  -> immutable feedback/outcome events
  -> asynchronous evidence aggregation
  -> confidence-weighted learned insights
  -> future context retrieval
```

The internal boundary is `OyincaBrainService`: `analyze`, `getRelevantContext`, `decide`, `evaluate`, `recordFeedback`, `recordOutcome`, `learn`, and `listInsights`. Authenticated brand routes expose the same operations under `/brands/:brandId/business-brain/v1/*`.

## Memory

- **Identity memory** remains in `Brand`, `BusinessBrain`, `Product`, onboarding fields, and explicit generation preferences. Explicit user choices retain the highest authority.
- **Experience memory** uses immutable `BrainEvent` rows for approvals, rejections, edits, schedule overrides, decisions, content analysis, and performance outcomes. The `(brandId, idempotencyKey)` constraint makes retries safe.
- **Learned memory** uses `LearnedInsight` plus `InsightEvidence`. Insights require at least three supporting events, track contradictions and evidence counts, expire after 120 days, and decay with a 180-day confidence half-life. A single edit never becomes a permanent preference.

All records carry both `organizationId` and `brandId`, all retrievals apply both values, and foreign keys cascade with tenant ownership. Global/shared intelligence is outside V1; no private tenant memory is pooled.

## Content intelligence and context retrieval

`ContentAnalysis` stores a versioned JSON structure with media type, topic, subject, pillar, intent, tone, visual context, products, hook, audience relevance, CTA category, keywords, safety considerations, and confidence. A SHA-256 fingerprint prevents repeated analysis of unchanged media.

`ContextPackService` remains the bounded context assembler. It now includes active, unexpired, evidence-backed insights, capped to eight high-signal records and the existing 12,000-character total. Raw credentials, full databases, hidden reasoning, and unrelated tenant records never enter prompts.

## Model routing and cost controls

`AiGatewayService` remains the only provider boundary. Groq and Gemini adapters implement the normalized message/completion contract and can be replaced without changing Brain callers. The gateway handles provider order, key health, timeouts, retries, token reporting, and fallback. Brain decisions use one primary structured generation call. Content analysis is cached; evaluation, confidence, edit comparison, memory decay, scheduling, permissions, quotas, and state transitions are deterministic.

Malformed or unavailable model output produces an empty, low-confidence decision that cannot auto-publish. Stronger semantic evaluation can be added behind the same service without changing callers.

## Evaluation and autonomy

The evaluation checks banned phrases, exact repetition, audience context, hashtag fit, CTA presence, and declared confidence. The resulting action is:

- `accept` at high confidence with passing checks;
- `request_approval` at medium confidence or when semantic review is required;
- `regenerate` at low confidence;
- `escalate` for policy conflicts or exact repetition.

Brain confidence can only reduce autonomy. Auto scheduling still requires the user's Auto Approval setting, an active engine, and an eligible plan. A high Brain score cannot grant permission.

## Feedback and learning

Approval, rejection, regeneration, caption edits, hashtag edits, CTA edits, schedule changes, and disabled recommendations are supported event types. Caption comparison extracts observations such as shortening, emoji removal, and softened promotion. The scheduled learner aggregates repeated observations into evidence-backed insights.

The existing `sync-post-metrics` endpoint remains compatible with QStash POST and Vercel Cron GET. It syncs TikTok metrics, records normalized performance events, runs existing deterministic pillar learning, and runs Brain learning. Each brand failure is isolated so one tenant cannot stop other learning jobs.

## Observability and failure handling

`BrainDecision` records correlation ID, safe reason codes, provider, context sections, latency, token usage, estimated cost, confidence, evaluation, evidence, and outcome. `LearningRun` records trigger, event volume, insights created/updated, status, timestamps, and a non-sensitive error code.

Provider outage, timeout, malformed JSON, absent analysis, missing analytics, database errors, low confidence, and contradictory evidence all fail toward approval or no output. Publishing remains in the existing hardened publishing service, including TikTok token refresh, preflight checks, idempotent claims, retries, and QStash scheduling.

## Extension points

Platform behavior belongs in existing platform adapters and media optimizers. Shared brand memory stays platform-neutral. New providers implement the current AI adapter. Later retrieval may add embeddings behind `ContextPackService`; the Brain boundary and storage contracts do not need to change. New feedback patterns should add deterministic candidates with evidence thresholds before any LLM-based reflection is considered.
