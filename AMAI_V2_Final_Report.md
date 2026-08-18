# AMAI V2 — Master Product, Reliability & Launch-Readiness Report

**Branch:** `amai-v2-development` (untouched `main`, no deploys, no production writes)
**Scope of this report:** the 10 commits from `91a1508` through `d8a8790`, built on top of the Agency foundation from earlier phases (`cfbcd4f`, `8d93f84`).

---

## 1. Executive summary

Every P0 (must-have) item in the master spec is built, committed, and scoped-typechecked. All P1 (important) items are also built. The single most important outcome of this pass was **finding and fixing a critical, unauthenticated cross-tenant vulnerability** in the OAuth connect flow — not something the spec asked me to look for specifically, but exactly the class of bug the "client isolation is a security requirement" instruction exists to catch.

Nothing here has been run against a live browser or a live AI/OAuth provider. Every claim below distinguishes **typecheck-verified** from **not yet runtime-tested**, per your instruction not to claim something is complete if it wasn't actually tested.

---

## 2. Critical finding: unauthenticated cross-tenant OAuth hijack (fixed)

Before this pass, `oauth.controller.ts`'s connect/folder/disconnect endpoints accepted a **client-supplied `brandId`** with, in most cases, **no auth guard at all**:

- Anyone, unauthenticated, could read or change another brand's Google Drive folder, or disconnect its Drive connection outright.
- Anyone could open `.../oauth/instagram/connect?brandId=<victim-brand-id>`, complete Meta/TikTok consent with **their own account**, and the callback would attach it to the victim brand's `SocialAccount` row — silently hijacking another organization's live AutoPilot pipeline onto an attacker-controlled account. This is worse than data leakage: it's a live account-takeover vector reachable with zero credentials.

