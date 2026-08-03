"use client";

import React from "react";

interface GlassmorphicToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
}

export default function GlassmorphicToggle({
  checked,
  onChange,
  ariaLabel = "Toggle AMAI Engine",
}: GlassmorphicToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center cursor-pointer select-none transition-all duration-300 focus:outline-none touch-target"
      style={{
        width: "60px",
        height: "32px",
        padding: "3px",
        borderRadius: "9999px",
        // Outer Glass Capsule Casing — steel-blue glow when active, neutral
        // grey glass when paused (same mechanics, new brand accent).
        background: checked
          ? "rgba(74, 127, 167, 0.18)"
          : "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: checked
          ? "1.5px solid rgba(74, 127, 167, 0.55)"
          : "1.5px solid rgba(255, 255, 255, 0.2)",
        boxShadow: checked
          ? "inset 0 1px 2px rgba(255, 255, 255, 0.4), 0 3px 14px rgba(74, 127, 167, 0.4)"
          : "inset 0 1px 2px rgba(255, 255, 255, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* Inner Track Fill */}
      <div
        className="w-full h-full rounded-full transition-all duration-300 relative overflow-hidden"
        style={{
          background: checked
            ? "linear-gradient(90deg, #0A1931 0%, #4A7FA7 100%)"
            : "rgba(100, 116, 139, 0.55)",
          boxShadow: checked
            ? "inset 0 1px 3px rgba(255, 255, 255, 0.4), 0 0 10px rgba(74, 127, 167, 0.5)"
            : "inset 0 2px 4px rgba(0, 0, 0, 0.35)",
        }}
      />

      {/* Glass Circular Thumb (Completely contained inside bounds) */}
      <div
        className="absolute top-[3px] left-[3px] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center pointer-events-none"
        style={{
          width: "24px",
          height: "24px",
          transform: checked ? "translateX(28px)" : "translateX(0px)",
          // Glass Lens 3D Reflection
          background: "radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.98) 0%, rgba(235, 235, 235, 0.75) 55%, rgba(190, 190, 190, 0.45) 100%)",
          border: "1.5px solid rgba(255, 255, 255, 0.85)",
          boxShadow: checked
            ? "0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.9)"
            : "0 2px 6px rgba(0, 0, 0, 0.35), inset 0 1px 3px rgba(255, 255, 255, 0.8)",
        }}
      >
        {/* Inner Glass Center Highlight */}
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: checked ? "rgba(74, 127, 167, 0.3)" : "rgba(0, 0, 0, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
          }}
        />
      </div>
    </button>
  );
}
