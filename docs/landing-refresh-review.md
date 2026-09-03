# Landing refresh and hero directions

The landing page now uses native scrolling and an immediately visible hero. The selected default direction is Cinematic; /hero-lab provides Editorial, Product and Cinematic options. The comparison route is excluded from indexing. Cinematic video starts only after the visitor presses Play and can be paused.

## Audit fixes

- Responsive headline, navigation and CTA spacing, including 320px screens; fixed contrast in light mode, including a solid dark fallback for the cinematic hero.
- Stable navigation width; mobile menu supports Escape, outside clicks, expanded state and focus return.
- Creator and Agency account limits distinguish workspaces from social accounts per workspace, using the live catalogue.
- Pricing uses two columns at intermediate widths and four only on wide screens, wraps currency labels, and provides a currency selector and failed-catalogue retry.
- Removed unsupported promotional duration and reference-price comparisons. Checkout remains the final review before payment.
- Clear Assisted versus advanced Autopilot approval requirements; removed repetitive sections and replaced fictional activity counts with a labelled, interactive example.
- Native FAQ disclosure elements hide closed answers from assistive technology. Footer headings follow document order.
- Added robots.txt and sitemap.xml. Replaced static font weight sets with variable font files and removed landing ScrollSmoother and delayed heading entrances.
- Paid-plan choices survive registration, email verification and sign-in in the same browser, and lead to Billing for review. No automatic subscription or payment is triggered. Choices expire after seven days and can be dismissed. Cross-device persistence is not implemented.

## Verification

- Ten existing production regressions and six plan-selection regressions passed.
- Browser checks covered 320, 390, 1024 and 1440px widths, both themes, menu keyboard handling, FAQ disclosure, currency layout and plan links.
- All three hero variants were checked on desktop and at 320px. Product steps and cinematic play/pause controls passed.
- A mocked signup response verified the selected-plan handoff without creating a real account or sending email.
- Final production build passed. Automated accessibility checks found zero violations on the landing page in both themes, all three hero options in light mode, and the cinematic option in dark mode. No browser JavaScript errors were observed.
- Local production diagnostics before the final heading/copy correction: LCP 728ms at 390px and 1032ms at 1440px; CLS below 0.00002 for both; no initial video request. These are local lab observations, not field measurements or a production speed guarantee.

Cinematic was selected for the landing page. This change set is prepared for the GitHub and Vercel production release; deployment status is tracked in Vercel.
