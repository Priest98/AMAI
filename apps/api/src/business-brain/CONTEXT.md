# Oyinca Brain context

## Purpose

This is Oyinca's proprietary intelligence boundary: persistent brand knowledge, bounded context assembly, skill selection, content understanding, structured decisions, deterministic evaluation, evidence-backed memory, and learning. Model providers are replaceable infrastructure in `../ai-layer`.

## Responsibilities

- `BusinessBrainService`: owner-provided profile and legacy prompt context.
- `ContextPackService`: queries selected structured sections from existing data.
- `ContextResolverService`: task-specific, tenant-scoped resource selection, provenance, and budgets.
- `OyincaBrainService`: analysis, decisions, evaluation, feedback/outcome events, insights, and learning.
- `brain-policy.ts`: deterministic confidence and autonomy thresholds.
- `skills`: deterministic selection from versioned `packages/oyinca-skills` definitions.

Publishing, quotas, OAuth, scheduling, and final authorization do not belong here. The Brain may recommend an action; it cannot grant itself permission or call a social API.

## Data and flow

Owner profile → `BusinessBrain`/`Product`; experience → immutable `BrainEvent`; repeated evidence → `LearnedInsight`; task → Context Resolver → compact resource-tagged context → `AiGatewayService` → structured/cleaned output → deterministic evaluation → Engine approval policy.

Logical resource identifiers such as `oyinca://brand/identity` describe knowledge boundaries, not physical files or public URLs. Persistent customer memory remains in Postgres.

## Invariants

- Scope private context by organization and brand.
- Explicit owner policy outranks inferred learning. One event cannot create durable preference; minimum evidence, confidence, expiry, and decay remain enforced.
- Never load raw OAuth/payment data, entire histories, or private reasoning into prompts.
- Validate structured model output and fail closed on malformed/unavailable responses.
- Keep task context budgets deterministic and record selected resource URIs in decision traces.

## Validation

Run `tests/oyinca-brain.test.cjs`, `tests/oyinca-skills.test.cjs`, capability tests, API typecheck, and build. See `docs/architecture/context-engine.md` and `docs/architecture/oyinca-brain.md`.
