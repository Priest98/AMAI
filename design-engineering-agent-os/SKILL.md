---
description: |
  Premium UI/UX design and frontend execution skill. Use when designing,
  redesigning, reviewing, or implementing websites, landing pages,
  dashboards, SaaS products, mobile interfaces, design systems,
  components, motion, or visual polish.
name: premium-ui-ux
---

# Premium UI/UX Skill

## Mission

Build interfaces that feel intentional, branded, usable, fast,
accessible, and production-ready. Do not create a generic "AI-generated"
aesthetic. Research first, establish one coherent visual direction, then
implement selectively.

## Core operating principle

Never use a component, effect, animation, or trend merely because it
exists.

Every design decision must support at least one of: 1. comprehension, 2.
hierarchy, 3. usability, 4. conversion, 5. brand differentiation, 6.
feedback/state communication, 7. delight without harming performance.

If it supports none of these, remove it.

## Required workflow

### 1. Understand before designing

Identify: - product and business goal - primary user - primary user
action - page/interface type - brand personality - content hierarchy -
technical stack - device priorities - accessibility requirements -
existing design system/components

If an existing codebase exists, inspect it before proposing a redesign.
Reuse sound architecture. Do not rewrite unrelated code.

### 2. Reference research

Select only the references relevant to the task. See
`references/resource-map.md`.

Use inspiration to extract principles, not to copy layouts blindly.
Analyze: - composition - whitespace - grid - typography - information
density - navigation - CTA placement - component anatomy - interaction
behavior - motion timing - responsive behavior

Before implementation, define a short visual thesis, e.g.: "Editorial
luxury SaaS: restrained palette, oversized typography, product-first
imagery, precise spacing, subtle depth, sparse motion."

### 3. Establish the design system first

Define: - font families and type scale - spacing scale - container
widths - grid - radii - borders - shadows/elevation - surface
hierarchy - semantic colors - interaction states - motion
durations/easing - breakpoints

Prefer CSS variables/design tokens. Avoid arbitrary one-off values
unless necessary.

### 4. Build page architecture

Create hierarchy before decoration: - navigation - hero / primary task -
supporting proof or product demonstration - content sections -
conversion/action areas - footer or terminal navigation

For product UI, optimize task completion over visual spectacle.

### 5. Choose components deliberately

Prefer existing project components first. Use external component
libraries as references or accelerators, not as the visual identity.

When using shadcn/ui, 21st.dev, Aceternity, Magic UI, Uiverse, UIAble,
mapcn, or similar: - inspect dependencies - adapt tokens and
typography - remove unnecessary effects - ensure keyboard behavior -
verify mobile layout - preserve semantic HTML - avoid stacking multiple
visual languages

### 6. Motion

Motion must communicate hierarchy, continuity, feedback, or spatial
relationships.

Default: - micro interaction: 120--220ms - common UI transition:
180--320ms - deliberate entrance: 350--700ms - long cinematic motion
only when the experience explicitly calls for it

Respect `prefers-reduced-motion`. Do not animate everything on scroll.
Avoid motion that delays interaction.

### 7. Responsive implementation

Design and test at minimum: - narrow mobile - standard mobile - tablet -
laptop - wide desktop

Do not simply shrink desktop. Reconsider hierarchy, navigation, spacing,
copy length, media crops, tables, sidebars, dialogs, and touch targets.

### 8. Accessibility gate

Before calling UI complete: - keyboard navigation works - focus states
are visible - headings are hierarchical - form labels are real labels -
images have appropriate alt treatment - controls have accessible names -
contrast is sufficient - error/success states are not color-only -
dialogs and menus manage focus - reduced motion is respected - touch
targets are practical

### 9. Performance gate

Avoid visual polish that destroys UX. Check: - unnecessary client
components - oversized images/video - blocking fonts - animation
libraries loaded for trivial effects - layout shifts - excessive
blur/backdrop-filter - huge DOM trees - duplicate component libraries -
autoplay media behavior - mobile performance

### 10. Visual QA

After implementation, inspect the running UI rather than assuming the
code looks right. Check: - hierarchy - alignment - spacing rhythm -
clipping/overflow - typography - responsive states -
hover/focus/active/disabled/loading/error/empty states - console
errors - visual regressions

Iterate until the interface looks coherent in the browser.

## Anti-vibe-coded rules

