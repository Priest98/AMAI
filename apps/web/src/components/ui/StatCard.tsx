import React from "react";
import { CountUp } from "./CountUp";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  helperText: string;
  valueColor?: string;
  onExpand?: () => void;
}

export default function StatCard({
  icon,
  label,
  value,
  helperText,
  valueColor = "var(--text-primary)",
  onExpand,
}: StatCardProps) {
  // Animate when `value` is a plain integer (the common case: post/media
  // counts) -- falls back to a static string render for anything else
  // (e.g. a value that already carries a unit or symbol) so this stays a
  // drop-in upgrade rather than a breaking prop-shape change.
  const numericValue = /^-?\d+$/.test(value) ? Number(value) : null;
  return (
    <div className="exec-card exec-card-interactive p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div
            className="h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "var(--bg-surface-sunken)" }}
          >
            {icon}
          </div>
          <span className="text-caption truncate" style={{ color: "var(--text-secondary)" }}>
            {label}
          </span>
        </div>

        {onExpand && (
          <button
            onClick={onExpand}
            className="w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center text-xs transition hover:opacity-80 touch-target flex-shrink-0"
            style={{ backgroundColor: "var(--bg-surface-sunken)", color: "var(--text-secondary)" }}
          >
            ↗
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col space-y-1 min-w-0">
        <div className="text-numeric text-2xl sm:text-3xl font-bold leading-tight truncate" style={{ color: valueColor }}>
          {numericValue !== null ? <CountUp value={numericValue} /> : value}
        </div>
        <div className="text-body-sm leading-tight truncate" style={{ color: "var(--text-secondary)" }}>
          {helperText}
        </div>
      </div>
    </div>
  );
}
