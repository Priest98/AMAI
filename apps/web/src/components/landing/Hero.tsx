"use client";
import Link from "next/link";
import { useState } from "react";
import WorkflowPreview from "./WorkflowPreview";
import SculpturalHero from "./SculpturalHero";
export type HeroStyle = "editorial" | "product" | "cinematic" | "sculptural";
export default function Hero({
  variant = "sculptural",
}: {
  variant?: HeroStyle;
}) {
  const [playing, setPlaying] = useState(false);
  if (variant === "sculptural") return <SculpturalHero />;
  return (
    <section
      id="product"
      className={"oy-hero oy-hero--" + variant}
      aria-label="Meet Oyinca"
    >
      {variant === "cinematic" && (
        <div className="oy-cinema">
          <img
            src="/hero/oyinca-poster.jpg"
            alt=""
            width="720"
            height="1280"
            fetchPriority="high"
          />
          {playing && (
            <video
              src="/hero/oyinca-loop.mp4"
              autoPlay
              muted
              loop
              playsInline
              onError={() => setPlaying(false)}
            />
          )}
          <div />
        </div>
      )}
      <div className="oy-hero-grid">
        <div className="oy-hero-copy">
          <p className="oy-eyebrow">
            YOUR AI SOCIAL MEDIA MANAGER · TIKTOK FIRST
          </p>
          <h1>
            Your content.
            <br />
            Her next move.
          </h1>
          <p className="oy-hero-intro">
            Meet Oyinca. Turn your photos and videos into TikTok posts, with AI
            captions, scheduling and a review step that keeps you in control.
          </p>
          <div className="oy-actions">
            <Link className="lp-btn-primary oy-button" href="/register">
              Start free with Oyinca <span aria-hidden="true">↗</span>
            </Link>
            <a className="oy-text-link" href="#how-it-works">
              See how it works ↓
            </a>
          </div>
          <p className="oy-hero-note">
            No credit card. Review before publishing on Free.
          </p>
        </div>
        {variant === "editorial" && (
          <figure className="oy-portrait">
            <img
              src="/hero/oyinca-poster.jpg"
              alt="Oyinca, your virtual AI social media manager"
              width="720"
              height="1280"
              fetchPriority="high"
            />
            <figcaption>
              <span>MEET YOUR NEW TEAMMATE</span>
              <strong>Oyinca</strong>
              <p>AI-powered. Directed by you.</p>
            </figcaption>
          </figure>
        )}
        {variant === "product" && <WorkflowPreview headingAs="h2" />}
      </div>
      {variant === "cinematic" && (
        <button
          className="oy-video-control"
          onClick={() => setPlaying(!playing)}
          aria-pressed={playing}
        >
          {playing ? "Pause background video" : "Play background video"}
        </button>
      )}
    </section>
  );
}
