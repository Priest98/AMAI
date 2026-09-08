# Oyinca UX psychology

Phase 1 proposal, 2026-09-07. The product persuades through clarity and credible competence. It must never simulate customer results, urgency, work completed, confidence or progress.

## Acquisition narrative

| Order | Emotional job | Proposed content and action | Truth constraint |
|---|---|---|---|
| Hero | Curiosity | Preserve persona and minimal future-of-management headline; one Meet Oyinca CTA | No unsupported reach/growth statistics |
| Old way | Recognition | Briefly show the repeated work of preparing, reviewing and scheduling | Avoid invented user testimony |
| Introduce manager | Desire | One content input becomes a coherent prepared post | Name TikTok support explicitly |
| Product demonstration | Understanding | Show existing composer/review/calendar anatomy in a labeled example | No fake live activity or functional-looking dead controls |
| Brand understanding | Trust | Voice, audience, products and retained preferences visibly guide a draft | Market context shown only if available, configured and sourced |
| Autopilot | Competence | Prepared → review or scheduling → provider confirmation | Separate accepted/pending from published |
| Control | Safety | Approve, edit, pause and override | Explain Free approval requirement and actual paid entitlement |
| Proof | Credibility | Real product behavior and permissioned evidence | Omit unavailable testimonials/results entirely |
| Pricing | Value and low risk | Capacity differences, billing interval, plan choice | Use actual catalogue and checkout values |
| Final CTA | Action | Meet your AI social media manager | Clear destination and next step |

Consolidate adjacent story beats into a few purposeful sections; this is not a requirement for ten giant sections. Hero art creates attention, product behavior explains the value, control earns trust. The existing minimal hero can stay while the story around it improves.

## Operational surface jobs

| Surface | Feeling and priority | Interface response | Failure to avoid |
|---|---|---|---|
| Signup/login | Confidence | Short labeled form, known destination, preserved plan intent | Lost form entries or unexpected paid commitment |
| Onboarding | Progress and understanding | One question, reason asked, back, acknowledged save and resume | Fake learning animation or marking complete before save |
| Dashboard | Everything is under control | Status → happened/in progress → attention → noticed → recommendation → supporting numbers | Static claim of work while idle or disconnected |
| Composer/upload | Creative momentum | Select media → preparation → caption/tags → timing → preview → explicit action | Exposing every advanced setting before first input |
| Review queue | Control | Account, preview, caption, timing, rationale when available and clear decisions | Approve silently meaning publish now |
| Calendar | Predictability | Local timezone, clear date and account, edit feedback | Ambiguous time conversions or disappearing save failures |
| Autopilot | Trust with control | State, mode, next task, account, reason, pause and override | A green status without verified subsystem evidence |
| Analytics | Useful understanding | Datum → comparison/window → meaning → supported next step | Treating queue counts as engagement or inventing causality |
| Brain | Recognition | Plain-language brand context, editable preferences, learned corrections | Developer configuration language and unsupported claims of omniscience |
| Connections | Readiness | Connected, permission/approval needed, tested, expired, unavailable states | Connected implying safe-to-publish |
| Notifications | Orientation | What happened, when, affected item and recovery link | Clipped panel, raw technical identifiers as primary message |
| Billing | Fair value | Usage, reset date, capacity, interval/currency and manage action | Fake urgency, hidden terms, changing limits for presentation |
| Settings | Safety | Task grouping, explicit saved/unsaved/retry state | Unacknowledged failure after leaving a section |
| Agency | Scope certainty | Client identity and prioritized exceptions before portfolio counts | Mixing two clients' data or actions |
| Creator | Focus | Separate owned identities with clear account switching | Implying Agency team permissions |
| Admin | Operational competence | Permission-aware evidence, filters and explicit impact | Pretty summaries that hide errors |
| Empty | Momentum | Explain absence and the useful next action | Cheerful zero when loading failed |
| Loading | Confidence | Stable layout and task-specific indication | Fabricated percentages |
| Error | Recovery | Retain work, explain issue, offer retry | Silent failure or blaming users |
| Mobile | Ease | One main task, reachable controls, resilient text | Desktop density compressed into tiny cards |

## Dashboard hierarchy proposal

Start with a factual sentence: 'Two posts need your review', 'Your next post is scheduled for 6:15 PM', 'Oyinca is paused', or 'Connect TikTok to begin'. Choose from verified state, not time-of-day alone. Greeting can stay secondary.

Then show today's actual activity with timestamp and account, current work, attention items, and one supported recommendation. Performance stays below this working context. If no data is available, show the missing prerequisite. If data fails, show unavailable/retry, never an empty-success state. Use existing engine/control-center/stats/performance endpoints; a dated timeline needs actual event timestamps, not counts converted to invented events.

## Onboarding proposal

Keep the current four conceptual questions. Prefill saved Brain fields, save on meaningful step completion using existing PATCH semantics, show saving/saved/retry, and return to the exact unfinished step. Completion follows successful persistence. Skipping is explicit and retains successfully saved work; it does not claim a completed understanding profile. Next useful step is connection, then a first content upload. Optional tour remains available on demand. Avoid sensitive freeform content in browser persistence unless reviewed; server-backed resumability is preferred.

## Autopilot trust model

Separate operating state (active/paused), approval mode, entitlement, connection readiness and current task outcome. Show all relevant distinctions without converting each into a badge. A failed provider action names the recovery route. Pausing should report exactly what the current API guarantees; do not imply it cancels an already submitted provider job. Regeneration and immediate publishing have explicit action labels and pending feedback. Rationale displays structured reasons/evidence, never private chain-of-thought or invented explanations.

## Analytics strategy

Separate operational throughput from audience performance. Give every metric a time window, account scope, unit and availability. Use the existing performance/intelligence endpoint for evidenced comparisons; retain the current minimum-data message. Explain 'insufficient measured posts' rather than extrapolate. Recommendations state the observation and uncertainty, and link to an existing action. Raw activity remains available as supporting detail. More charts are not useful until the underlying metric is supported.

## Motion psychology

| Moment | Purpose | Implementation rule |
|---|---|---|
| Hero | Curiosity/anticipation | Short optional sequence; CTA and headline are already visible/usable |
| Product demonstration | Understanding/competence | Stages connect meaningfully; clearly labeled illustrative scenario |
| Onboarding | Progress | Transition after actual user/save progress; no pretend analysis |
| Autopilot | Transparency | Animate confirmed state change, retain reason/time/account |
| Approval | Confirmation/control | Feedback follows server success; failed request retains item |
| Analytics | Attention | Subtle emphasis on a real changed value; no decorative count-up delaying comprehension |

GSAP serves acquisition continuity; Lenis enhances optional public scrolling. Native operation remains immediate. Reduced motion gives the same meaning with immediate state. The full tokens and lifecycle are in [DESIGN.md](DESIGN.md).

## Evaluation

Ask a new user to explain what Oyinca does, what they should do next, which account will publish, whether approval is required and how to pause. Measure first successful setup, first approved post, recovery from an error and repeat use; avoid optimizing clicks without completed outcomes. Collect only necessary, privacy-reviewed events; private page replay remains restricted by the existing policy. Proposed experiments are not measured product claims.
