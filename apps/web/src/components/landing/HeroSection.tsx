"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Play, Upload, ScanLine, MessageSquareText, CalendarCheck, Check } from "lucide-react";

const WORKFLOW = [
  { label: "Content received", detail: "campaign-film.mp4", icon: Upload, state: "done" },
  { label: "Understood", detail: "Product story · warm, direct tone", icon: ScanLine, state: "done" },
  { label: "Post prepared", detail: "Caption and hashtags ready", icon: MessageSquareText, state: "active" },
  { label: "Awaiting you", detail: "Review before scheduling", icon: CalendarCheck, state: "next" },
] as const;

export default function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <section
      id="product"
      ref={heroRef}
      className="oy-hero-section"
      aria-label="Oyinca Overview"
    >
      <div className="oy-hero-grid">
        <div className="oy-hero-copy">
          <p className="oy-eyebrow">Meet your social media manager</p>
          <h1 className="oy-hero-headline">
            Your social media,
            <em>handled.</em>
          </h1>
          <p className="oy-hero-sub">
            Oyinca understands your content, prepares your posts and keeps your
            TikTok moving — while you focus on creating.
          </p>
          <div className="oy-hero-actions">
            <Link href="/register?plan=FREE" className="oy-btn-primary">
              <span>Get started</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className="oy-btn-secondary">
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>See how it works</span>
            </a>
          </div>
          <div className="oy-hero-trust">
            <span aria-hidden="true" />
            No credit card required. Review every post before it goes live.
          </div>
        </div>

        <div className="oy-hero-visual" aria-label="A post moving through Oyinca from upload to approval">
          <div className="oy-workflow-window">
            <div className="oy-workflow-topbar">
              <div>
                <span className="oy-workflow-kicker">Current workflow</span>
                <strong>One upload. A ready post.</strong>
              </div>
              <span className="oy-live-status"><i />Oyinca working</span>
            </div>

            <div className="oy-workflow-preview">
              <div className="oy-preview-media">
                <div className="oy-preview-play"><Play className="h-4 w-4 fill-current" /></div>
                <span>00:18</span>
              </div>
              <div className="oy-preview-copy">
                <span>TikTok draft</span>
                <p>Built for the moments that move your audience.</p>
                <div>#brandstory&nbsp;&nbsp;#behindthescenes</div>
              </div>
            </div>

            <ol className="oy-workflow-list">
              {WORKFLOW.map(({ label, detail, icon: Icon, state }) => (
                <li key={label} data-state={state}>
                  <span className="oy-workflow-icon">
                    {state === "done" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span><strong>{label}</strong><small>{detail}</small></span>
                  {state === "active" && <span className="oy-processing-bars" aria-label="Processing"><i /><i /><i /></span>}
                </li>
              ))}
            </ol>

            <div className="oy-workflow-footer">
              <span>Proposed time</span>
              <strong>Today · 6:15 PM</strong>
              <span className="oy-review-chip">Ready to review</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
