# Oyinca UI Audit

Date: 2026-09-09.

## Findings

The frontend already has strong foundations: a shared token file, Inter and Playfair Display, responsive landing CSS, light/dark themes, reusable controls, Radix dialogs, GSAP, Lenis, Framer Motion, and focused auth primitives. The cinematic hero is a credible acquisition direction.

The main inconsistency is between that direction and the product shell. A partial Design System v2 made blur and elevation the default for every card, including static statistics. The repository still contains 229 instances of raw colors, large radii, strong shadows, or local blur in dashboard/component TSX and CSS, plus 121 hand-authored dashboard buttons. This creates visual drift and makes global refinement difficult. These counts identify migration debt; they do not imply that every match is wrong.

Shared primitive adoption is strongest in auth and newer dashboard pages. Older admin and workflow screens still compose controls locally. Landing styles are large and specialized, so acquisition changes should remain scoped rather than leak into the dashboard. Existing motion libraries need one-owner rules to prevent duplicate scroll and animation work.

## Implemented in this pass

- Added semantic surface, action, focus, control-height, content-width, and extended spacing tokens.
- Changed the shared operational card to an opaque, low-elevation panel and made hover treatment conditional on actual interaction.
- Added an explicit `cinematic-glass` utility for intentional marketing/overlay use.
- Standardized shared button heights, removed badge blur, made skeletons silent to assistive technology, and fixed mobile input text to 16px.
- Established canonical design, motion, component, UX, reference, and agent protocol documentation.

## Prioritized debt

1. Migrate the 121 local dashboard buttons to the shared Button/IconButton contracts by workflow, starting with approval, composer, scheduling, and settings.
2. Replace local raw colors and unbounded shadows with semantic tokens, verifying contrast in both themes.
3. Consolidate page headers, error/stale states, and table behavior across admin and analytics.
4. Capture visual regression baselines for 360, 390, 430, 768, 1024, 1280, and 1440px.
5. Measure LCP, CLS, INP, JS, and image transfer before adding further cinematic motion.
