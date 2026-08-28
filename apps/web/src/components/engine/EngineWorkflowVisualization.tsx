"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Wand2,
  Target,
  PenLine,
  CalendarClock,
  ShieldCheck,
  Send,
  Gem,
  AlertTriangle,
} from "lucide-react";
import { useEngineEvents, EngineEvent } from "@/lib/useEngineEvents";

/**
 * Oyinca's live workflow visualization -- the product's visual
 * centerpiece. Every node here is driven by real EngineEvent rows arriving
 * over the app's existing SSE stream (see EngineEventsContext /
 * SupabaseRealtimeService), not a decorative fake timeline: a node only
 * lights up because the actual pipeline (apps/api/src/engine/engine.service.ts,
 * publishing.service.ts) really did that step for real media, moments ago.
 *
 * Stage labels follow the premium-conversion brief's "Oyinca is working"
 * narrative (Observe -> Analyze -> Strategize -> Create -> Schedule ->
 * Review -> Publish) instead of raw technical step names -- same real
 * EngineEventType mapping as before, just told as what Oyinca is actually
 * doing rather than what function ran. "Review" (human approval) isn't in
 * the brief's own 6-word version of the loop, but it's a real step this
 * product actually has, so it stays rather than being dropped to match the
 * brief's word count exactly. Caption + hashtag generation collapse into
 * one "Create" node -- from the outside these are one creative act, not two.
 */
type StageKey = "observe" | "analyze" | "strategize" | "create" | "schedule" | "review" | "publish";

interface Stage {
  key: StageKey;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  matches: string[];
}

const STAGES: Stage[] = [
  { key: "observe", label: "Observing new content", icon: Eye, matches: ["MEDIA_UPLOADED"] },
  { key: "analyze", label: "Analyzing", icon: Wand2, matches: ["ANALYSIS_STARTED"] },
  { key: "strategize", label: "Strategizing timing", icon: Target, matches: ["BEST_TIME_DETERMINED"] },
  { key: "create", label: "Creating caption & tags", icon: PenLine, matches: ["CAPTION_GENERATED", "HASHTAGS_GENERATED"] },
  { key: "schedule", label: "Scheduling", icon: CalendarClock, matches: ["AUTO_SCHEDULED", "POSTING_SCHEDULE_UPDATED"] },
  { key: "review", label: "Awaiting your review", icon: ShieldCheck, matches: ["APPROVAL_QUEUED", "POST_APPROVED"] },
  { key: "publish", label: "Publishing", icon: Send, matches: ["PUBLISH_STARTED", "PUBLISH_UPLOADING", "PUBLISH_SUCCEEDED"] },
];

const PULSE_WINDOW_MS = 4000;
const RECENT_WINDOW_MS = 30000;

