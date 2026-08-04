"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/useTheme";

interface ThemeToggleProps {
  className?: string;
}

/**
 * Circular glass theme switch -- same Sun/Moon treatment the dashboard has
 * always had, now shared so it can drop into the landing page, sign in,
 * and sign up too and stay in sync via useTheme's shared localStorage key.
 */
export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { isDark, toggleTheme, mounted } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn-icon-glass h-8 w-8 flex items-center justify-center touch-target shrink-0 ${className}`}
      style={{ color: "var(--text-primary)", visibility: mounted ? "visible" : "hidden" }}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5" style={{ color: "var(--accent-warning)" }} />
      ) : (
        <Moon className="h-3.5 w-3.5" style={{ color: "var(--accent-secondary)" }} />
      )}
    </button>
  );
}
