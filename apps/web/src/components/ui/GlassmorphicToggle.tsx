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
  ariaLabel = "Toggle AutoPilot",
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
        width: "88px",
        height: "44px",
        padding: "4px",
        borderRadius: "9999px",
        // Outer Glass Capsule Casing matching input_file_0.png
        background: checked
          ? "rgba(0, 230, 118, 0.12)"
          : "rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: checked
          ? "1.5px solid rgba(0, 230, 118, 0.4)"
          : "1.5px solid rgba(255, 255, 255, 0.18)",
        boxShadow: checked
          ? "inset 0 1px 3px rgba(255, 255, 255, 0.4), 0 4px 20px rgba(0, 230, 118, 0.35)"
          : "inset 0 1px 2px rgba(255, 255, 255, 0.2), 0 2px 10px rgba(0, 0, 0, 0.2)",
      }}
    >
      {/* Inner Track Capsule */}
      <div
        className="w-full h-full rounded-full transition-all duration-300 flex items-center relative overflow-hidden"
        style={{
          background: checked
            ? "linear-gradient(90deg, #00E676 0%, #00C853 100%)"
            : "rgba(35, 38, 48, 0.8)",
          boxShadow: checked
            ? "inset 0 2px 4px rgba(255, 255, 255, 0.3), 0 0 12px rgba(0, 230, 118, 0.5)"
            : "inset 0 2px 5px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Active Neon Glow Bar */}
        {checked && (
          <div
            className="absolute inset-0 rounded-full opacity-80 animate-pulse"
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(0,230,118,0) 100%)",
            }}
          />
        )}
      </div>

      {/* 3D Glass Circular Lens Knob */}
      <div
        className="absolute top-[4px] rounded-full transition-transform duration-300 ease-out flex items-center justify-center pointer-events-none"
        style={{
          width: "36px",
          height: "36px",
          transform: checked ? "translateX(44px)" : "translateX(0px)",
          // 3D Convex Glass Lens Reflection
          background: "radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.95) 0%, rgba(240, 240, 240, 0.7) 50%, rgba(200, 200, 200, 0.4) 100%)",
          border: "1.5px solid rgba(255, 255, 255, 0.8)",
          boxShadow: checked
            ? "0 4px 12px rgba(0, 0, 0, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.8), inset 0 -2px 4px rgba(0, 0, 0, 0.15)"
            : "0 3px 8px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.7)",
        }}
      >
        {/* Inner Glass Specular Ring */}
        <div
          className="w-4 h-4 rounded-full"
          style={{
            background: checked ? "rgba(0, 200, 83, 0.2)" : "rgba(0, 0, 0, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
          }}
        />
      </div>
    </button>
  );
}
