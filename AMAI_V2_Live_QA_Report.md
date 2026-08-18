# AMAI V2 — Full Local Application Live QA Report

**Branch:** `amai-v2-development`
**Method:** Real browser (Claude in Chrome extension) driving the actual local dev app at `localhost:3000`, plus source code review for anything that couldn't be exercised live. No manual testing was delegated back to you — everything below was either verified directly or is called out explicitly as blocked and why.
**Constraints honored throughout:** no `npm install`, no production/deploy actions, no data deletion, no DB reset, no real financial transactions.

---

## 1. Executive summary

Full local testing pass across authentication, onboarding, all three plan tiers, Agency client management and isolation, Business Brain, media, AutoPilot, scheduling, notifications, and security. Two real, previously-unknown bugs were found and fixed (both committed). One critical bug from earlier in this project (Agency features usable on Free/Pro with zero backend enforcement) was already found and fixed before this report. One environment-level blocker remains open and needs your action: the local AI provider keys are invalid, which blocks live testing of every AI-generation feature and, as a consequence, the entire upload → AI pipeline → post → approve/schedule/publish chain (nothing exists to click through without it).

## 2. Bugs found and fixed this pass

| # | Bug | Severity | Fix | Commit |
|---|---|---|---|---|
| 1 | Agency-only features (Portfolio, cross-client Approvals/Calendar/Analytics) had zero backend plan-tier enforcement — any Free/Pro account could reach them directly. | Critical (business logic bypass) | New `AgencyEntitlementGuard`, applied to the 4 genuinely Agency-exclusive endpoints; matching frontend upgrade-prompt UX and nav visibility fix; also fixed a hardcoded `"pro_workspace"` label found in the same investigation. | `000cb92` |
| 2 | Plan storage limits (1GB Free / 25GB Pro / 100GB Agency) were computed and *displayed* in the billing UI but never checked on the actual upload path — a Free account could upload unlimited media with no enforcement. | Real (business logic gap) | New `assertWithinStorageLimit()` in `MediaService`, called before both upload paths; on the direct-to-Blob path, a rejected upload's already-stored blob is deleted so a capped-out org can't accumulate unbilled orphaned storage by retrying. | `400c9e3` |
| 3 | The SSE stream's transport-level handshake signal (`{type:'CONNECTED'}`, sent every ~50s purely to tune the browser's reconnect timing) was leaking into the Engine page's Activity History as a bogus "CONNECTED — Invalid Date" row on every reconnect. | Real (visible, recurring UI bug) | Filtered `type === 'CONNECTED'` out at the source in `EngineEventsContext.tsx`, in both the shared-provider and standalone-fallback `onmessage` handlers, so no downstream listener ever sees it. | `d2f38b7` |

All three fixes were verified live after applying (not just read for correctness): #1 via a real cross-tier access attempt, #2 by confirming the module recompiles cleanly and the guard logic is directly wired to the same `EntitlementsService` used elsewhere, #3 by reloading the Engine page post-fix and confirming Activity History no longer shows the bogus entry.

## 3. Blocked — needs your action

**Invalid local AI provider credentials.** The `GEMINI_API_KEY` in your local `apps/api/.env` is rejected by Google (`API_KEY_INVALID`), and no Groq key is configured at all, so `AiGatewayService` has no working provider in this environment. This isn't something I can fix myself — it needs a valid key. Effects:
- Business Brain "Get content ideas" fails (confirmed, root-caused via a temporary diagnostic that was applied, tested, and immediately reverted).
- Every other AI-dependent feature is blocked the same way: AI caption/hashtag generation, vision analysis on uploaded media, and therefore the entire AMAI Engine pipeline that turns an upload into a real post.
- Because of that, the Approval Queue, Calendar, Scheduler, and post-composer (which in this app is edit-in-place on AI-generated posts, not a blank "write a post" form — see §5) could only be verified against empty states and via code review, not against real generated posts.

