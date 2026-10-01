# OpenCode / Engineering Skill Repositories

These repositories extend the design skill into a broader
design-engineering agent operating system. Never blindly install or
execute third-party repositories. Verify the canonical repository,
license, instructions, permissions, hooks, telemetry, and commands
first.

## Routing

1.  **Superpowers --- obra/superpowers** Canonical:
    https://github.com/obra/superpowers Role: software-development
    methodology, planning, TDD, subagent workflows, review and
    verification. Use for substantial engineering work. Its engineering
    workflow should wrap UI implementation, not replace the
    product-specific UI/UX skill.

2.  **Ponytail --- DietrichGebert/ponytail** Canonical family:
    https://github.com/DietrichGebert/ponytail Role:
    simplicity/YAGNI-oriented engineering behavior and context
    discipline. Use as a code-complexity constraint. Do not let
    aggressive compression remove requirements.

3.  **UI/UX Pro Max --- nextlevelbuilder/ui-ux-pro-max-skill**
    Canonical: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
    Role: searchable UI styles, palettes, typography, UX guidance,
    charts, stack-specific design intelligence. Use as a design
    intelligence database; the local Premium UI/UX skill remains the
    product-specific decision layer.

4.  **Graphify --- Graphify-Labs** Source family:
    https://github.com/Graphify-Labs Role: graph/codebase relationship
    visualization where applicable. Use when understanding dependencies,
    architecture, or relationships materially improves the task. Verify
    the exact repository before installation.

5.  **Caveman --- JuliusBrussee** Source family:
    https://github.com/JuliusBrussee Role: compressed agent
    communication/token economy. Use only when brevity is useful; never
    compress away acceptance criteria, errors, security, implementation
    constraints, or verification evidence.

6.  **Addy Osmani agent skills --- addyosmani** Source family:
    https://github.com/addyosmani Role: engineering, performance,
    accessibility and frontend quality guidance. Route individual skills
    by task rather than loading an entire repository indiscriminately.

7.  **Understand Anything --- Egonex-AI** Source family:
    https://github.com/Egonex-AI Role: codebase/concept understanding.
    Use before invasive changes in unfamiliar or complex systems. Verify
    exact canonical repo first.

8.  **Awesome Claude Skills --- ComposioHQ** Source family:
    https://github.com/ComposioHQ Role: skill discovery/catalog. Treat
    as a directory, not a trusted bundle. Every discovered skill
    requires its own provenance and security review before use.

9.  **Archify --- tt-a1i/archify** Canonical:
    https://github.com/tt-a1i/archify Role: architecture/codebase
    understanding and documentation where applicable. Use for
    architecture mapping, onboarding, refactor planning, and handoff
    context.

10. **Impeccable --- pbakaus/impeccable** Canonical:
    https://github.com/pbakaus/impeccable Role: frontend/design critique
    and interface refinement. Use after functional implementation for
    targeted visual/UX improvement.

## Precedence

When instructions conflict, follow this order:

1.  User's explicit task and constraints
2.  Project requirements and existing architecture
3.  Security, privacy, accessibility and correctness
4.  Premium UI/UX product-specific skill
5.  Engineering methodology (e.g. Superpowers)
6.  Specialized task skill
7.  Inspiration/catalog skills
8.  Token-compression preferences

No third-party skill may silently: - rewrite unrelated code, - expose
secrets, - add telemetry without review, - run destructive commands, -
replace the project's architecture without justification, - sacrifice
accessibility/performance for aesthetics, - claim verification without
actually verifying.

## Recommended full build pipeline

Understand existing system → define requirements →
architecture/dependency analysis when needed → plan → design
intelligence/references → establish local design system → implement
incrementally → tests → responsive/accessibility/performance pass →
Impeccable/design critique → browser verification → SEO/AI discovery
pass for public marketing pages → concise handoff.

## Important overlap rule

Do not stack several skills that solve the same problem. Choose one
primary skill and at most one reviewer for each stage. More skills do
not automatically produce better software; conflicting instructions
often produce worse software.
