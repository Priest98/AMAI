# Oyinca Component Contracts

Search `apps/web/src/components/ui` before creating a control. Shared components own sizing, focus, loading, disabled state, semantic color, and theme behavior.

- **Button:** one primary action per task region; standard 44px, prominent 48px, compact 40px. Loading retains label and width.
- **Input:** visible label, stable ID, 16px text, hint/error linked with `aria-describedby`, values retained after failure.
- **Badge:** concise status with text; it does not act as a button or carry meaning by hue alone.
- **Card:** `exec-card` is an opaque task group. Add `exec-card-interactive` only when the whole region acts. Use `cinematic-glass` only for intentional overlays.
- **StatCard:** tabular value, plain helper copy, no hover affordance unless an expand action exists.
- **Modal:** programmatic title, focus trap and restoration, Escape close, internal viewport-bounded scrolling, reachable actions.
- **EmptyState:** what happened, why it matters, and one next action. No fake content or decorative metric.
- **Skeleton:** reserves final geometry, is hidden from assistive technology, and stops animating under reduced motion.
- **Table/chart:** includes headings, units and timezone where relevant; charts expose a text summary and raw values.

Page headers contain a title, at most one purpose line, one primary action, and optional filters. Navigation has one owner at each breakpoint. Links navigate; buttons change state.
