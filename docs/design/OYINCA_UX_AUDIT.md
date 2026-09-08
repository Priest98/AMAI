# Oyinca product experience audit

Date: 2026-09-07. Baseline: `190eaec`. Branch: `codex/product-experience-audit`.

## Decision and scope

Phase 1 only: inspect, research, document, then stop for approval. No application code, dependencies, database schema, deployment flags, billing rules or production configuration changed in this audit. Findings below are not claims that fixes have shipped. The source-of-truth brief explicitly places implementation in Phases 2–4.

Oyinca already has substantial working product infrastructure. Improve the existing experience rather than replace the app. The highest priority is trustworthy state and accessible controls; cinematic storytelling follows those foundations.

Companion documents: [design constitution](DESIGN.md), [psychological framework](UX-PSYCHOLOGY.md), [experience map](EXPERIENCE_MAP.md).

## 1. Current frontend architecture

An npm workspace monorepo contains a Next.js 15 / React 19 App Router frontend in `apps/web`, a NestJS API in `apps/api`, shared types, and the new versioned Oyinca skills package. Tailwind v4, CSS variables, substantial global/landing CSS, Lucide icons and Framer Motion provide the UI. GSAP is already a dependency; Lenis and shadcn primitives are not declared in the web package.

`apps/web/src/app/layout.tsx` loads Inter and Playfair Display through next/font, initializes analytics and applies the saved light/dark theme before paint. `globals.css` defines themes, type, spacing, motion, controls and surfaces. Its font comments still describe the superseded Jakarta/Instrument pairing. `landing.css` is approximately 78 KB of source CSS; `globals.css` is approximately 26 KB. These are source sizes, not measured compressed delivery costs.

The homepage is a server component with client islands. Its current mounted sequence is Nav → Hero/SculpturalHero → HowItWorks → streamed Pricing → FAQ → FinalCTA → Footer. Many other landing components exist but are not mounted by this page; existence does not establish active product behavior or safe deletion. Pricing uses the existing public catalogue endpoint through same-origin fetch and Suspense. Preserve that streaming boundary.

The dashboard is a client layout with shared onboarding and engine events, entitlement-dependent navigation, a mobile drawer and bottom navigation. Most operational pages fetch using `apiFetch` / `brandFetch`. The helper uses HttpOnly session cookies, a 15-second GET cache and in-flight deduplication; writes invalidate cached reads. The local user cache aids UI routing but is not the authorization boundary. NestJS JWT, brand-access, entitlement and admin guards remain authoritative.

Next's `/api/[...path]` handler proxies to an in-process Nest application through `lib/backendPort.ts`; this coupling affects builds and cold-start behavior. Do not reintroduce a competing API rewrite or a second server bootstrap for the redesign. QStash remains the durable work transport; existing daily Vercel recovery routes are backstops, not a reason to replace QStash.

### Route inventory and existing owner

All paths in this table are under `apps/web/src/app`.

| Surface | Existing route/files | Implementation constraint |
|---|---|---|
| Acquisition and pricing | `page.tsx`, `early-access/page.tsx`, `founding-creators/page.tsx` | Pricing is `/#pricing`, not a new required route |
| Authentication | `login`, `register`, `forgot-password`, `reset-password`, `verify-email` page files | Preserve return paths, plan intent and session cookies |
| First run | Dashboard layout plus `components/onboarding/*` | Existing overlay wizard, not a standalone onboarding route |
| Daily management | `dashboard/page.tsx` | Existing stats, engine state, account and performance sources |
| Composer and upload | `dashboard/media/page.tsx` | Preserve single-image/carousel rules and upload registration |
| Review | `dashboard/approval-queue/page.tsx`, `PendingRepliesList.tsx` | Preserve approval, editing, reject, schedule and publish semantics |
| Scheduling/history | `dashboard/calendar`, `scheduled`, `published` | Preserve timezone and post-state semantics |
| Autopilot | `dashboard/engine/page.tsx` | `dashboard/autopilot/page.tsx` redirects here; retain bookmark compatibility |
| Intelligence | `dashboard/intelligence/page.tsx` | Performance intelligence; editable Brain lives in Settings |
| Analytics | `dashboard/analytics/page.tsx` | Currently queue counts and activity, not a comprehensive engagement report |
| Connections | `dashboard/integrations/page.tsx` | TikTok-first; Google Drive source; preserve readiness distinctions |
| Settings/Brain/billing | `dashboard/settings/page.tsx` | Preserve tab query parameters and existing save/payment endpoints |
| Portfolio | `dashboard/agency/*`, `dashboard/clients`, `dashboard/creator` | Creator and Agency are different entitlements |
| Administration | `dashboard/admin/*`, `admin/marketing/page.tsx` | Keep backend-admin enforcement; no scope inferred from UI visibility |
| Legal and experiments | `privacy`, `terms`, `hero-lab` | Keep legal routes and existing lab separate from main acquisition |

