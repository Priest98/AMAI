"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Radio,
  ShieldAlert,
} from "lucide-react";
import { useEngineEvents, EngineEvent } from "@/lib/useEngineEvents";

/**
 * Real, in-app notifications for automation events -- not decorative. Every
 * entry here is a genuine EngineEvent broadcast by the backend the moment
 * something the user would actually want to know about happens (a post
 * published, a publish failed and needs attention, a post landed in the
 * Approval Queue, an account's token expired). Driven by the same SSE stream
 * (useEngineEvents) as the AMAI Engine visualization and every other live
 * surface in the app.
 */

const NOTIFIABLE_TYPES = new Set([
  "PUBLISH_SUCCEEDED",
  "PUBLISH_FAILED",
  "APPROVAL_QUEUED",
  "ACCOUNT_DISCONNECTED",
]);

const ICON_FOR: Record<string, React.ComponentType<{ className?: string }>> = {
  PUBLISH_SUCCEEDED: CheckCircle2,
  PUBLISH_FAILED: XCircle,
  APPROVAL_QUEUED: Clock,
  ACCOUNT_DISCONNECTED: ShieldAlert,
};

const COLOR_FOR: Record<string, string> = {
  PUBLISH_SUCCEEDED: "var(--accent-success)",
  PUBLISH_FAILED: "var(--accent-error)",
  APPROVAL_QUEUED: "var(--accent-warning)",
  ACCOUNT_DISCONNECTED: "var(--accent-error)",
};

const DEFAULT_MESSAGE: Record<string, string> = {
  PUBLISH_SUCCEEDED: "A post published successfully.",
  PUBLISH_FAILED: "A post failed to publish -- check Scheduled Posts.",
  APPROVAL_QUEUED: "A new post is waiting in the Approval Queue.",
  ACCOUNT_DISCONNECTED: "A connected account was disconnected.",
};

interface Notification extends EngineEvent {
  read: boolean;
}

export default function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEngineEvents((event: EngineEvent) => {
    if (!NOTIFIABLE_TYPES.has(event.type)) return;
    setItems((prev) => [{ ...event, read: false }, ...prev].slice(0, 20));
  });

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) markAllRead();
      return next;
    });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={toggleOpen}
        className="relative h-8 w-8 rounded-[var(--radius-md)] transition border flex items-center justify-center touch-target"
        style={{ backgroundColor: "var(--bg-surface-raised)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
        aria-label="Notifications"
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ backgroundColor: "var(--accent-error)", color: "#fff" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel absolute right-0 top-11 w-80 max-h-96 overflow-y-auto rounded-[var(--radius-lg)] p-2 z-50"
          >
            <div className="flex items-center justify-between px-2.5 py-2">
              <span className="text-overline">Notifications</span>
              {items.length > 0 && (
                <Radio className="h-3 w-3" style={{ color: "var(--accent-success)" }} />
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Sparkles className="h-5 w-5 mb-2" style={{ color: "var(--text-muted)" }} />
                <p className="text-caption" style={{ color: "var(--text-muted)" }}>
                  Nothing yet. Automation events will show up here as they happen.
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {items.map((n) => {
                  const Icon = ICON_FOR[n.type] || Sparkles;
                  const color = COLOR_FOR[n.type] || "var(--accent-secondary)";
                  return (
                    <li
                      key={n.id}
                      className="flex items-start gap-2.5 px-2.5 py-2.5 rounded-[var(--radius-md)] transition"
                      style={{ backgroundColor: n.read ? "transparent" : "var(--hover-surface)" }}
                    >
                      <span className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm leading-snug" style={{ color: "var(--text-primary)" }}>
                          {n.message || DEFAULT_MESSAGE[n.type] || n.type}
                        </p>
                        <p className="text-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
