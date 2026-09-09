# Oyinca Design Intelligence System

Status: canonical. Updated 2026-09-09.

Oyinca should feel like a calm creative studio with an exceptional operator already at work. The public site earns attention through cinematic media and editorial composition. The product earns trust through clarity, speed, and precise state. Both modes share the same warm ivory, navy, steel, typography, spacing, and interaction rules.

## Design DNA

The synthesis weights the references as requested: Runway 35%, Apple 20%, Superhuman 20%, Stripe 15%, Ferrari 10%. The percentages guide judgment; they are not a recipe for copying layouts or trade dress.

- **Cinematic focus:** one dominant story or product moment per viewport; supporting UI retreats.
- **Quiet hierarchy:** whitespace, scale, and contrast lead before decoration.
- **Operational speed:** frequent actions are easy to find, keyboard reachable, and stable during loading.
- **Legible complexity:** scheduling, performance, and automation remain understandable at a glance.
- **Scarce drama:** display type, glow, glass, and large imagery appear only where they increase meaning.

## Two modes, one system

Acquisition uses full-bleed art, strong crops, the display serif, broad section rhythm, and restrained staged motion. Product surfaces use the sans face, opaque panels, compact rhythm, tabular numerals, and immediate feedback. Auth and onboarding bridge the modes: one branded visual field beside a simple, focused form.

## Tokens

The implementation source is `apps/web/src/styles/tokens.css` and the shared motion/spacing block in `apps/web/src/app/globals.css`.

| Family | Contract |
|---|---|
| Canvas | `--surface-canvas`, warm ivory in light and gunmetal in dark |
| Panels | `--surface-panel`, `--surface-raised`, `--surface-recessed` |
| Actions | `--action-primary`, `--action-secondary`, one primary per region |
| Text | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-on-accent` |
| Borders | `--border-subtle`, `--border-interactive`, normally 1px |
| Focus | `--focus-ring`, visible at 2px with offset |
| Controls | 40px compact, 44px standard, 48px prominent |
| Radius | 8, 12, 16, 22px; full pill only for islands, chips, and selected CTAs |
| Width | 440px forms, 65ch prose, 1200px standard, 1440px work views |
| Spacing | 4px base through 48px product rhythm; 64–128px acquisition rhythm |

## Typography

Inter is the product and body face. Playfair Display is reserved for brand display moments. UI labels use sentence case. Essential copy never uses tiny tracked capitals. Data columns use tabular figures. Hero copy should communicate the product in one glance: Oyinca plans, creates, schedules, publishes, and learns for the user.

## Surface rules

Opaque panels are the dashboard default. Use elevation 1 for grouped work, 2 for interactive hover, 3 for popovers, and 4 for blocking dialogs. Do not lift static cards. `cinematic-glass` is limited to floating marketing or overlay moments. Avoid nested cards where a divider and spacing communicate the group.

## Responsive behavior

Design mobile by task sequence. At 360–430px, preview precedes controls, tables become labeled rows or gain local overflow, calendar becomes agenda-oriented, and primary actions remain visible above the keyboard. The document itself never scrolls horizontally. At 1440px, line length stays bounded and dense work can use the wide content token.

## Accessibility and performance

Normal text targets 4.5:1 contrast; large text and essential boundaries target 3:1. Status always pairs color with text or icon. Inputs remain 16px on mobile. Controls target at least 44px except explicitly dense desktop controls. Content and controls exist without animation. Blur and continuous effects are scarce because they cost compositing time and visual attention.
