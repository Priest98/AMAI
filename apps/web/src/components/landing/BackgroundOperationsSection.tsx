"use client";

import React from "react";
import { ArrowRight, Check } from "lucide-react";

const PIPELINE_NODES = [
  { step: "01", name: "Content", status: "Ingested", desc: "Raw media pulled from uploads or cloud drive" },
  { step: "02", name: "Analysed", status: "Processed", desc: "Vision models extract pace, hooks and dialogue" },
  { step: "03", name: "Prepared", status: "Formatted", desc: "Captions & hashtags synthesized with brand voice" },
  { step: "04", name: "Approved", status: "Verified", desc: "Awaiting your click or validated by Autopilot" },
  { step: "05", name: "Scheduled", status: "Queued", desc: "Locked to optimal audience activity window" },
  { step: "06", name: "Published", status: "Live", desc: "Direct to TikTok with analytics logging initialized" },
];

export default function BackgroundOperationsSection() {
  return (
    <section className="oy-background-section" aria-label="Background Autonomous Engine">
      <div className="text-center">
        <p className="oy-eyebrow justify-center">Autonomous Continuity</p>
        <h2 className="oy-background-headline">
          Your TikTok keeps moving even when you&apos;re not in Oyinca.
        </h2>
      </div>

      <div className="oy-pipeline-timeline" role="list">
        {PIPELINE_NODES.map((node, i) => (
          <div
            key={node.name}
            className={`oy-pipeline-step ${i <= 3 ? "is-active" : ""}`}
            role="listitem"
          >
            <div className="oy-pipeline-step-head">
              <span className="text-[11px] font-mono text-[var(--oy-blue-steel)] font-bold">
                {node.step}
              </span>
              <div className="oy-pipeline-indicator" />
            </div>

            <div>
              <div className="oy-pipeline-label">{node.name}</div>
              <p className="oy-pipeline-desc">{node.desc}</p>
            </div>

            <div className="pt-3 border-t border-[var(--oy-line)] flex items-center justify-between text-[11px]">
              <span className="text-[var(--oy-ink-faint)] font-mono">{node.status}</span>
              {i <= 3 && <Check className="w-3.5 h-3.5 text-[#10B981]" />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
