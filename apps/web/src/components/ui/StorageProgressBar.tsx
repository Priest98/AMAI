import React from "react";

interface StorageProgressBarProps {
  usedGB: number;
  totalGB: number;
}

export default function StorageProgressBar({ usedGB, totalGB }: StorageProgressBarProps) {
  const percentage = Math.min(100, Math.round((usedGB / totalGB) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold">
        <span style={{ color: "var(--text-secondary)" }}>Storage Used</span>
        <span style={{ color: "var(--accent-warning)" }}>
          {usedGB} GB / {totalGB} GB
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden border backdrop-blur-sm"
        style={{ backgroundColor: "var(--glass-card-bg)", borderColor: "var(--glass-card-border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: "var(--accent-warning)",
            boxShadow: "0 0 8px var(--accent-warning)",
          }}
        />
      </div>
    </div>
  );
}