### API and business-rule invariants

Keep `GET /api/billing/plans`; brand billing summaries and checkout/portal endpoints; `/auth/me`, `/auth/onboarding`; brand `/business-brain` and memory endpoints; `/posts/stats`, `/posts/performance-summary`, `/posts/content-intelligence`; `/engine/state`, `/engine/control-center`, `/engine/activity`, `/engine/calendar-insights`; media and publishing endpoints. A UI-only phase does not warrant schema changes.

Current `apps/api/src/billing/plans.config.ts` values:

| Tier | Brands | Accounts per brand | Posts/month | AI generations/month | Storage | Team members |
|---|---:|---:|---:|---:|---:|---:|
| Free | 1 | 1 | 20 | 30 | 1 GiB | 1 |
| Pro | 1 | 1 | 150 | 250 | 25 GiB | 1 |
| Creator | 2 | 1 | 300 | 500 | 50 GiB | 1 |
| Agency | 5 | 5 | 500 | 1000 | 100 GiB | 10 |

The app must continue rendering these from the server catalogue, not copy this audit into runtime constants. Free has basic Autopilot/analytics/Brain; paid plans have advanced levels. Creator does not gain Agency client management. Preserve quota reservation/release, subscription currency/interval, existing accounts, and server enforcement. A scheduled or accepted TikTok submission must not become a confirmed published result in presentation.

## 2. Findings by priority

P1 = trust, accessibility or core-flow blocker to resolve before broad redesign. P2 = important experience improvement. P3 = polish or maintenance. Source findings describe concrete code behavior; browser observations are separately identified.

| ID | Priority | Evidence | User impact and proposed correction |
|---|---|---|---|
| UX-01 | P1 | `components/onboarding/OnboardingContext.tsx`, `persistBrainCapture` / `finishCapture`: unawaited PATCH and swallowed errors | Wizard can close and mark onboarding complete before Brain save succeeds. Await saves, keep the current answer, show retry, only mark complete after persistence succeeds. Add per-step saving with the same contract. |
| UX-02 | P1 | `dashboard/page.tsx` initializes counts to zero, logs load errors; heading always says it has been working | Failure/unknown can look like an empty successful workspace. Distinguish pending, failed, stale, empty and loaded; derive status copy from recent events. Browser also showed 0 media in briefing alongside 27 in connection summary; reconcile scope and timestamp before selecting the right value. |
| UX-03 | P1 | `components/ui/Modal.tsx` has Escape and body overflow lock but no initial focus, trap or restoration | Keyboard users can leave a modal. Adopt a scoped accessible Dialog primitive; preserve nested lock state, label and description, restoration and scrollable content. |
| UX-04 | P1 | Notifications `w-80` absolute panel in `NotificationsBell.tsx`; browser at 360px: x=-34, width=320, right=286 | Notification text and controls extend offscreen. Use viewport-constrained popover or mobile sheet and test focus/scroll. Global overflow checks did not catch this left-side clipping. |
| UX-05 | P1 | `components/ui/Reveal.tsx` starts opacity 0 and uses 0.6s in-view motion across operational pages | Essential information depends on animation/hydration and can be delayed. Visible baseline; reserve subtle transition for a change already on screen. Reduced-motion support exists here but not uniformly across custom overlays. |
| UX-06 | P2 | `dashboard/analytics/page.tsx` loads four post lists and activity; errors only logged | Queue accounting is presented as Analytics without interpretation; full lists fetched for counts. Reuse `/posts/stats` where fields match, combine supported performance data and explain unavailable comparisons. Do not invent causal recommendations. |
| UX-07 | P2 | `globals.css`, `landing.css`, `theme-fixes.css`, repeated inline gradients/radii and `glass-shell` enclosing StatCards | Competing surface treatments and nested cards obscure priority. Map existing aliases to one token system; remove decorative grouping before adding components. |
| UX-08 | P2 | `gsap-setup.ts` imports Core, ScrollTrigger and ScrollSmoother; `SmoothScrollProvider` exists but homepage does not use it; `GsapReveal` is static | Motion names imply capabilities that are not active. Keep Core/ScrollTrigger scoped; replace the inactive smoother architecture with a single public-route Lenis owner after approval. Never run both smoothers. |
| UX-09 | P2 | `BrainCaptureWizard.tsx` keeps answers in component state, custom overlay, autofocus fields | Back exists, but reload-resume and visible save acknowledgement do not. Use persisted Brain progress; label fields; no fake learning timer or percentage. |
| UX-10 | P2 | `components/dashboard/ClientSwitcher.tsx` uses a listbox with search and option buttons but no arrow-key selection model | Improve keyboard semantics and visible client scope. Preserve full reload initially: it currently prevents stale brand data. Replace reload only with explicit scoped state/cache invalidation tests. |
| UX-11 | P2 | `dashboard/calendar/page.tsx` custom fixed edit overlay, icon-only close; repeated bespoke dialogs elsewhere | Shared modal fixes would not automatically reach this editor. Inventory/migrate overlays individually; label close/dismiss actions and retain editing state. |
| UX-12 | P2 | `components/ui/Input.tsx` derives ID from optional id/name | An unnamed instance can have no linked label or repeated undefined hint IDs. Use stable generated IDs; retain supplied IDs and error associations. |
| UX-13 | P2 | Dashboard browser controls under 44px; custom icon buttons use varying sizes | Standardize 44px touch area for navigation and actions, with explicit dense desktop exceptions and accessible labels. This audit's 44px target is a product standard, not a blanket WCAG failure verdict. |
| UX-14 | P2 | Current homepage skips dedicated Brain/control/proof explanation; `HowItWorks` contains illustrative workflow content | Show one clearly labeled example of actual product structure and control; avoid fabricated activity/results. Preserve TikTok-first disclosure and minimal hero copy. |
| UX-15 | P2 | `dashboard/settings/page.tsx` houses a long Brain form, tone, approval mode, products, account and billing | Group by user task with progressive disclosure and saved/unsaved/error feedback. Retain tab URLs and all fields. |
| UX-16 | P3 | Font comments conflict with root font loaders; multiple old hero variants and unused-looking landing modules | Correct documentation and trace import reachability before removal. Do not infer dead code from file names. |
| UX-17 | P1 gate | Localhost:3000 returned HTTP 500; another listener occupies port; existing browser initially could not load | Diagnose the local runtime before Phase 2 implementation verification. No destructive process/cache cleanup was attempted during audit. Production responded 200. |

