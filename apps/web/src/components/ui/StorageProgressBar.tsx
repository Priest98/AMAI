import React from "react";

interface StorageProgressBarProps {
  usedGB: number;
  totalGB: number;
}

export default function StorageProgressBar({ usedGB, totalGB }: StorageProgressBarProps) {
  const percentage = Math.min(100, Math.round((usedGB / totalGB) * 100));

  return (
    <div>
      <div className="flex justify-between text-xs font-semibold mb-1.5">
        <span style={{ color: "var(--text-secondary)" }}>Storage Used</span>
        <span style={{ color: "var(--accent-error)" }}>
          {usedGB} GB / {totalGB} GB
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--bg-surface-raised)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: "var(--accent-primary)",
          }}
        />
      </div>
    </div>
  );
}
