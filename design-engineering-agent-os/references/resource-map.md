# UI/UX Resource Map

Use these as research/implementation sources. Availability, licensing,
APIs, and component interfaces can change; verify the current source
before copying code or assets.

  ---------------------------------------------------------------------------------------------------
  Resource          URL                                       Best use              Agent rule
  ----------------- ----------------------------------------- --------------------- -----------------
  Scrolltide        https://scrolltide.co                     Full-build, 3D and    Use for cinematic
                                                              scroll-driven         direction; do not
                                                              inspiration/prompts   force scroll
                                                                                    effects into
                                                                                    product UI.

  Minimal Gallery   https://minimal.gallery                   High-end website      Extract
                                                              inspiration           hierarchy,
                                                                                    typography,
                                                                                    spacing and
                                                                                    restraint.

  Kage              https://kage.design                       UI inspiration and    Use to turn
                                                              prompt translation    visual references
                                                                                    into
                                                                                    implementation
                                                                                    language.

  Refero Styles     https://styles.refero.design              Product styles and    Study complete
                                                              typography references visual systems,
                                                                                    not isolated
                                                                                    colors.

  Component Gallery https://component.gallery                 Cross-design-system   Compare component
                                                              component patterns    anatomy before
                                                                                    custom invention.

  AppShot Gallery   https://appshot.gallery                   Mobile app            Use for mobile IA
                                                              screenshots           and
                                                                                    screen-pattern
                                                                                    research.

  Navbar Gallery    https://navbar.gallery                    Navigation            Match nav
                                                              inspiration           complexity to
                                                                                    information
                                                                                    architecture.

  Footer Design     https://footer.design                     Footer patterns       Use for hierarchy
                                                                                    and terminal
                                                                                    navigation, not
                                                                                    decoration.

  CTA Gallery       https://cta.gallery                       CTA/form/button       Use to study
                                                              inspiration           conversion
                                                                                    patterns;
                                                                                    validate
                                                                                    accessibility
                                                                                    yourself.

  404s              https://404s.design                       Error/404 inspiration Keep recovery
                                                                                    action obvious.

  DESIGNmd          https://designmd.ai                       Agent-readable        Use to formalize
                                                              design-system         design decisions
                                                              concepts              before
                                                                                    implementation.

  VibePrompt        https://vibeprompts.dev                   UI prompts            Treat as starting
                                                                                    points, never
                                                                                    product strategy.

  21st.dev          https://21st.dev                          Component registry /  Adapt components
                                                              agent workflows       to local design
                                                                                    tokens and
                                                                                    dependency
                                                                                    policy.

  Kinetics          https://kinetics.colorion.co              Motion                Use selectively;
                                                              references/effects    respect reduced
                                                                                    motion.

  shadcn/ui         https://ui.shadcn.com                     Accessible composable Prefer as
                                                              primitives            foundation when
                                                                                    compatible;
                                                                                    heavily theme for
                                                                                    brand.

  Aceternity UI     https://ui.aceternity.com                 Animated              Use sparingly on
                                                              React/Tailwind        marketing
                                                              components            surfaces.

  Magic UI          https://magicui.design                    Animated UI           Use only where
                                                              components            motion supports
                                                                                    the story.

  Motion Primitives https://motion-primitives.com             Motion building       Prefer coherent
                                                              blocks                motion primitives
                                                                                    over random
                                                                                    effects.

  Uiverse           https://uiverse.io                        Community UI snippets Audit quality,
                                                                                    accessibility,
                                                                                    licensing and
                                                                                    dependencies.

  UIAble            https://uiable.com                        UI                    Use as reference;
                                                              patterns/components   align with
                                                                                    project system.

  mapcn             https://mapcn.dev                         Map components        Use for
                                                                                    map-specific UI;
                                                                                    verify mapping
                                                                                    stack
                                                                                    compatibility.

  MicroKit UI       https://microkit.co                       Micro-interactions    Use for
                                                                                    meaningful
                                                                                    feedback and
                                                                                    polish.

  Liquid Glass      https://glass.samasante.com               Glass/refraction      Accent only;
                                                              effects               never make
                                                                                    readability
                                                                                    depend on it.

  CSS Text Effects  https://text-effects.colorion.co          Text effects          Reserve for
                                                                                    expressive
                                                                                    marketing
                                                                                    moments.

  Circle Loaders    https://circleloaders.dominikakissi.com   Loading indicators    Choose loader
                                                                                    based on wait
                                                                                    state and
                                                                                    perceived
                                                                                    duration.

  Gradient Buttons  https://gradientbuttons.colorion.co       Button styling        Avoid gradient
                                                              inspiration           buttons by
                                                                                    default; use only
                                                                                    if brand system
                                                                                    supports them.

  Kitbitz           https://kitbitz.art                       Hand-drawn            Check license and
                                                              illustrations         visual fit before
                                                                                    use.

  3Dicons           https://3dicons.co                        3D icon assets        Use consistently,
                                                                                    not mixed with
                                                                                    unrelated icon
                                                                                    styles.

  Anime.js          https://animejs.com                       JavaScript animation  Use for justified
                                                              engine                custom motion;
                                                                                    avoid dependency
                                                                                    for trivial
                                                                                    transitions.
  ---------------------------------------------------------------------------------------------------

## Research protocol

For a new interface, choose at most: - 2--4 visual reference sources, -
1 foundational component system, - 0--2 specialized component/effect
sources, - 1 motion approach.

Do not browse every source on every task. That wastes context and
encourages incoherent design.

## External code/assets

Before importing: - verify license - verify package/source
authenticity - inspect dependencies - check framework/version
compatibility - test accessibility - test responsive behavior - remove
demo-only code - convert styling to project tokens - avoid copying
proprietary site implementations
