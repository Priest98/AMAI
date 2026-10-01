# Oyinca UI/UX rebuild audit

Status: implementation baseline, 2026-10-01.

## 1. Frontend architecture

Oyinca uses Next.js 15 App Router in `apps/web`. Public acquisition, authentication, and authenticated product routes share local Inter and Playfair Display fonts, semantic CSS tokens, a same-origin Nest API bridge, and reusable components in `src/components`. Browser data access is centralized in `src/lib/api.ts`; authentication remains cookie based.

## 2. Existing routes and screens

The public surface includes the landing page, pricing and FAQ sections, early access, founding creators, legal pages, and referral routes. Authentication includes sign in, registration, verification, password recovery, password reset, and TikTok completion. Product routes cover the command center, creation/media, approvals, calendar, scheduled and published content, TikTok connections, analytics, Oyinca Brain/intelligence, Autopilot, settings, creator and agency workspaces, and administration.

## 3. Design-system and component inventory

The canonical tokens live in `src/styles/tokens.css`; typography, elevation, motion, shared states, and compatibility utilities live in `src/app/globals.css`. Shared primitives currently include Button, Input, Badge, Modal, EmptyState, RetryPanel, Skeleton, StatCard, ThemeToggle, and usage/storage indicators. Landing, auth, dashboard, engine, composer, media, onboarding, billing, and notification components already encode important behavior.

## 4. Critical functionality to preserve

- HttpOnly-cookie authentication and verification-before-account-creation.
- Same-origin API forwarding and server-only environment variables.
- TikTok identity, connection, approval, publishing, and reconnect states.
- Direct Blob upload, optimization, AI analysis, captions, hashtags, retry, approval, scheduling, and publishing.
- Tenant and entitlement boundaries, plan-derived pricing, usage accounting, QStash recovery, and Brain context.
- Existing loading, failure, recovery, and optimistic-update behavior.

## 5. UI/UX problems found

- Several generations of landing components and styles coexist, increasing drift and making visual ownership unclear.
- Product navigation reflects implementation history more than the core user loop; related destinations are spread across many section labels.
- The landing hero uses an abstract intelligence orb instead of demonstrating the upload-to-approval workflow.
- Product screens mix opaque work surfaces with legacy glass utilities and inconsistent control styling.
- Large route components contain presentation and interaction code together, making systematic polish risky.
- Mobile navigation works, but labels and hierarchy do not consistently mirror the desktop information architecture.
- Repeated local button, field, empty-state, and error treatments bypass shared primitives.

## 6. Relevant technical debt

- Duplicate landing CSS files and unused landing variants should be retired only after route-by-route visual validation.
- Several product pages exceed 500 lines and should be decomposed around existing API boundaries, without moving business rules into UI helpers.
- Repository lint has broad pre-existing failures, especially `any`, effect-state, and purity rules; UI changes must avoid adding to this baseline.
- The web bundle reaches into the API package, producing a known `sharp` dynamic dependency warning.

## 7. Proposed information architecture

Primary product navigation follows the operating loop: Home, Create, Content, Approval Queue, Calendar, Accounts, Analytics, Oyinca Brain, and Settings. Autopilot is presented as an operating mode within Oyinca rather than a disconnected technical engine. Creator and agency portfolio views remain plan-specific secondary destinations.

## 8. Visual direction

**Quiet editorial operations:** warm ivory and deep navy, steel-blue interaction accents, display serif reserved for decisive brand moments, crisp opaque product surfaces, restrained borders, sparse elevation, real content previews, and motion that explains processing or state changes. Marketing can be cinematic; working screens remain immediate and calm.

## 9. Design-system foundations

Use semantic surface, text, action, border, status, control-height, spacing, radius, and motion tokens. Standard controls are at least 44px; mobile inputs remain 16px. One primary action owns each task region. Status always combines text with color or icon. Product containers are opaque; blur is reserved for floating acquisition overlays and blocking layers.

## 10. Phased implementation plan

1. Consolidate tokens, typography, controls, focus behavior, and status primitives.
2. Replace the landing hero with a real product workflow and rationalize public navigation.
3. Reframe the application shell around the core user loop and align mobile navigation.
4. Refine command center, Create, Approval Queue, Calendar, Accounts, Brain, and Autopilot in that order.
5. Unify auth, verification, recovery, onboarding, settings, and plan surfaces.
6. Complete responsive, accessibility, performance, metadata, browser, and design-critique passes.

