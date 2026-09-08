"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Gem,
  Radio,
  ShieldAlert,
  Wand2,
} from "lucide-react";
import { useEngineEvents, EngineEvent } from "@/lib/useEngineEvents";
import { brandFetch, getBrandId } from "@/lib/api";

const READ_STORAGE_KEY = "oyinca:read-notification-ids";

/**
 * Real, in-app notifications for automation events -- not decorative. Every
 * entry here is a genuine EngineEvent broadcast by the backend the moment
 * something the user would actually want to know about happens (a post
 * published, a publish failed and needs attention, a post landed in the
 * Approval Queue, an account's token expired). Driven by the same SSE stream
 * (useEngineEvents) as Oyinca visualization and every other live
 * surface in the app.
 *
 * Each notifiable type maps to exactly one destination via LINK_FOR, so a
 * notification is always a way to get to the thing it's about -- not just an
 * announcement. Kept to a short allowlist (NOTIFIABLE_TYPES) on purpose: the
 * engine emits far more event types than this (caption written, hashtags
 * generated, media optimized...), and surfacing every one would make this
 * noisy rather than useful.
 */

const NOTIFIABLE_TYPES = new Set([
  "PUBLISH_SUCCEEDED",
  "PUBLISH_FAILED",
  "APPROVAL_QUEUED",
  "ACCOUNT_DISCONNECTED",
  "POST_REJECTED",
]);

const ICON_FOR: Record<string, React.ComponentType<{ className?: string }>> = {
  PUBLISH_SUCCEEDED: CheckCircle2,
  PUBLISH_FAILED: XCircle,
  APPROVAL_QUEUED: Clock,
  ACCOUNT_DISCONNECTED: ShieldAlert,
  POST_REJECTED: Wand2,
};

const COLOR_FOR: Record<string, string> = {
  PUBLISH_SUCCEEDED: "var(--accent-success)",
  PUBLISH_FAILED: "var(--accent-error)",
  APPROVAL_QUEUED: "var(--accent-warning)",
  ACCOUNT_DISCONNECTED: "var(--accent-error)",
  POST_REJECTED: "var(--accent-warning)",
};

const DEFAULT_MESSAGE: Record<string, string> = {
  PUBLISH_SUCCEEDED: "A post published successfully.",
  PUBLISH_FAILED: "A post failed to publish -- check Scheduled Posts.",
  APPROVAL_QUEUED: "A new post is waiting in the Approval Queue.",
  ACCOUNT_DISCONNECTED: "A connected account was disconnected.",
  POST_REJECTED: "A post was rejected and needs revision.",
};

/** Where clicking each notification type should take the user. */
const LINK_FOR: Record<string, string> = {
  PUBLISH_SUCCEEDED: "/dashboard/published",
  PUBLISH_FAILED: "/dashboard/scheduled",
  APPROVAL_QUEUED: "/dashboard/approval-queue",
  ACCOUNT_DISCONNECTED: "/dashboard/integrations",
  POST_REJECTED: "/dashboard/approval-queue",
};

interface Notification extends EngineEvent {
  read: boolean;
}

export default function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    let stored: string[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(`${READ_STORAGE_KEY}:${getBrandId()}`) || '[]');
      if (Array.isArray(parsed)) stored = parsed.filter((id): id is string => typeof id === 'string');
    } catch { /* Browser storage is optional; events still load. */ }
    const readIds = new Set(stored);
    brandFetch<EngineEvent[]>("/engine/activity")
      .then((events) => {
        if (cancelled) return;
        setItems(
          events
            .filter((event) => NOTIFIABLE_TYPES.has(event.type))
            .slice(0, 20)
            .map((event) => ({ ...event, read: readIds.has(event.id) })),
        );
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [retry]);

  useEngineEvents((event: EngineEvent) => {
    if (!NOTIFIABLE_TYPES.has(event.type)) return;
    setItems((prev) => [{ ...event, read: false }, ...prev.filter((item) => item.id !== event.id)].slice(0, 20));
  });

  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((prev) => {
    const next = prev.map((n) => ({ ...n, read: true }));
    try { localStorage.setItem(`${READ_STORAGE_KEY}:${getBrandId()}`, JSON.stringify(next.map((n) => n.id).slice(0, 100))); } catch { /* Keep in-memory read state if storage is unavailable. */ }
    return next;
  });

  const toggleOpen = () => {
    if (!open) markAllRead();
    setOpen(!open);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={toggleOpen}
        className="btn-icon-glass relative h-8 w-8 flex items-center justify-center touch-target"
        style={{ color: "var(--text-primary)" }}
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
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

      <Modal open={open} onClose={() => setOpen(false)} title="Notifications">
            {loading ? <p role="status" className="text-sm p-4">Loading notifications…</p> : loadError ? <div role="alert" className="space-y-3 p-4"><p>Notifications could not be loaded.</p><button className="btn-secondary touch-target px-4" onClick={() => setRetry((value) => value + 1)}>Retry notifications</button></div> : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Gem className="h-5 w-5 mb-2" style={{ color: "var(--text-muted)" }} />
                <p className="text-caption" style={{ color: "var(--text-muted)" }}>
                  Nothing yet. Automation events will show up here as they happen.
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {items.map((n) => {
                  const Icon = ICON_FOR[n.type] || Gem;
                  const color = COLOR_FOR[n.type] || "var(--accent-secondary)";
                  const href = LINK_FOR[n.type];
                  const content = (
                    <>
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
                    </>
                  );
                  const itemClass = "flex items-start gap-2.5 px-2.5 py-2.5 rounded-[var(--radius-md)] transition";
                  const itemStyle = { backgroundColor: n.read ? "transparent" : "var(--hover-surface)" };
                  return (
                    <li key={n.id}>
                      {href ? (
                        <Link href={href} onClick={() => setOpen(false)} className={`${itemClass} hover:opacity-80`} style={itemStyle}>
                          {content}
                        </Link>
                      ) : (
                        <div className={itemClass} style={itemStyle}>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
      </Modal>
    </div>
  );
}
