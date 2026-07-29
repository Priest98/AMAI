"use client";

// Re-exported from EngineEventsContext, which hoists the actual SSE
// connection up to a single shared instance in dashboard/layout.tsx
// instead of every page opening (and tearing down on every navigation)
// its own EventSource. Kept as a thin shim so every existing
// `import { useEngineEvents } from '@/lib/useEngineEvents'` across the
// dashboard keeps working unchanged.
export { useEngineEvents } from './EngineEventsContext';
export type { EngineEvent } from './EngineEventsContext';