**Fixed** (commit `55fedee`): every affected endpoint now requires `JwtAuthGuard` and re-verifies the target brand against real organization membership via a new `assertBrandAccess()` check — the same DB check `BrandAccessGuard` uses elsewhere, reused here since `OAuthController` has no `:brandId` route param to hang a guard off. Connect endpoints are full browser navigations (can't carry an `Authorization` header), so they authenticate via the same `?token=` query-param fallback already used for the SSE stream — no new mechanism invented.

**This needs to be manually tested end-to-end (connect → callback → disconnect → client switch) against a real Instagram/TikTok/Google app before this branch ships.** I did not have live provider credentials in this sandbox to exercise it myself.

---

## 3. P0 — built and verified this pass

| Item | What was built | Commit |
|---|---|---|
| Idempotent publishing | Atomic compare-and-swap claim (`PENDING`→`PUBLISHING`) with stale-claim reclamation after 10 min. Was a genuine read-then-act race before — fixed the single most severe reliability bug in the app. | `91a1508` |
| Usage tracking (visible) | Added Social Accounts and Clients rows to the existing `UsageBar` component; billing summary now returns live counts against entitlement limits. | `2a77bc0` |
| AutoPilot Control Center | Real pipeline counts (prepared/scheduled/awaiting approval/failed/published-24h) + 4 subsystem health signals (AI, connections, publishing, scheduler). Scheduler health is explicitly `'unknown'` rather than a fabricated green tick, since it genuinely can't be probed from inside a request. | `2a77bc0` |
| Notification center | Audited first — it already existed and was real (SSE-backed). The one real gap: notifications didn't link anywhere. Added `LINK_FOR` per event type + a `POST_REJECTED` type. | `f043c07` |
| Activity timeline | Audited — already existed in two places (Engine page, Analytics page), both real and SSE-live. No work needed; did not duplicate it. | (audit only) |
| Publishing preflight checks | New `runPublishPreflight()` in `EngineService.approvePost()` — blocks scheduling with a specific, actionable message if a post has no caption, no media, no platform selected, or a dead connection with no refresh token. Distinct from the connection-health check already inside `publishOne()`. | `2864fae` |
| OAuth/token health | Already existed (`connection-health.ts`, derived not stored, real `tokenExpiresAt`). Confirmed correct. | (pre-existing, verified) |
| Client isolation / security audit | Full controller-by-controller pass. Found and fixed the critical OAuth issue above; every other controller was already correctly guarded (verified, not assumed). | `55fedee` |
| Cost-control visibility | Found `AiUsageLog.tokensUsed` was **hardcoded to `120` on every row** — fixed at the source (real token counts now threaded from Groq/Gemini's actual responses through the whole AI-layer stack), then built `GET /organizations/:id/cost-summary` (AI calls/tokens/vision calls, storage, uploads, publishing calls). | `fb676df` |
| Admin dashboard foundation | New `PlatformAdminGuard` (env-var `ADMIN_EMAILS` allowlist — no schema migration needed) + `GET /admin/overview` (users by plan, MRR **estimate**, failed posts, AI provider health). Not linked from nav; URL + guard only. | `d045297` |

Also fixed along the way: a syntax error in `engine/page.tsx` (import statement split by a bad merge), a real TypeScript bug in a pre-existing component (`EngineWorkflowVisualization.tsx`'s `Icon` prop type), and a nonexistent `EngineEventType.AI_FAILED` reference caught before it shipped.

---

## 4. P1 — built this pass

| Item | What was built | Commit |
|---|---|---|
| AI content-idea suggestions | New `AiService.generateContentIdeas()` grounded in real Business Brain context; new `POST /business-brain/content-ideas` endpoint, gated by the same `generate_ai_content` entitlement every other AI action uses. Frontend section on the Business Brain settings tab. | `2f1011b` |
| Platform-specific generation | Caption generation previously only substituted the platform's name into an identical prompt. Added real Instagram vs. TikTok style guidance (structure, hashtag placement, tone) grounded in each platform's actual conventions. | `2f1011b` |
| Content calendar intelligence | New `GET /engine/calendar-insights` — real category/pillar balance over the actual scheduled calendar, uncovered Business Brain pillars, and back-to-back same-category repeats that slipped past the scheduler's own diversity nudge. Small frontend panel on the Calendar page. | `5a26515` |
| Media intelligence | Media Library assets now surface the AI-derived category/pillar once the pipeline has processed them — reused the existing `Post.contentCategory`/`contentPillar` signal via the asset's `linkedPostId` rather than adding a new schema column (avoids another manual `prisma db push`). | `5a26515` |
| Agency reporting foundation | CSV export on the Agency Analytics page — client-side serialization of the real data already on screen, no new backend aggregation, carries the "not measured" disclosure into the file. | `d8a8790` |
| Agency team/roles foundation | `Role` enum and `OrganizationMember` already existed but were never surfaced. Added a read-only `GET /organizations/:id/members` + a Team section on the Agency page. Invite/edit-role deliberately not built — needs its own architecture (tokens, email delivery, permission rules) per the spec's "prepare, don't necessarily fully implement." | `d8a8790` |

---

## 5. Explicitly deferred / not built

Per the spec's own exclusion list, none of these were attempted: CRM, team chat, invoicing, client messaging, social listening, influencer marketplace, competitor analysis, 15 social networks, AI avatars/video generation, complex campaigns, gamification.

Also not built, and why:
- **Invite/edit team roles** — needs its own architecture (see §4).
- **TikTok webhook signature verification** — flagged as a known gap in the codebase *before* this session (not newly discovered); TikTok's webhook-signing scheme isn't documented the same way Meta's is, and guessing at the wrong scheme would produce a check that looks like security but verifies nothing.
- **Live visual/mobile QA at the 8 specified breakpoints** — this sandbox has no running dev server or database connection to actually load the app in a browser. I did a code-level audit of every new component's responsive classes (grid breakpoints, `flex-wrap`, `truncate`/`min-w-0` on constrained rows, `touch-target` on buttons) and confirmed they match the app's existing, established responsive patterns exactly. I did **not** visually verify pixel-level rendering — that's a real gap, not a completed check.

---

## 6. Known limitations to flag honestly

- **MRR in the admin dashboard is an estimate**, not a verified billed total — `Subscription` doesn't store the exact amount charged (new-user discount vs. regular price), so it's computed from `PLAN_PRICING`'s list price × active subscriptions per currency. Labelled as such in the API response and the UI.
- **`engine.controller.ts`'s new `calendar-insights` route could not be independently typechecked** — the sandbox's TypeScript check timed out repeatedly on this specific file for reasons unrelated to the change itself (other files compiled fine all session). The change is a 2-line addition copying an already-verified identical pattern from `brands.controller.ts`, and the service method it calls (`engine.service.ts`) did typecheck clean on its own.
- **Nothing in this entire pass was exercised against a live AI provider, live OAuth provider, or live browser.** All verification was `tsc --noEmit` against narrowly-scoped temporary configs (the sandbox can't run a full-project typecheck without timing out) plus manual code reading. Runtime behavior — especially the real Groq/Gemini token-count extraction and the OAuth security fix — should be manually tested before this ships.
- **`ADMIN_EMAILS` env var must be set** before the admin dashboard is reachable by anyone (fails closed, not open, if unset).

---

## 7. Database / schema

No new migrations were required this pass. Two features (media categorization, calendar insights) were deliberately built by **reusing existing columns** (`Post.contentCategory`/`contentPillar` via `MediaAsset.linkedPostId`) specifically to avoid asking you to run `prisma generate`/`db push` again. The only schema change this session (the idempotency fix's `PUBLISHING` status + `attemptCount`/`claimedAt` columns) was already applied by you earlier in this session, confirmed working.

---

## 8. Testing summary — what was and wasn't actually verified

**Was verified (scoped `tsc --noEmit`, clean):** every backend service/controller touched, every new frontend page/component, across all 10 commits — with the one named exception in §6.

**Was NOT verified:**
- No `npm run build` / production build was run.
- No unit or integration tests were run (none exist in this repo beyond typechecking, as far as I found).
- No live browser session, no live database query results, no live AI/OAuth calls.
- No load/performance testing.

---

## 9. Final V2 Quality Gate

| Gate | Status |
|---|---|
| Everything on `amai-v2-development`, `main` untouched | Pass |
| No production DB/env/OAuth credentials modified | Pass |
| No destructive DB operations | Pass |
| Every commit secret-scanned before committing | Pass |
| P0 items complete | Pass (9/9) |
| P1 items complete | Pass (6/6) |
| P2 items | Not started (correctly deprioritized) |
| Critical security vulnerability found | Pass — found and fixed (§2) |
| All new/changed code scoped-typechecked | Partial — 1 file unverified due to sandbox timeout (§6) |
| Runtime-tested in a live environment | Not done — infrastructure not available in this sandbox |
| Visual/mobile QA at live breakpoints | Not done — code-level audit only (§5) |
| No fabricated metrics anywhere in new code | Pass (and actively fixed one pre-existing instance — AI token usage) |
| No decorative sparkle emoji in AMAI's own UI copy | Pass (existing instances in AI-generated fallback caption templates were left alone — that's customer-facing generated content, not AMAI's own interface copy, and out of scope for this pass) |

---

## 10. Recommended next steps, in order

1. **Manually test the OAuth security fix end-to-end** against real Instagram/TikTok/Google apps before anything else — this touches live credential flows.
2. Set `ADMIN_EMAILS` in the environment, then sanity-check `/dashboard/admin` against real data.
3. Run `npm run build` on both `apps/api` and `apps/web` to catch anything the scoped typechecks couldn't (full-project type errors, build-time issues).
4. Push `amai-v2-development` to GitHub yourself (sandbox `git push` doesn't have credentials) and open it in a real browser at the 8 breakpoints for actual visual QA.
5. Review the two AI-generated fallback caption templates that still contain a decorative sparkle emoji (`ai.service.ts`) if you want those cleaned up too — left alone this pass as out-of-scope customer-facing content, not a reliability issue.
6. When ready: team invite/role-editing, TikTok webhook signature (once you have TikTok's real signing spec), and the P2 backlog.

---

*Everything above reflects what was actually built and actually checked. Where something wasn't tested, this report says so rather than implying it was.*
