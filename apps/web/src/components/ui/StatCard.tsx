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
    <div
      className="rounded-xl p-3.5 border transition flex flex-col justify-between"
      style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--card-border)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="p-1 rounded-lg flex-shrink-0" style={{ backgroundColor: "var(--bg-surface-raised)" }}>
            {icon}
          </div>
          <span className="text-xs font-semibold truncate" style={{ color: "var(--text-secondary)" }}>
            {label}
          </span>
        </div>

        {onExpand && (
          <button
            onClick={onExpand}
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs transition hover:opacity-80 touch-target flex-shrink-0"
            style={{ backgroundColor: "var(--bg-surface-raised)", color: "var(--text-secondary)" }}
          >
            ↗
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col space-y-0.5 min-w-0">
        <div className="text-lg sm:text-xl font-bold tracking-tight leading-tight truncate" style={{ color: valueColor }}>
          {value}
        </div>
        <div className="text-[11px] font-medium leading-tight truncate" style={{ color: "var(--text-secondary)" }}>
          {helperText}
        </div>
      </div>
    </div>
  );
}
