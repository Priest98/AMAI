# Phase 3 progress — onboarding and dashboard

## Implemented
- Onboarding awaits Business Brain persistence before advancing or recording completion/skipping. A failure retains answers and provides a retry message.
- Each Continue action saves collected fields; untouched fields are omitted to avoid erasing existing context. Answers are held in component memory on failure, not saved to browser storage.
- The wizard uses an accessible dialog with focus containment and bounded viewport scrolling, readable fields and labels. Duplicate submissions are prevented while saving. Final action accurately says Connect your account.
- Dashboard no longer claims work happened based on a hardcoded greeting. Primary action reflects approvals, scheduled posts or content availability.
- Core loading failure has an explicit retry state; unavailable data is not displayed as zero counts or an active engine. Performance failure is distinct from absence of performance data.
- The existing workflow visualization remains available in a disclosure below the summary. Decorative remote imagery was removed from the operational header.

## Verification
- Browser fixtures: failed save retains input; no completion request before successful persistence; retry writes populated fields only; skip order; focus containment; dashboard failure/retry.
- Empty workspace fixture: correct upload action and no horizontal overflow at 1440, 1280, 1024, 768, 430, 390 and 360px.
- Mobile screenshot reviewed.
- Production build passed with type validation and all 46 routes generated. Existing non-blocking sharp/cache warnings remain.

## Remaining
This is the onboarding/dashboard increment, not completion of Phase 3. Composer, approval queue, calendar, Autopilot, analytics, Brain, notifications, connections, billing/settings and agency/admin refinements remain. Production database connectivity and live end-to-end publishing/authentication remain unverified. No backend, QStash, billing entitlement or database schema changes were made. No deployment performed.


## Content workflow increment
- Calendar editor adopts the shared accessible modal with focus trapping and restoration, readable labeled fields, 44px actions, persistent feedback, and protection against dismissing while saving.
- Approval is unavailable while caption, hashtag or time edits remain unsaved; existing API actions and scheduling conversion are retained.
- Calendar and approval-queue load failures now have persistent retry states instead of appearing empty.
- Approval queue filters wrap on mobile and expose their selected state. Edit fields and message-dismiss buttons have accessible names.
- Composer single/carousel controls expose selected state and use consistent targets; copy describes photo/video behavior plainly.
- Browser fixture tests passed: calendar focus containment and Escape restoration, unsaved approval guard, failed-save preservation, queue failure state, seven-width geometry and composer selection. Mobile review screenshot inspected. TypeScript passed.
- These are controlled frontend checks; no live posts were approved, published, edited or deleted.

- Content workflow production build passed with type validation and all 46 routes. Existing sharp/cache warnings remain.


## Autopilot and analytics increment
- Autopilot status loading failures now offer retry instead of default-looking controls. Mode/state display changes only after the server confirms the change.
- Autopilot confirmation uses the accessible shared modal and shows the configured cadence, platform and time zone. Save failures keep the dialog open and retain the existing mode.
- Unknown billing details cannot present unverified Autopilot eligibility. The server remains the entitlement authority.
- Persona save failures no longer leave an unsaved tone selected; messages persist and use neutral styling instead of presenting errors as success.
- Analytics uses the existing stats endpoint instead of three full post lists for pending/scheduled/published counts. Failed counts retain their existing source; no backend contract changed.
- Added count-based interpretation and next action, explicit unavailable state with retry, and publishing-event count refresh. Publishing activity is explicitly distinguished from audience engagement.
- Shared metric-card labels/helpers now wrap on small screens; expand actions have names.
- Browser fixtures passed: status retry, explicit confirmation, mode-save failure retention, successful confirmation, analytics error/retry and seven-width layout checks. These tests do not enable production Autopilot or prove live provider/database connectivity.

- Repeated Google Fonts TLS failures interrupted verification. The same Inter and Playfair Display faces now load through next/font/local from pinned Fontsource packages (licenses included by the packages), eliminating build-time Google downloads. CSS font variables and display behavior remain unchanged.


## Brain, notifications, connections and settings increment
- Settings stops on failed core loads, preserving saved Brain context rather than presenting an empty editable form. Retry repopulates existing values; save handlers guard against loading/error/double-submit states.
- Settings feedback persists and uses neutral status styling. Billing failures have explicit retry instead of a blank pane. Tab keyboard navigation supports arrows, Home and End.
- Notifications use the shared viewport-safe accessible dialog with loading/error/retry. Read-marker storage is workspace-scoped and tolerates malformed or unavailable browser storage; repeated live event IDs are deduplicated.
- Connections distinguishes failed account-status checks from disconnected accounts and offers retry. Intelligence error feedback is announced.
- Controlled browser tests passed: settings data protection/retry, malformed read-marker storage, notification retry and focus restoration, dialog geometry at seven widths, connection failure/retry, billing retry and keyboard tab selection. No live billing, account-connection or saved Brain changes were made by tests.

Validation: production build passed (46 routes), including TypeScript checks. Changes remain local; live database-backed account and provider operations were not verified.

### Agency and admin reliability increment

- Added reusable, accessible retry feedback and applied it to portfolio, team, portfolio analytics, approvals, and calendar requests.
- Distinguished a temporary admin access-check outage from a real 401/403 denial while continuing to fail closed.
- Replaced the pricing editor overlay with the shared focus-trapped dialog, added field names and inline error announcements, and made pricing cards stack on narrow screens.
- Added recoverable failure states to the admin overview, customers, incidents, logs and audit log, plus accessible names for customer search and incident filters.

Validation: TypeScript passed; the agency/admin Playwright check passed across six viewport widths; the production build completed for all 46 routes. Existing webpack cache and Sharp dynamic-dependency warnings remain non-blocking.

### Remaining product surfaces

- Added recovery to Clients, Creator Command Center, admin customer detail, admin incident detail and System Health.
- Migrated client creation, Creator account creation, plan activation and connected-account details to the shared accessible dialog.
- Kept System Health data visible when a manual check fails and announces action failures separately.

Validation: all nine Playwright browser scripts passed when run independently, including 21 acquisition viewport checks and the complete dashboard state suite. All 40 backend regression tests passed. TypeScript and the 46-route production build passed. The existing webpack snapshot and Sharp dynamic-dependency warnings remain because the Next.js API proxy bundles the Nest application in-process; they do not fail the build.
