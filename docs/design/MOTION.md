# Oyinca Motion

Motion explains continuity, progress, and consequence. It never withholds content.

| Token | Duration | Use |
|---|---:|---|
| Immediate | 0ms | reduced motion and semantic state |
| Fast | 120ms | press, focus, hover |
| Standard | 200ms | tabs, menus, status |
| Expressive | 360ms | optional panel reveal |
| Cinematic | 600–800ms | acquisition hero and product story only |

Use `--ease-standard` for controls and `--ease-premium` for entrances. Animate transform and opacity. Keep stagger groups short at 40–60ms. Dashboard controls are usable immediately.

GSAP owns scoped acquisition timelines and must clean up contexts, triggers, and listeners. Lenis is acquisition-only; dashboard and mobile use native scroll. Framer Motion may own local product feedback, but two systems never animate the same element. Reduced motion disables smooth scroll, pinning, parallax, shimmer loops, and staged opacity dependencies. Decorative loops pause offscreen or when the document is hidden.
