import type React from "react";

interface LogoProps extends React.ComponentProps<"div"> {
  variant?: "full" | "monogram";
  size?: "sm" | "md" | "lg";
}

export function Monogram({ className = "h-8 w-8", ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Agent Orbit mark (Oyinca): an open ring -- the O, the foundation --
          with a single orbiting node sitting in its gap. No gradient, so it
          stays recognizable in monochrome/print; the gap is deliberate, not
          a rendering artifact -- it's where the node "enters" the ring,
          reading as continuous motion rather than a static closed shape,
          and it echoes the open counter of the O in the OYINCA wordmark.
          Replaces the previous plain ring-only placeholder from the initial
          Oyinca rebrand. */}
      <rect width="40" height="40" rx="12" fill="#1B1330" />
      <circle
        cx="20"
        cy="20"
        r="11.2"
        fill="none"
        stroke="#6C4CF1"
        strokeWidth="4"
        strokeDasharray="63 7"
        strokeLinecap="round"
      />
      <circle cx="30.6" cy="16.6" r="3.2" fill="#2FE6D8" />
    </svg>
  );
}

export function Logo({ className = "", variant = "full", size = "md", ...props }: LogoProps) {
  if (variant === "monogram") {
    // LogoProps extends ComponentProps<"div">, so `props` carries
    // div-typed event handlers (onCopy, etc.) that are not assignable to
    // an <svg>'s SVG-typed equivalents -- spreading them here was a real
    // type error (TS2322), not a cosmetic one. Every call site passes only
    // className, so the monogram variant forwards just that rather than
    // casting div handlers onto an element that cannot receive them.
    return <Monogram className={className || "h-8 w-8"} />;
  }

  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`} {...props}>
      <Monogram className="h-8 w-8 flex-shrink-0" />
      {/* No trailing dot here -- the orbit node already lives inside the
          Monogram tile itself, so a second loose dot next to the wordmark
          would just be visual noise duplicating the same idea. */}
      <span className="font-extrabold tracking-[0.2em] uppercase font-sans text-xl" style={{ color: 'var(--text-primary)' }}>
        Oyinca
      </span>
    </div>
  );
}