export default function EngineWorkflowVisualization() {
  const [lastActive, setLastActive] = useState<Partial<Record<StageKey, number>>>({});
  const [latestMessage, setLatestMessage] = useState<string | null>(null);
  // Tracks whether the latest message was a real PUBLISH_FAILED event, so
  // the caption can read as an actual failure (red, warning icon) instead
  // of blending in with routine progress messages in the same neutral
  // gray -- a failed publish is not "just more pipeline activity."
  const [latestIsFailure, setLatestIsFailure] = useState(false);
  const [, forceTick] = useState(0);
  const latestEventAtRef = useRef<number>(0);

  useEngineEvents((event: EngineEvent) => {
    const now = Date.now();
    const stage = STAGES.find((s) => s.matches.includes(event.type));
    if (stage) {
      setLastActive((prev) => ({ ...prev, [stage.key]: now }));
    }
    if (event.message) {
      setLatestMessage(event.message);
      setLatestIsFailure(event.type === 'PUBLISH_FAILED');
    }
    latestEventAtRef.current = now;
  });

  // Re-render periodically so nodes decay from "pulsing" -> "recent" ->
  // "idle" over time even with no new events arriving.
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const now = Date.now();
  const isLive = now - latestEventAtRef.current < PULSE_WINDOW_MS;

  const stateFor = (key: StageKey): "pulsing" | "recent" | "idle" => {
    const at = lastActive[key];
    if (!at) return "idle";
    const age = now - at;
    if (age < PULSE_WINDOW_MS) return "pulsing";
    if (age < RECENT_WINDOW_MS) return "recent";
    return "idle";
  };

  return (
    <div className="exec-card p-5 sm:p-7 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-h3" style={{ color: "var(--text-primary)" }}>
            Oyinca
          </h3>
          <p className="text-caption mt-0.5">Live automation pipeline</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: isLive ? "var(--accent-success)" : "var(--text-muted)",
              boxShadow: isLive ? "0 0 0 4px var(--accent-success-subtle)" : "none",
              transition: "all 300ms var(--ease-standard)",
            }}
          />
          <span className="text-overline" style={{ color: isLive ? "var(--accent-success)" : "var(--text-muted)" }}>
            {isLive ? "Live" : "Idle"}
          </span>
        </div>
      </div>

      {/* Pipeline */}
      <div className="relative flex items-start justify-between gap-1 sm:gap-2 overflow-x-auto pb-2">
        {/* connecting line */}
        <div
          className="absolute top-6 left-0 right-0 h-px hidden sm:block"
          style={{ backgroundColor: "var(--card-border)" }}
        />
        {STAGES.map((stage, i) => {
          const state = stateFor(stage.key);
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="relative flex flex-col items-center flex-1 min-w-[72px] z-10">
              <motion.div
                className="h-12 w-12 rounded-full flex items-center justify-center relative"
                animate={
                  state === "pulsing"
                    ? { scale: [1, 1.08, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 1.4, repeat: state === "pulsing" ? Infinity : 0, ease: "easeInOut" }}
                style={{
                  backgroundColor: state === "idle" ? "var(--bg-surface-sunken)" : "var(--accent-secondary-subtle)",
                  border: `1px solid ${state === "idle" ? "var(--card-border)" : "var(--accent-secondary)"}`,
                  boxShadow: state === "pulsing" ? "0 0 0 6px var(--accent-secondary-subtle)" : "none",
                  transition: "background-color 400ms var(--ease-standard), border-color 400ms var(--ease-standard), box-shadow 400ms var(--ease-standard)",
                }}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: state === "idle" ? "var(--text-muted)" : "var(--accent-secondary)" }}
                />
              </motion.div>
              <span
                className="text-[10.5px] font-semibold text-center mt-2 leading-tight px-0.5"
                style={{ color: state === "idle" ? "var(--text-muted)" : "var(--text-primary)" }}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Latest activity caption -- styled distinctly when it's a real
          publish failure, not just routine pipeline progress. */}
      <AnimatePresence mode="wait">
        {latestMessage && (
          <motion.p
            key={latestMessage}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="text-body-sm mt-6 pt-4 border-t flex items-center gap-1.5"
            style={{
              color: latestIsFailure ? "var(--accent-error)" : "var(--text-secondary)",
              borderColor: "var(--card-border)",
            }}
          >
            {latestIsFailure && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
            <span>{latestMessage}</span>
          </motion.p>
        )}
      </AnimatePresence>

      {/* Measure & Learn -- the brief's closing two steps of the loop.
          Deliberately not an animated live node like the ones above: unlike
          a caption or a publish, "measuring" isn't a single instant Oyinca
          can pulse on, it's an always-on background fact (MetricsService's
          sync-post-metrics cron, feeding Oyinca Intelligence -- see
          apps/api/src/posts/posts.service.ts's getContentIntelligence).
          States the real mechanism plainly rather than faking a live tick
          for something that isn't actually event-driven. */}
      <div
        className="text-caption mt-4 pt-4 border-t flex items-center gap-1.5"
        style={{ color: "var(--text-muted)", borderColor: "var(--card-border)" }}
      >
        <Gem className="h-3 w-3 shrink-0" />
        <span>Every published post feeds Oyinca Intelligence, so it keeps learning what actually works for this brand.</span>
      </div>
    </div>
  );
}
