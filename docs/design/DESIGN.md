# Oyinca design constitution

Status: proposed Phase 1 specification, 2026-09-07. Existing code remains unchanged. Implementation owners and evidence are in [the audit](OYINCA_UX_AUDIT.md).

## Brand and modes

Your AI social media manager: human in language, precise in status, calm under failure. Acquisition is editorial, spacious and cinematic. Operation is quiet, legible and efficient. Shared type, color semantics, spacing and controls make these two modes one product.

Retain the established logo shape and dynamic-island navigation. Audit logo accent usage against shared brand tokens before recoloring assets. Avoid a new visual rebrand, indiscriminate glass panels, nested decorative cards, fake badges or simulated work claims.

## Typography

Keep Inter for UI, body, labels, controls, data and operational headings. Playfair Display is for acquisition display headings and brand moments. Both are already loaded through next/font; do not add another font. Update stale font comments during implementation.

| Role | Proposed size / line-height | Weight |
|---|---|---|
| Acquisition hero | clamp(40px, 5.5vw, 88px) / 1.05 | 500–600 display |
| Acquisition section | clamp(30px, 3.4vw, 52px) / 1.12 | 500 display |
| Operational page | clamp(26px, 2.5vw, 36px) / 1.2 | 600 Inter |
| Section | 22px / 1.3 | 600 |
| Subsection | 18px / 1.4 | 600 |
| Body/form | 16px / 1.5 | 400 |
| Compact table/meta | 14px / 1.45 | 400–500 |
| Secondary caption | 12px / 1.45 | 500 |

Essential copy is never tiny uppercase tracking. Use sentence case. Use tabular numerals for aligned data. Display text wraps naturally; no forced break may clip at 360px. Text over imagery needs a stable scrim in both themes. Do not hide long account names without an accessible full-value path.

## Space, grid and responsive behavior

Keep the existing 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48; add 64, 80, 96, 128 for acquisition pacing only. Page gutters: 16 mobile, 24 tablet, 32 desktop. Content max-width 1200px; working views may use 1440px for calendars/tables; prose 65ch; forms 440px. Operational sections 24–32px apart; acquisition sections 64 mobile and 96–128 desktop. Control groups use 8–12px, fields 20–24px.

Use existing Tailwind breakpoint conventions: 640, 768, 1024, 1280, 1536. Verify additional concrete widths 360, 390, 430 and 1440. Grids collapse by task: calendar becomes agenda-like days; data tables get deliberate local overflow or labeled stacked rows; media review becomes preview then form; settings moves to compact section navigation. Main document never requires horizontal scrolling. Keep desktop sidebars and mobile bottom navigation; avoid adding a second mobile navigation owner.

## Color and theme

Preserve the existing warm ivory/navy/steel family with gunmetal dark surfaces. Canonical tokens live in proposed `styles/tokens.css`; existing `--lp-*`, `--bg-*`, and component aliases map to these during migration.

| Token purpose | Light baseline | Dark baseline |
|---|---|---|
| Canvas | #FAF6EF | #21242F |
| Surface | #FDFBF6 | #2A2E3C |
| Raised | #FFFDF8 | #333748 |
| Sunken | #F1EADD | #1A1D26 |
| Primary text | #0A1931 | use existing light foreground, verify contrast |
| Secondary text | #3D4A5C | use existing secondary foreground, verify contrast |
| Primary action | #0A1931 | accessible light/steel action with dark foreground |
| Supporting accent | #4A7FA7 | brighter steel where contrast requires |
| Border | #E6DDC9 | existing light border with measured control contrast |

Existing light muted #8891A0 is a candidate to darken for small essential text; do not assume it passes. Verify actual composited foreground/background pairs at 4.5:1 for normal text, 3:1 for large text and necessary control boundaries. Status success/warning/error use existing semantic families with both icon and text; hue alone never carries state. Gold may remain an acquisition art highlight, not a competing operational action palette. Never communicate billing eligibility via a decorative color.

## Border, elevation and surfaces

Use 1px separators. Retain radii 8/12/16/22px; 12px controls, 16px content panels, 22px dialogs. Pill radius reserved for island navigation and deliberate acquisition CTA. Use 0 elevation for tables/sections, existing elevation-1/2 for grouped work, elevation-3 for popovers and 4 for blocking dialogs. Higher shadow is not automatic premium quality.

One surface per task group. A metric inside a group is usually plain text with a divider, not another card. Reserve blur for floating navigation/overlays; opaque operational surfaces improve clarity and compositing cost. Hover should identify an actionable row, not lift every informational container.

## Controls and feedback

