# Oyinca signature film — production record

## Reference composition revision

The latest hero replaces the split layout with a viewport-filling product environment. The film and responsive poster now sit behind HTML copy, navigation and controls, with no dashboard card border, caption or metadata underneath. A restrained perspective treatment, soft background plate and separate directional/bottom/vignette layers establish depth. Desktop keeps a left text-safe area and a center/right product area; mobile retains a portrait background with lighter perspective.

The final headline is now “You create. Oyinca manages the rest.” Supporting copy and the primary CTA match the new brief. “Watch the experience” replays the film. A noninteractive right-side story rail follows the existing real-film cue points (4/6/8/10/12 seconds). The film's actual timing is preserved so labels match the available shots. An opening GSAP timeline seeks against the video clock; scoped scroll motion gently lifts the copy as the visitor leaves. Reduced motion skips these effects and keeps the final headline visible.

`Nav.tsx` now uses a transparent full-width marketing header with the existing Oyinca monogram and wordmark, becoming a restrained solid surface on scroll/menu expansion. Desktop/mobile controls and a bottom scroll link float independently of the film. No social proof was added.

Additional changes: `Hero.tsx`, `Nav.tsx`, `hero-film.css`, `scripts/hero-film/render.cjs`, and the regenerated posters/film. `verify-reference.cjs` verifies full-bleed dimensions, absence of card borders, header shape, cue indicator, replay and keyboard mobile menu. The original 18 theme/width checks and film cue/control checks were rerun successfully. The web production build and TypeScript passed; a subsequent desktop framing adjustment was visually rechecked. The film remains an edit of real UI with synthetic demo data, with the live-capture limitations below unchanged.

## Sources and boundaries

The previous assets were a portrait MP4 (2.3 MB), its portrait poster, a humanoid illustration and a sculptural illustration. None were used in this product-first film. Inter, Playfair Display, existing landing color tokens, GSAP, ScrollTrigger and Lenis are reused. No dependencies were added.

The captures are the actual React dashboard pages, rendered locally in Playwright with a dedicated synthetic browser persona, “Oyinca Studio.” API requests are intercepted in the browser and external requests are blocked. This is a demo fixture, not a real authenticated customer account. No authentication code was changed, no credentials were used and nothing was published. Captures contain no real customer media. Counts are demonstration data; published count remains zero.

## Reproducible storyboard

| Shot / time | Real product state | Camera / transition | HTML typography | Purpose / mobile |
|---|---|---|---|---|
| 01 / 0–2s | Create with Oyinca, upload surface | Small push toward captured interface | You create. We take it from here. | One starting place; mobile uses actual narrow layout |
| 02 / 2–4s | Upload surface holds | Continue restrained push | Your content. Understood. | Give the idea room; no fabricated analysis overlay |
| 03 / 4–6s | Actual approval queue with sample caption | Six-frame fade into review UI | We handle / Captions. | Caption-to-review connection |
| 04 / 6–8s | Publishing Calendar with scheduled sample posts | Gentle push; short transition | We handle / Scheduling. | Order and timing |
| 05 / 8–10s | Scheduled Posts, TikTok targets pending | Hold queue; never a public success state | We handle / Posting. | Explain the publishing workflow honestly |
| 06 / 10–12s | Actual Analytics page, publishing activity | Slow push | We track / Performance. | Operational tracking, not invented engagement |
| 07 / 12–15s | Three queued sample posts | Return to calm queue; static poster at end | The rest. → Your social media. Finally, managed. | Relief, stable CTA and final composition |

The product film is a cinematic edit of controlled UI stills, not a recording of a live autonomous run. It does not capture a real upload progressing through analysis, a live caption generation, an OAuth connection, or a successful public TikTok post. Those could replace the corresponding stills after a dedicated staging account is available. No generative video service was connected or used; no generated dashboard is represented as real footage.

## Production and files