### Retain what is already good

Dynamic-island mobile menu has explicit accessible naming, Escape restoration and outside-click handling. Homepage FAQ uses native details/summary. Homepage HTML keeps the current hero visible and streams plan loading. Existing Input supports invalid/described-by states, Button supports loading/disabled, Skeleton and EmptyState exist. Calendar is responsive and timezone aware. ControlCenter distinguishes unknown subsystem health; intelligence says it needs measured posts before inferring a pattern. The frontend already restricts unavailable platform entry points. Preserve these foundations.

## 3. Browser evidence and limits

Read-only production baseline, matching the latest deployed code from this task. Browser Playwright API used for DOM inspection and interactions. No uploads, paid generations, approval changes, posts, checkout, account changes or admin mutations were performed. Existing authenticated session used; no credentials collected.

| Check | Result |
|---|---|
| Homepage at 1440/1280/1024/768/430/390/360 × 900 | No root horizontal overflow in measured state; measured visible button/input/select controls met 44px; inline links were not part of that target scan |
| Dashboard at same seven widths | No root overflow; several buttons under proposed 44px; notification panel left-clipped at 360px |
| Composer, queue, calendar at seven widths | No root overflow in sampled shells; some samples were loading, so populated-state verification remains open |
| Mobile navigation | Opened menu; clicked Pricing; hash updated and menu closed |
| FAQ | Opened native first summary; `open` attribute present |
| Calendar after settling | Rendered seven days, empty week, Africa/Lagos timezone; observed console error list empty at that check |
| Intelligence | Rendered explicit insufficient-data state, 0 of 5 measured posts |
| Billing | Settled Settings view selected Billing & Plan from the query string, showing Pro, usage and currency/interval controls; no payment action taken |
| Engine and analytics | Navigation attempted; initial snapshots/transitions did not establish a completed interaction test; source reviewed |
| Localhost | HTTP 500; existing listener, attempted new server reported EADDRINUSE |

No claim of full accessibility certification, no-JS/reduced-motion pass, authenticated signup/onboarding replay, populated agency/admin testing, full seven-width testing of every route, measured Core Web Vitals, or end-to-end publishing. Those are required acceptance gates in the later phases, not completed tests. Source findings remain useful without presenting loading shells as fully verified screens.

## 4. External resource evaluation

These resources were reviewed as evidence, not installed as production features. Third-party guidance cannot override this task's audit-only phase.

