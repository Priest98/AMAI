import React from "react";

interface InsightTileProps {
  label: string;
  value: string;
}

export function InsightTile({ label, value }: InsightTileProps) {
  return (
    <div className="surface-tile rounded-2xl p-4 border border-slate-200/60 dark:border-white/5">
      <div className="tile-label mb-1 font-bold">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}

interface ContentScoreCardProps {
  score: number;
  summary: string;
  tips: string[];
}

export function ContentScoreCard({ score, summary, tips }: ContentScoreCardProps) {
  return (
    <div className="surface-tile rounded-2xl p-5 border border-slate-200/60 dark:border-white/5 space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{score}</span>
        <span style={{ color: "var(--text-secondary)" }} className="text-xs font-bold">/ 100</span>
      </div>
      <p className="text-sm font-semibold">{summary}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {tips.slice(0, 2).map((tip) => (
          <span
            key={tip}
            className="text-xs font-bold rounded-full px-3 py-1 border"
            style={{
              backgroundColor: "rgba(0, 217, 181, 0.15)",
              color: "var(--accent-success)",
              borderColor: "rgba(0, 217, 181, 0.3)",
            }}
          >
            ✓ {tip}
          </span>
        ))}
      </div>
    </div>
  );
}
