import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "purple" | "success" | "warning" | "neutral";
}

const VARIANT_CLASSES: Record<NonNullable<BadgeProps["variant"]>, string> = {
  purple: "badge-purple",
  success: "bg-[var(--accent-success-subtle)] text-[var(--accent-success)] border border-[var(--accent-success)]/25",
  warning: "bg-[var(--accent-warning-subtle)] text-[var(--accent-warning)] border border-[var(--accent-warning)]/25",
  neutral: "bg-[var(--glass-card-bg)] text-[var(--text-secondary)] border border-[var(--glass-card-border)]",
};

export default function Badge({ children, variant = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
