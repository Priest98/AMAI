# Repository map for coding agents

## Fast routing

| Task | Read first | Trace next | Validation |
|---|---|---|---|
| Brain/context/memory | `apps/api/src/business-brain/CONTEXT.md` | context resolver, OyincaBrainService, schema Brain models, AI gateway | Brain/skills/capability tests |
| Caption generation | Brain context | Engine call sites → Context Resolver → AiService → gateway | `oyinca-skills`, production regressions |
| TikTok auth/connect | `apps/api/src/oauth/CONTEXT.md` | OAuth controller/service → capabilities → auth or publishing consumer | TikTok-native auth tests |
| Publishing/retries | `apps/api/src/engine/CONTEXT.md` | cron → PublishingService → PostTarget/log → platform API | production regressions and content workflow |
| Scheduling/autopilot | Engine context | AmaiEngineConfig → SchedulingService → EngineService → approval state | autopilot/calendar E2E |
| Billing/plans | `apps/api/src/billing/CONTEXT.md` | plan config → controller/service → provider → entitlements/usage | billing regressions and plan-intent tests |
| Database model/migration | `apps/api/prisma/CONTEXT.md` | schema relations → service queries → migration history | Prisma generate, typecheck, root tests |
| Frontend/dashboard | `apps/web/CONTEXT.md` | page → shared component → `lib/api.ts` → guarded controller | web typecheck/build and focused Playwright |
| Media/upload | API context | upload-token route → MediaService → StorageService → optimization → Engine | production regressions/content E2E |
| Analytics/learning | Brain + Engine context | MetricsService → PostPerformance → LearningService/OyincaBrainService | Brain and analytics tests |
| Admin/health | API context | platform-admin guard → admin/health/error services → cron heartbeat | admin E2E and regressions |

## Context inheritance

```text
AGENTS.md
├── apps/web/CONTEXT.md
└── apps/api/CONTEXT.md
    ├── prisma/CONTEXT.md
    └── src/
        ├── business-brain/CONTEXT.md
        ├── engine/CONTEXT.md
        ├── oauth/CONTEXT.md
        └── billing/CONTEXT.md
```

Read the narrowest relevant file after the root guide. Local context adds domain rules; it does not replace the global rules. Source code, schema, tests, and current deployment configuration override stale prose.

## Navigation traps

- `apps/api/src/queue` is active publishing code, not a resident queue worker.
- `oauth-system` is legacy/untracked and not the production OAuth implementation.
- `apps/api/dist`, `.next`, and package `dist` folders are generated output; inspect source instead.
- Empty root package folders are not active abstractions.
- `apps/api/README.md` and `apps/web/README.md` are framework starter text, not architecture references.
