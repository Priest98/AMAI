"use client";

import React from "react";

interface GlassmorphicToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
}

/** A compact, theme-aware switch. The public API stays stable for callers. */
export default function GlassmorphicToggle({
  checked,
  onChange,
  ariaLabel = "Toggle Oyinca",
}: GlassmorphicToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center cursor-pointer select-none transition-colors duration-200 focus:outline-none touch-target"
      style={{
        width: "48px",
        height: "28px",
        padding: "2px",
        borderRadius: "9999px",
        backgroundColor: checked ? "var(--action-secondary)" : "var(--surface-recessed)",
        border: "1px solid var(--border-interactive)",
      }}
    >
      <span
        aria-hidden="true"
        className="absolute top-[2px] left-[2px] rounded-full transition-transform duration-200 pointer-events-none"
        style={{
          width: "22px",
          height: "22px",
          transform: checked ? "translateX(20px)" : "translateX(0px)",
          backgroundColor: "var(--surface-raised)",
          boxShadow: "var(--elevation-1)",
        }}
      />
    </button>
  );
}
