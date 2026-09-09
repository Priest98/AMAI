# Architecture audit findings

## High

### Raw AI prompt and completion retention

**Problem:** `AiUsageLog` stores complete prompts and completions. **Impact:** duplicated tenant content increases privacy, retention, and breach exposure. **Evidence:** `AiService.logUsage()` writes both fields for generation and analysis calls. **Recommendation:** introduce structured usage metadata and a migration/retention policy; keep raw bodies only behind explicit short-lived debugging consent. **Risk:** changing analytics queries and losing incident evidence. **Priority:** next architecture phase.

### Tenant isolation depends primarily on application queries

**Problem:** repository-managed RLS policies are absent. **Impact:** a missed organization/brand predicate in an internal service can cross tenant boundaries despite guarded controllers. **Evidence:** Prisma queries are the primary enforcement; ContextPack previously accepted only `brandId`. **Recommendation:** maintain defense-in-depth scoped service APIs now; audit production Supabase RLS and add policies where compatible. **Risk:** incorrect RLS can break server operations or migrations. **Priority:** immediate audit, staged implementation.

## Medium

### Two context assembly paths

**Problem:** `BusinessBrainService.buildPromptContext` and `ContextPackService` format overlapping knowledge. **Impact:** prompt drift and duplicated tokens. **Evidence:** Engine caption paths used the former while Brain decisions used the latter. **Recommendation:** incrementally migrate real AI tasks to `ContextResolverService`; preserve the legacy method for unmigrated callers. **Risk:** output changes if every workflow migrates at once. **Priority:** caption migrated first; continue task by task.

### Draft edit concurrency is incomplete

**Problem:** `updatedAt` exists, but not all user/agent draft edits require an expected version. **Impact:** concurrent edits may overwrite each other. **Evidence:** publishing has atomic claims, while Post lacks a general version field/compare-and-swap contract. **Recommendation:** add expected `updatedAt` or version checks to edit endpoints before collaborative agents are introduced. **Risk:** clients must handle conflict responses. **Priority:** before multi-actor editing.

### Static platform knowledge is embedded in AiService

**Problem:** platform guidance is code-local rather than a separately versioned knowledge contract. **Impact:** harder review and reuse across tasks. **Recommendation:** extract only when a second workflow consumes the same rules, with golden tests. **Risk:** needless abstraction if done early. **Priority:** later.

## Low

### Repository navigation ambiguity

**Problem:** starter READMEs, inactive/empty scaffolding, generated output, and legacy folder naming can mislead agents. **Impact:** duplicated implementations or work in dead paths. **Recommendation:** use the new repository map and local contexts; remove legacy material only through a separate reviewed cleanup. **Risk:** deleting historical artifacts prematurely. **Priority:** documentation complete; cleanup deferred.
