"use client";
import { useState } from "react";
import Hero, { type HeroStyle } from "./Hero";
import ThemeToggle from "@/components/ui/ThemeToggle";
const options = [
  {
    id: "editorial",
    name: "01 / Editorial",
    description:
      "Portrait and clear copy. A personal introduction to your AI teammate.",
  },
  {
    id: "product",
    name: "02 / Product",
    description:
      "A hands-on workflow preview. Show what Oyinca does before asking for signup.",
  },
  {
    id: "cinematic",
    name: "03 / Cinematic",
    description:
      "An immersive portrait with optional video. Strong character, minimal interface.",
  },
] as const;
export default function HeroLab() {
  const [variant, setVariant] = useState<HeroStyle>("cinematic");
  return (
    <>
      <div className="oy-lab-bar">
        <a href="/">← Landing page</a>
        <strong>Hero directions</strong>
        <ThemeToggle />
        <div>
          {options.map((o) => (
            <button
              key={o.id}
              aria-pressed={variant === o.id}
              onClick={() => setVariant(o.id)}
            >
              {o.name}
            </button>
          ))}
        </div>
        <p>{options.find((o) => o.id === variant)?.description}</p>
      </div>
      <Hero key={variant} variant={variant} />
      <div id="how-it-works" className="oy-lab-note">
        Design preview. The interactive product example does not create or
        publish content.{" "}
        <a href="/#how-it-works">Explore the full workflow →</a>
      </div>
    </>
  );
}
