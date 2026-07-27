import React from "react";

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
  return (
    <div className="rounded-2xl p-5 border border-[var(--card-border)] exec-card-hover" style={{ backgroundColor: "var(--bg-surface)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>{icon}</div>
        {onExpand && (
          <button
            onClick={onExpand}
            className="w-8 h-8 rounded-full flex items-center justify-center transition hover:opacity-80 touch-target"
            style={{ backgroundColor: "var(--bg-surface-raised)" }}
          >
            ↗
          </button>
        )}
      </div>

      <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>

      <div className="text-3xl font-bold mb-1 tracking-tight" style={{ color: valueColor }}>
        {value}
      </div>

      <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {helperText}
      </div>
    </div>
  );
}
