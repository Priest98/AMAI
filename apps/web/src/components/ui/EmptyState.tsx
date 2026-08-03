import React from "react";
import Button from "./Button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Design System v2 empty-state primitive. Every list-driven page (Media
 * Library, Approval Queue, Scheduled, Published, Activity Feed) hits this
 * state constantly for a new account, and it previously varied page to
 * page -- standardizing it is a big part of what makes the app feel
 * considered rather than assembled from parts.
 */
export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="text-h3 mb-1.5" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      {description && (
        <p className="text-body-sm max-w-sm mb-5" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
