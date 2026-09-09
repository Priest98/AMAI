# Web application context

## Purpose and boundaries

`apps/web` is the Next.js 15 App Router product UI, landing site, authenticated dashboard, and same-origin gateway to the Nest application. It renders workflows and calls domain APIs; domain policy, authorization, entitlement, publishing, and durable data logic belong in `apps/api`.

## Architecture and data flow

Pages live in `src/app`; reusable product components live in `src/components`; browser API calls use `src/lib/api.ts`. `src/app/api/[...path]/route.ts` boots/forwards to Nest on Vercel, preserving cookies and selected headers. Direct Blob upload authorization is handled separately by `api/media-upload-token`.

## Important entry points

- `src/app/layout.tsx`, `src/app/page.tsx`: application shell and public landing page.
- `src/app/dashboard/layout.tsx`: authenticated product shell.
- `src/lib/api.ts`: shared API client; do not create page-local HTTP clients.
- `src/components/ui`: shared design primitives; search here before adding controls.
- `src/lib/observability`: privacy gate and session replay boundary.

## Invariants and dangerous changes

- Authentication uses an httpOnly cookie; do not restore browser token persistence.
- Do not infer entitlement or tenant permission in the UI as an authority; the API must enforce it.
- Preserve same-origin `/api` behavior when changing deployment or routing.
- Do not record dashboard media, form values, tokens, or API bodies in observability tools.

## Validation

Run `npx tsc -p apps/web/tsconfig.json --noEmit`, the web build, and focused Playwright checks. See `apps/api/CONTEXT.md` for API behavior and `docs/repository-map.md` for task routes.

## Design context

The canonical product language is defined in `docs/design/OYINCA-DESIGN.md`; motion and component contracts live beside it. Marketing surfaces can use full-bleed media, display serif, and the explicit `cinematic-glass` treatment. Dashboard, auth, onboarding, settings, composer, approval, scheduling, and analytics use opaque semantic surfaces and product typography. Blur, parallax, and decorative animation require a user-facing reason and must never delay a control or status.