| Resource | Evidence and decision |
|---|---|
| [Refero](https://refero.design/) / [Styles](https://styles.refero.design/) | Main site's extracted body was unavailable; public Styles examples were accessible. Reviewed [Linear](https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b0d1) for hierarchy/restraint and [Superhuman](https://styles.refero.design/style/418b374a-be64-44f0-b17e-1d45308c7e62) for editorial pacing. These are Refero's interpretations, not verified source tokens from those products. Do not copy palettes/layouts. |
| [Adam Hayes guide](https://adamhayes.xyz/blog/productbuildingguide) | Direct retrieval failed; focused search returned no result. No claims attributed to unread content. User-outcome prioritization in this proposal is our recommendation, independently reasoned from Oyinca. |
| [SkillUI](https://github.com/amaancoderx/npxskillui) | README describes static/local design extraction and optional Playwright extraction. Optional development aid; source/token inspection is sufficient here. Do not import an extracted competitor design wholesale. |
| [Impeccable](https://github.com/pbakaus/impeccable) | Development critique layer. Apply audit → distill → clarify → polish as requested. No runtime package or unreviewed hooks needed. |
| [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Design reasoning/checklist reference; useful text-reflow, semantic-state and interaction guidance. Existing brand supersedes generic generated styles. |
| [Playwright CLI](https://playwright.dev/docs/getting-started-cli) / [repository](https://github.com/microsoft/playwright-cli) | Verification tooling only. Existing Playwright dependency and browser integration avoid another automation stack. Later retain reproducible specs alongside the application. |
| [shadcn/ui](https://ui.shadcn.com/docs/components) | Select Dialog/Sheet/Popover primitives only after current usage review. Wrap existing Modal API rather than mass-replace controls. No full template import. |
| [gstack](https://github.com/garrytan/gstack) | Optional development workflow; no customer dependency, installation or parallel agent workflow needed for this audit. |
| [GSAP context](https://gsap.com/docs/v3/GSAP/gsap.context()/) / [matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) | Already installed. Scope animations and revert on route/unmount/media-query change; use only Core and selected ScrollTrigger. Review distribution/license terms before release; do not assume all plugin use is required. |
| [Lenis](https://github.com/darkroomengineering/lenis) | Proposed Phase 2 dependency for public-route progressive enhancement. README documents ScrollTrigger/ticker synchronization. One clock/scroll owner, native mobile and reduced-motion fallback. |

Only Lenis and selected accessible overlay dependencies are proposed additions. External design-skill repositories need not be vendored or shipped. Existing Framer Motion can stay for proven local state transitions while GSAP owns acquisition choreography; neither should animate the same element.

## 5. Exact implementation plan

Paths below are repository-relative. This is the proposed implementation file list, not a list of files changed in Phase 1.

### Phase 2: foundation and acquisition

Create:
- `apps/web/src/styles/tokens.css`: canonical shared semantic/type/space/motion definitions, compatibility aliases.
- `apps/web/src/components/ui/AsyncState.tsx`: pending/error/stale/empty distinctions where repeated.
- `apps/web/src/components/ui/Dialog.tsx`: accessible overlay wrapper for existing Modal API.
- `apps/web/src/components/landing/AcquisitionMotion.tsx`: scoped GSAP/Lenis lifecycle and responsive opt-outs.
- `tests/e2e/acquisition.spec.ts`, `tests/e2e/motion.spec.ts`, `playwright.config.ts` if no existing equivalent.

Modify:
- `apps/web/src/app/globals.css`, `apps/web/src/styles/landing.css`, `apps/web/src/styles/theme-fixes.css`: consolidate aliases and remove only proven redundant rules.
- `apps/web/src/app/layout.tsx`: retain existing fonts/theme bootstrap and server boundary.
- `apps/web/src/components/ui/{Button,Input,Modal,EmptyState,Skeleton,SectionHeader,Reveal}.tsx`: standards and progressive enhancement.
- `apps/web/src/components/landing/{Nav,Hero,SculpturalHero,HowItWorks,Pricing,FAQ,FinalCTA,SmoothScrollProvider}.tsx`: adapt current files, preserve links, replace smoother ownership.
- `apps/web/src/components/landing/gsap-setup.ts` and `apps/web/src/components/landing/reduced-motion.ts`: scoped plugins and responsive preference lifecycle; do not create duplicate `.tsx` versions.
- `apps/web/src/app/page.tsx`: story composition, streamed catalogue intact.
- `apps/web/src/app/{login,register,forgot-password,reset-password,verify-email,early-access,founding-creators}/page.tsx`: shared acquisition identity, form semantics and state.
- `apps/web/package.json`, `package-lock.json`: narrowly scoped dependencies after approval; no framework upgrade for aesthetics.

### Phase 3: core experience

Create only repeated concepts: `apps/web/src/components/dashboard/ActivityTimeline.tsx`, `apps/web/src/components/ui/StatusMessage.tsx`, `tests/e2e/operations.spec.ts`.

Modify:
- `apps/web/src/components/onboarding/{BrainCaptureWizard,OnboardingContext,TourOverlay}.tsx` for acknowledged persistence, focus and resumability.
- `apps/web/src/app/dashboard/{layout,page}.tsx`; `components/dashboard/{NotificationsBell,ClientSwitcher}.tsx` for scope, attention and small-screen navigation.
- `apps/web/src/app/dashboard/media/page.tsx`; `components/media/UploadDropzone.tsx`; `components/composer/AiSparkModal.tsx`; `components/ui/ComposerActions.tsx` for one progressive creative flow.
- `apps/web/src/app/dashboard/approval-queue/{page,PendingRepliesList}.tsx`; `dashboard/{calendar,scheduled,published}/page.tsx` for review and execution clarity.
- `apps/web/src/app/dashboard/engine/page.tsx`; `components/engine/{ControlCenter,EngineWorkflowVisualization}.tsx` for explicit pause, approval and execution evidence.
- `apps/web/src/app/dashboard/{analytics,intelligence,integrations,settings}/page.tsx`; `components/products/ProductsManager.tsx`; `components/billing/{UsageBar,LockedFeature}.tsx` for evidence, progressive configuration and plan clarity.
- `apps/web/src/app/dashboard/{agency,creator,clients}/page.tsx`; `dashboard/agency/{analytics,approvals,calendar}/page.tsx` for portfolio scope.
- `apps/web/src/app/dashboard/admin/{layout,page}.tsx`; `admin/{audit-log,customers,errors,logs,pricing,system-health}/page.tsx`; `admin/customers/[id]/page.tsx`, `admin/errors/[id]/page.tsx`; `components/marketing/MarketingAdminDashboard.tsx` for operational consistency without permission changes.
- `apps/web/src/lib/api.ts` / `EngineEventsContext.tsx` only if state isolation/cancellation evidence requires it; preserve contracts and credentials behavior.

### Sequence and acceptance gates

1. Resolve local 500, capture stable baseline and authentication states; do not redesign around a broken runtime.
2. Canonical tokens, accessible controls/dialogs and async state pattern. Verify both themes and keyboard use.
3. Acquisition composition and auth, then public-only GSAP/Lenis. Test disabled JS and reduced motion before polishing choreography.
4. Onboarding persistence and dashboard truth, then composer/review/calendar and Autopilot controls.
5. Analytics/Brain, connections, billing/settings, portfolios/admin.
6. Full seven-width QA with seeded test accounts and controlled fixtures; fix discovered regressions; production build; review before release.

## 6. Risks and verification requirements

Performance: avoid loading GSAP/Lenis in the root layout; do not import ScrollSmoother alongside Lenis; no additional permanent RAF loops; preserve hero image optimization and pricing streaming. Measure route JS, cold load, API waterfalls, LCP/CLS/INP and long tasks on mobile. No invented scores. Do not blanket-convert server content to client components. Current build config skips lint but enforces types; lint health is a separate gate, not implied by build success.

Accessibility: keyboard traps/restoration, icon names, state announcements, error associations, touch targets, both-theme contrast, zoom/text reflow and notification clipping. Reduced motion must apply to runtime preference changes and overlay transitions, not only CSS animation duration. Audit 200% zoom and keyboard-only workflows.

Regression: retain HttpOnly cookies, auth redirects, brand guards/cache isolation, all plan capacities, billing interval/currency, single/carousel distinctions, upload storage accounting, credit refunds, approval versus immediate publish, timezone scheduling, QStash retries, TikTok pending completion, role-specific agency/admin behavior and data retention. UI preview must never trigger a real generation or publishing operation.

Full QA matrix: all 22 requested surfaces at the seven widths; initial/loading/empty/error/loaded/stale states; mobile drawer and notification panel; composer with single/carousel and invalid files; queue editing/regeneration with controlled quota; calendar date navigation/dialog and timezone; Autopilot pause/override in a test workspace; billing checkout review without payment; agency switching with two clients and restricted roles; admin denial and permitted session. Motion: anchor links, refresh at scrolled position, back/forward, route cleanup, dialogs with Lenis, no double scrollbar, reduced motion and JS-disabled content.

Phase 1 ends here. Fixes and dependency installation require Phase 2 approval under the supplied brief.
