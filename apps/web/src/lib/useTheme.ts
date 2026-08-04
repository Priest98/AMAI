"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "marketing_os_theme";

/**
 * Single source of truth for light/dark theme, shared by every route --
 * dashboard, landing page, sign in, sign up. Reads/writes the same
 * localStorage key the dashboard has always used, and keeps <html> in
 * sync so both the CSS-variable theme (globals.css's :root,.light / .dark
 * blocks) and Tailwind's `dark:` utilities agree everywhere, not just
 * inside the dashboard shell. Flipping the theme on any one page persists
 * for all the others.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setIsDark(saved !== "light");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(isDark ? "dark" : "light");
  }, [isDark, mounted]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  return { isDark, toggleTheme, mounted };
}
