/**
 * TikTok-first launch feature flags.
 *
 * Frontend-only by design: the backend's Instagram OAuth/publishing code
 * (oauth.service.ts, publishing.service.ts, the whole Instagram Graph API
 * integration) is deliberately left untouched. This flag governs whether
 * Instagram's *customer-facing entry points* (connect buttons, dashboard
 * cards, marketing copy) are shown -- not whether Instagram works at the
 * API layer. That split matters: it means
 *   1. an already-connected Instagram account keeps publishing normally
 *      (nothing server-side changed), and
 *   2. flipping INSTAGRAM_ENABLED back to true later needs zero backend
 *      work, only removing the frontend gate.
 *
 * TIKTOK_ENABLED exists mostly for symmetry/documentation -- there's no
 * launch scenario where TikTok itself is hidden, but having both flags
 * named explicitly (rather than a single INSTAGRAM_ENABLED) makes the
 * V1/V2/V3 platform roadmap (TikTok -> TikTok+Instagram -> multi-platform)
 * greppable in one place instead of implied by absence.
 *
 * NEXT_PUBLIC_ prefix is required for either flag to be readable in
 * client components ("use client" pages/components), which is where every
 * current usage lives (integrations page, dashboard home, landing nav).
 * Unset envs are treated as the V1 launch default (TikTok on, Instagram
 * off) rather than throwing, so this never blocks a build that hasn't set
 * the var yet.
 */
export const TIKTOK_ENABLED = process.env.NEXT_PUBLIC_TIKTOK_ENABLED !== 'false';
export const INSTAGRAM_ENABLED = process.env.NEXT_PUBLIC_INSTAGRAM_ENABLED === 'true';