- `scripts/hero-film/capture.cjs`: browser-only synthetic fixture and clean desktop/mobile captures.
- `scripts/hero-film/render.cjs`: FFmpeg H.264 render, 30 fps, silent, 15 seconds, modest camera movement and short transitions; `+faststart` enabled.
- `apps/web/public/hero-film/captures/`: ten original product captures.
- `apps/web/public/hero-film/desktop/oyinca-film.mp4`: desktop edit.
- `apps/web/public/hero-film/mobile/oyinca-film.mp4`: separately captured mobile edit.
- `apps/web/public/hero-film/posters/`: queued-post JPEG posters for both formats.
- `scripts/hero-film/verify.cjs`: responsive, theme, reduced-motion and playback checks.

Reproduce with a local web server at port 3000, then run `node scripts/hero-film/capture.cjs`, `node scripts/hero-film/render.cjs`, and `node scripts/hero-film/verify.cjs`. Capture assumes the current dashboard response shapes; assertions reject application error screens. FFmpeg must be installed locally. It is a production tool, not a runtime dependency.

## Playback and motion architecture

`Hero.tsx` uses the video's media clock as the only headline timing source. Buffering or pauses therefore do not let the words drift ahead. Text stays in HTML. The main H1 remains available to screen readers throughout the intro; transient visual copy is aria-hidden. Signup remains available from the first frame. The film runs once, then rests on a poster and the final headline. Pause, resume, skip and replay are explicit controls. Playback pauses outside the viewport or in a hidden tab. A playback error or autoplay denial retains the final readable composition.

`SignatureText.tsx` dynamically imports the existing GSAP setup and uses a scoped context for masked vertical movement, blur, opacity and letter-spacing settle. Text changes revert their preceding animation, including on unmount and reduced-motion changes. No SplitText or new text-splitting dependency is needed.

`ManagedMoment.tsx` uses a responsive ScrollTrigger to progress Idea → Caption → Schedule → Post → Analyze → Managed. It owns a scoped matchMedia lifecycle. The existing AcquisitionMotion component remains the sole Lenis owner and already synchronizes its scroll events to ScrollTrigger. Touch retains native scrolling. Pricing, FAQ and CTA remain calm.

Reduced-motion visitors get the final headline, product poster and Managed statement immediately. The initial reduced-motion state prevents a video source being assigned, avoiding the film download entirely. CSS also protects the static fallback while preferences change. Both themes use the existing landing palette; the film preserves the product's real dark UI inside either theme.

## Optional external finishing brief

No external generation is required to play the delivered film. For a future cinematography pass: use the supplied UI captures as immutable foreground plates. Add only a restrained lateral camera movement, soft studio lighting, surface reflection and shallow depth. Keep every glyph, logo, label and control unchanged. Do not synthesize metrics or a TikTok publication success. Produce silent 15-second landscape and portrait versions with the same 0/2/4/6/8/10/12/14-second cue points. Keep marketing typography outside the encoded video.

The remaining optional manual step is capturing real state transitions with an isolated staging demo account. The current rendered montage is usable without this step, but it is not evidence of a completed live pipeline.

## Validation

- Production web build and TypeScript passed. Next reports 117 KB first-load JavaScript for the landing route; existing Sharp and webpack cache warnings remain.
- Eighteen responsive/theme cases passed: 320, 360, 375, 390, 430, 768, 1024, 1440, 1920 in dark and light, without horizontal overflow or browser page errors.
- Reduced-motion cases assigned no video source. Pause, replay, skip and caption/scheduling/posting/performance/final media-clock cues passed.
- Both encoded assets are silent H.264 and exactly 15 seconds. Desktop: 771,319 bytes, 1440×950. Mobile: 479,644 bytes, 430×820.
- Visually inspected desktop/mobile hero screenshots, light theme and an encoded caption frame.
- Local database TLS failure prevents validating live billing prices in this environment. The film capture does not depend on that backend and no backend changes were made.

This task modifies `Hero.tsx` and the public `page.tsx`; it adds `SignatureText.tsx`, `ManagedMoment.tsx`, `hero-film.css`, the asset directory and the production scripts/documentation. Earlier uncommitted pricing and landing edits remain in place. No dashboard, authentication, database or TikTok integration implementation was modified.