Avoid these defaults unless the product genuinely calls for them: -
random purple/blue gradients - decorative radial glow orbs -
glassmorphism everywhere - excessive rounded cards - every section
inside a card - three identical feature cards as a reflex - generic
icon + heading + paragraph grids - excessive drop shadows - rainbow
accents - gratuitous sparkles - decorative dot grids - terminal windows
used as decoration - animated arrows everywhere - excessive hover
motion - huge copy-pasted component-library sections - generic AI copy
such as "revolutionize", "supercharge", or "unlock the power" - fake
testimonials or invented metrics - desktop-only compositions - hiding
weak hierarchy behind animation

Minimalism does not mean empty. Premium does not mean black background +
serif font. Modern does not mean glass. Good UI is product-specific.

## Component decision hierarchy

1.  Existing project design system
2.  Existing accessible primitive already installed
3.  shadcn/ui or equivalent foundational primitive
4.  Specialized component/reference source
5.  Custom component when differentiation or behavior requires it

Do not add a dependency for something trivial to implement cleanly.

## Resource routing

### Full-site / visual-direction inspiration

Use: Scrolltide, Minimal Gallery, Kage, Refero Styles.

### Product and mobile pattern research

Use: Component Gallery, AppShot Gallery, Navbar Gallery, Footer Design,
CTA Gallery, 404s.

### Agent-readable design systems and prompts

Use: DESIGNmd, VibePrompt.

### Components

Use: 21st.dev, shadcn/ui, Aceternity UI, Magic UI, Motion Primitives,
Uiverse, UIAble, mapcn.

### Motion and micro-interactions

Use: Kinetics, Motion Primitives, MicroKit UI, Anime.js.

### Specialized effects/assets

Use: Liquid Glass, CSS Text Effects, Circle Loaders, Gradient Buttons,
Kitbitz, 3Dicons.

See `references/resource-map.md` for URLs and usage rules.

## Product modes

### Landing page

Prioritize message clarity, differentiated visual direction, proof,
product demonstration, conversion path, performance, and mobile
presentation.

### Dashboard / SaaS

Prioritize information architecture, density, predictable interaction,
states, keyboard access, tables/forms/navigation, and speed. Decorative
motion is secondary.

### Mobile app

Prioritize touch ergonomics, navigation, state persistence, keyboard
behavior, safe areas, loading/error/empty states, and content density.

### Marketing microsite / cinematic experience

Motion and 3D can be more expressive, but progressive enhancement and
performance still apply.

## Oyinca mode

When the product is Oyinca: - aesthetic: premium, restrained, confident,
creator-focused - product should feel like a capable social-media
operator, not a generic AI dashboard - prioritize TikTok workflow
clarity - product demonstration beats decorative illustration - avoid
generic AI gradients, excessive glass, repetitive card grids, sparkle
motifs, and cookie-cutter shadcn appearance - mobile execution is
first-class - animation should feel cinematic on marketing surfaces and
fast/functional inside dashboard - preserve existing working backend/API
behavior during UI work - do not alter unrelated code - keep legal/trust
surfaces such as privacy and terms discoverable - loading, upload,
processing, approval, publishing, failure, retry, and connection states
must be visually explicit

## Definition of done

A UI task is not complete because JSX renders.

It is complete when: - primary task is obvious - visual direction is
coherent - responsive layouts work - interaction states exist -
accessibility basics pass - performance is reasonable - browser
verification shows no obvious visual/runtime issue - implementation fits
the existing codebase - no unnecessary design-system fragmentation was
introduced

## Agent output behavior

When asked to build: 1. inspect the current product/code first; 2. state
the visual thesis briefly; 3. implement, don't just describe; 4. keep
scope to the requested surface; 5. verify the result visually; 6. report
what changed and any unresolved issues.

When asked for a prompt for another coding agent, translate this skill
into task-specific instructions, but do not paste the entire skill
unless explicitly requested.

## Specialized companion skills

For task-specific enhancement, consult
`references/specialized-skill-routing.md`. Do not activate every
companion skill by default. Route based on the actual task.

Default release pipeline for substantial UI work: **core design →
implementation → accessibility → interface-guideline audit → rendered
design review**.

For public marketing surfaces, add SEO and AI-discovery passes after UX
and content hierarchy are sound.

## Broader engineering agent layer

For substantial coding work, also consult
`references/opencode-engineering-repos.md`. The Premium UI/UX skill owns
product-specific design decisions; engineering methodology skills wrap
the implementation and verification process. Use the precedence rules
there whenever third-party skill instructions overlap or conflict.
