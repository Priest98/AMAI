"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Upload, Sparkles, CheckCircle2, Calendar, BarChart3 } from "lucide-react";

interface Stage {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  imageSrc: string;
  title: string;
  description: string;
}

const STAGES: Stage[] = [
  {
    id: "upload",
    label: "01. Upload",
    icon: Upload,
    imageSrc: "/hero-film/captures/desktop-content.png",
    title: "Media Library & Ingestion",
    description: "Connect Google Drive or upload photos and raw video batches directly into your Oyinca workspace.",
  },
  {
    id: "processing",
    label: "02. AI Processing",
    icon: Sparkles,
    imageSrc: "/hero-film/captures/desktop-caption.png",
    title: "Vision & Caption Synthesis",
    description: "Oyinca watches the video, detects narrative beats, drafts contextual copy, and targets high-intent TikTok tags.",
  },
  {
    id: "approval",
    label: "03. Approval Queue",
    icon: CheckCircle2,
    imageSrc: "/hero-film/captures/desktop-caption.png",
    title: "Editorial Approval Control",
    description: "In Assisted mode, every drafted post waits safely in your queue for your one-click approval or quick word adjustments.",
  },
  {
    id: "calendar",
    label: "04. Publishing Calendar",
    icon: Calendar,
    imageSrc: "/hero-film/captures/desktop-schedule.png",
    title: "Continuous Scheduling Matrix",
    description: "Approved posts take their designated slots on your visual calendar, distributed evenly to maximize engagement.",
  },
  {
    id: "published",
    label: "05. Performance & Analytics",
    icon: BarChart3,
    imageSrc: "/hero-film/captures/desktop-performance.png",
    title: "Activity Logs & Brand Learning",
    description: "Track publishing throughput and watch Oyinca's memory refine itself with every post that goes live.",
  },
];

export default function ProductDemoSection() {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const currentStage = STAGES[activeStageIndex];

  return (
    <section className="oy-demo-section" aria-label="Oyinca Interactive Product Demo">
      <div className="oy-demo-head">
        <p className="oy-eyebrow">The Real Workspace</p>
        <h2>This is where the work happens.</h2>
        <p className="text-[15px] text-[var(--oy-ink-muted)]">
          No conceptual mockups. This is the exact workspace you use to orchestrate
          your brand presence from raw footage to scheduled execution.
        </p>
      </div>

      {/* Tabs */}
      <div className="oy-demo-tabs" role="tablist" aria-label="Demo Stages">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = idx === activeStageIndex;
          return (
            <button
              key={stage.id}
              role="tab"
              aria-selected={isActive}
              className={`oy-demo-tab-btn ${isActive ? "is-active" : ""}`}
              onClick={() => setActiveStageIndex(idx)}
            >
              <span className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                <span>{stage.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Browser Frame */}
      <div className="oy-browser-frame">
        <div className="oy-browser-bar">
          <div className="oy-browser-dots" aria-hidden="true">
            <div className="oy-browser-dot" />
            <div className="oy-browser-dot" />
            <div className="oy-browser-dot" />
          </div>
          <div className="oy-browser-url">app.oyinca.com/dashboard/{currentStage.id}</div>
          <div className="text-[11px] text-white/40 font-mono">OYINCA OS 2.0</div>
        </div>

        <div className="oy-browser-viewport">
          <Image
            src={currentStage.imageSrc}
            alt={currentStage.title}
            fill
            className="oy-browser-image"
            sizes="(max-width: 1400px) 100vw, 1400px"
            priority={activeStageIndex === 0}
          />
        </div>
      </div>

      {/* Stage detail callout */}
      <div className="oy-demo-caption-info">
        <div>
          <strong>{currentStage.title}:</strong>{" "}
          <span>{currentStage.description}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[var(--oy-blue-steel)]">
          <span>{activeStageIndex + 1} of {STAGES.length}</span>
        </div>
      </div>
    </section>
  );
}