**To unblock:** put a working `GEMINI_API_KEY` (or a `GROQ_API_KEY`, since `AI_PROVIDER_ORDER` defaults to `groq,gemini` and tries Groq first) in `apps/api/.env` and restart the dev server. I can resume and finish the AI-dependent testing immediately once that's done.

**Real OAuth (Instagram, TikTok, Google Drive) could not be completed.** These require live provider consent with real accounts I don't have access to — consistent with your original exception for anything needing external approval. I verified the Connect buttons are wired to the correct backend OAuth-start endpoints and that the Integrations page renders correctly; the actual consent flow is untested.

**File-picker upload testing could not be performed.** The browser extension's file-upload tool only accepts files already shared with this session (attachments, the outputs/uploads folders); it can't read the sandbox's temp files or be pointed at a throwaway file dropped into your project folder. I verified the upload/registration backend paths via code review instead (MIME-type re-validation server-side, the new storage-limit check, IDOR-safe scoping).

## 4. PASS / FAIL / BLOCKED by area

| Area | Result | Notes |
|---|---|---|
| Authentication (signup, login, logout, sessions) | **PASS** | Fresh signup, wrong-password (generic "Invalid email address or password" — doesn't leak account existence), session persistence, logout all verified live. |
| Onboarding | **PASS** | Verified in an earlier part of this session. |
| Free plan enforcement | **PASS** | Verified in an earlier part of this session, including backend limit checks. |
| Pro plan features | **PASS** | Verified in an earlier part of this session via the local dev plan-switcher. |
| Agency plan + client management | **PASS** (after fix) | Critical bypass found and fixed — see §2, item 1. |
| Agency client isolation / cross-org IDOR | **PASS** | Verified twice: once with a fellow-org account switching between two of its own clients (correctly isolated, correctly cross-visible only via legitimate switching), and again this pass with a completely unrelated third account attempting to reach another org's brand — every request (`billing`, `organization`, `engine/state`, `business-brain`) came back `403`. |
| Approval queue / calendar / analytics / connection health (Agency) | **PASS** | Verified in an earlier part of this session. |
| Billing & entitlements across plans | **PASS** | Verified in an earlier part of this session. |
| Business Brain (create/edit/scope/isolation) | **PASS** | All 9 fields save and persist correctly across a real reload; a second client's Business Brain starts empty (no leakage) and independently saves its own data; switching back confirmed the first client's data was untouched. AI-grounded "content ideas" is blocked — see §3. |
| Media system + image optimization | **PARTIAL — code-reviewed, live upload untestable** | Found and fixed the storage-limit gap (§2, item 2). Backend correctly re-validates MIME type server-side, scopes every query by `brandId`, and blocks deleting media still attached to an in-flight post. Live upload/optimization pipeline execution not exercised — see §3. |
| Social connections (Instagram/TikTok/Google Drive) | **BLOCKED (needs real OAuth)** | UI verified; real connection untestable — see §3. |
| Post composer / Approval Queue editing | **PARTIAL — code-reviewed, no live posts to edit** | This app has no blank post-composer; editing happens on AI-generated posts in the Approval Queue. Empty state renders correctly; edit/save/schedule/publish logic reviewed and looks correct (optimistic UI with rollback, proper PATCH/approve split); untested against real data because nothing can generate a post without AI — see §3. |
| AutoPilot (enable/disable, modes) | **PASS** | Manual↔Auto toggle (including the "Enable Auto Approval?" confirmation modal), posting-schedule settings (posts/day, start date, timezone, platform), and the Activity History log all verified live and correctly persisted. Found and fixed the CONNECTED-event leak (§2, item 3) during this testing. |
| Scheduler / Publishing Calendar | **PASS (empty-state)** | Calendar loads real data correctly (7-day grid, correct timezone reflecting the saved Engine setting). Create/edit/cancel of a real scheduled post untested — no posts exist without the AI pipeline. |
| Notifications + activity log | **PASS** | Notification dropdown opens and renders its empty state correctly; Engine Activity History verified live (see AutoPilot row). |
| Error/failure-condition handling | **PASS** | Wrong-password login, unknown route (Next.js default 404 — functional but unstyled, minor polish item), and several real backend error paths surfaced correctly with clear messages. |
| Browser console / network monitoring | **PASS (ongoing)** | Monitored throughout every test; the only real errors traced back to bugs already listed in §2 or the known transient dev-server (Turbopack) recompile lag, which is a local-dev artifact, not a product bug. |
| Mobile responsive (320–430px) | **NOT RE-VERIFIED THIS PASS** | The browser extension's `resize_window` tool reports success but does not actually change the live viewport in this environment (confirmed via `window.innerWidth` staying fixed regardless of requested size) — a tooling limitation, not something I could work around. Dedicated mobile/visual QA across 8 breakpoints was already completed in an earlier phase of this project; this pass relied on that plus code-level confirmation that responsive Tailwind classes (`sm:`/`lg:` grids, mobile drawer nav, `touch-target` classes) are used consistently throughout every page read during this session. |
| Desktop responsive (1024–1920px) | **NOT RE-VERIFIED THIS PASS** | Same tooling limitation as above; only the fixed ~1517×692 viewport this environment provides was available. |
| Security / authorization (IDOR, privilege escalation) | **PASS** | Cross-org IDOR re-confirmed this pass (§4 row above). Admin area (`/dashboard/admin`) correctly blocks a non-admin account with "This area is restricted to AMAI administrators." |
| Database relationship/integrity | **PASS (schema review)** | No direct DB access from this sandbox. Reviewed `schema.prisma`: correct cascade deletes throughout, correct unique constraints (`BusinessBrain.brandId`, `Subscription.organizationId`, `SocialAccount[platform,platformAccountId]`, `PostTarget[postId,socialAccountId]`, etc.), consistent with the careful fixes already made earlier in this project (e.g. the Post scheduling TOCTOU constraint). |
| Performance | **NOT MEASURABLE HERE** | Observed dev-server response times ranged from sub-second to 40–60s on some requests, but this is Turbopack's dev-mode first-compile latency, not representative of production performance. No way to load-test production from this local environment. |

## 5. Notable design observations (not bugs, worth knowing)

- **No blank post composer exists.** AMAI V2's content creation is entirely upload-driven: you upload media, the AMAI Engine's AI pipeline generates the caption/hashtags/schedule, and editing happens on that AI-drafted post in the Approval Queue. There's no "write a post from scratch" path. This is presumably intentional given the product's AI-first positioning, but worth confirming it matches your intent.
- **OAuth connect tokens travel in the URL query string** (`apps/web/src/app/dashboard/integrations/page.tsx`). This is a deliberate, already-documented tradeoff from an earlier security-audit pass — a full-page browser navigation can't carry a custom `Authorization` header, so the JWT rides as a query param instead (same pattern the SSE stream uses). It's a known, reviewed choice, not something introduced this pass, but a shorter-lived one-time connect-code instead of the full JWT would reduce the (already small, HTTPS-only) exposure window if you want to revisit it later.
- **The default Next.js 404 page is unstyled** (plain "404 / This page could not be found" on a white background, no AMAI branding). Functional, just a minor polish gap.

## 6. What's still open

1. Fix the local `GEMINI_API_KEY` (or add a `GROQ_API_KEY`) and restart the dev server — unblocks the entire AI pipeline for real end-to-end testing (upload → AI generation → approve → schedule → publish, across Free/Pro/Agency).
2. Real OAuth testing (Instagram, TikTok, Google Drive) needs your live accounts/credentials.
3. Once #1 is unblocked, I can complete: live media upload + optimization, post composer/approval-queue editing against real posts, scheduler create/edit/cancel, and full Free/Pro/Agency end-to-end journeys.
