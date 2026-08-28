import React from "react";

interface InsightTileProps {
  label: string;
  value: string;
}

export function InsightTile({ label, value }: InsightTileProps) {
  return (
    <div className="surface-tile rounded-xl p-4 border border-slate-200/60 dark:border-white/5">
      <div className="tile-label mb-1 font-bold">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}

interface ContentScoreCardProps {
  score: number;
  verdict?: string;
  recommendation?: string;
  summary?: string;
  tips?: string[];
  suggestions?: string[];
}

export function ContentScoreCard({
  score,
  verdict = "Ready to Publish",
  recommendation,
  summary,
  tips,
  suggestions,
}: ContentScoreCardProps) {
  const displayTips = tips || suggestions || [];
  const displaySummary = recommendation || summary || "High engagement potential: good hook and hashtag density.";

  return (
    <div className="surface-tile rounded-xl p-5 border space-y-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{score}</span>
          <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>/ 100</span>
        </div>
        <span className="text-xs font-bold text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10">
          {verdict}
        </span>
      </div>

      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{displaySummary}</p>

      <div className="flex flex-wrap gap-2 pt-1">
        {displayTips.slice(0, 3).map((tip) => (
          <span
            key={tip}
            className="text-[11px] font-semibold rounded-lg px-2.5 py-1 border"
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
