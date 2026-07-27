import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "purple" | "success" | "warning" | "neutral";
}

const VARIANT_CLASSES: Record<NonNullable<BadgeProps["variant"]>, string> = {
  purple: "badge-purple",
  success: "bg-[var(--accent-success)]/15 text-[var(--accent-success)] border border-[var(--accent-success)]/30",
  warning: "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)] border border-[var(--accent-warning)]/30",
  neutral: "bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] border border-white/10",
};

export default function Badge({ children, variant = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
