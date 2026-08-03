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
        <div className="text-numeric leading-tight truncate" style={{ color: valueColor }}>
          {value}
        </div>
        <div className="text-body-sm leading-tight truncate" style={{ color: "var(--text-secondary)" }}>
          {helperText}
        </div>
      </div>
    </div>
  );
}