One primary action per task region. Keep existing Button API and introduce explicit min-height tokens: 44px default/touch, 48px prominent form action, 40px optional dense pointer-only desktop control. Icons get the same usable target. Secondary action is outline/quiet; destructive actions are explicit and separated from positive confirmation. Links navigate, buttons act. Loading preserves label and width, prevents duplicate submission and exposes busy state.

Input: visible label, stable unique ID, explanatory hint only when useful, error connected with aria-describedby, minimum 16px mobile text, correct autocomplete/inputMode. Preserve values after failures. Validation explains recovery without claiming the value was saved. Never rely on placeholder as label.

Dialog/sheet: programmatic name and description, initial focus, trapped modal focus, Escape, restoration, nested scroll-lock safety, internal overflow with actions reachable above keyboard. Mobile sheet width is bounded by viewport gutters. Popover is nonmodal when appropriate and stays onscreen. Preserve forms on accidental dismissal where user work is at risk. Native controls are preferred where sufficient.

Tables: headings, meaningful row actions, units/date/timezone, sortable state when supported, sticky headers only with tested scroll behavior. Charts must include text summary and raw accessible values; no animated invented numbers. Empty state = what happened, why, next action. Error state = failed task, retained work, retry; stale state includes timestamp. Skeletons reserve the final geometry, and zero is shown only after a successful count response.

## Navigation and page headers

Maintain the public dynamic island with visible logo, clear sign-in/start action and compact mobile expansion. Keep header outside any transformed scroll container. Header must not cover anchor targets or keyboard focus. Operational header shows active brand/account, pending attention and a predictable menu. Page header: title, one short purpose line if needed, primary action, optional filter row. No internal identifiers such as `pro_workspace` in ordinary product copy.

Client switching preserves verified access and explicit brand identity. Do not remove the current full reload until tests prove every cache and pending request changes scope correctly. Preserve existing URL and tab contracts.

## Motion tokens and ownership

| Convention | Duration | Use |
|---|---:|---|
| Immediate | 0ms | Essential content, reduced-motion final state |
| Fast | 120ms | Button/focus feedback |
| Standard | 200ms | Tabs, contextual status |
| Expressive | 360ms | Optional panel reveal |
| Cinematic | 600–800ms | Acquisition-only staged hero or demo |

Default ease: existing standard/premium curves after consolidation; proposed enter curve cubic-bezier(0.16,1,0.3,1). Stagger 40–60ms, short groups only. Reveal begins when useful content is within the viewport, never after the user has passed it. No delayed CTA availability. Operational controls remain immediately usable.

GSAP owns optional acquisition choreography using scoped context and matchMedia; cleanup reverts styles, listeners and triggers on unmount or preference change. Core/ScrollTrigger only when needed. Lenis owns public smooth scrolling only. Synchronize Lenis scroll events with ScrollTrigger; use a single GSAP ticker callback that supplies Lenis milliseconds, remove it on cleanup, and destroy Lenis. Never combine autoRAF and a second ticker-driven RAF. Do not enable ScrollSmoother or nested smooth-scroll ownership. This design follows [GSAP lifecycle guidance](https://gsap.com/docs/v3/GSAP/gsap.context()/) and [Lenis integration guidance](https://github.com/darkroomengineering/lenis).

Use native scroll on touch/mobile initially and throughout dashboard/admin. Tablet animation is shorter and unpinned by default. Desktop may use one product-demo pin after QA; content order remains valid when unpinned. A Lenis failure must leave browser scrolling and content intact. Mount only in acquisition, with no root-layout import. No global easing override that silently changes operational timing.

Reduced motion: native scroll, no pinning/parallax, immediate semantic state, no headline opacity dependency. Respond to preference changes after mount. Existing Framer Motion can remain for local confirmed-state feedback, but must not compete with GSAP for an element. Keyboard focus and HTML content do not wait for timelines. Stop decorative loops when offscreen or hidden.

## Performance and acceptance

Proposed goals, not measured results: mobile LCP <=2.5s, CLS <=0.1, INP <=200ms at field p75 once available. Compare initial JS and image transfer to a captured baseline; any increase needs a visible user benefit and mobile trace. Animate transform/opacity, avoid layout measurement per frame, lazy-load acquisition motion, reserve image geometry and never gate the hero on backend pricing. Keep server/client boundaries and API streaming behavior.

Acceptance: seven requested widths, both themes, 200% zoom, keyboard, reduced motion and no-JS acquisition; populated and failed-state fixtures; touch keyboard and overlays; back/forward and anchor restoration; route cleanup; no hidden essential content or accidental publishing. Full QA requirements are in the audit. No compliance score is asserted by this document.
