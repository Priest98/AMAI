"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2.5 gap-2",
  lg: "text-sm px-6 py-3.5 gap-2",
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "btn-primary-gradient",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "",
};

/**
 * Design System v2 primary button primitive. Every dashboard page still has
 * plenty of hand-rolled buttons with inline Tailwind classes -- this exists
 * so new/redesigned surfaces converge on one consistent shape, weight, and
 * motion instead of each page reinventing its own button styling.
 */
export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const dangerStyle =
    variant === "danger"
      ? { backgroundColor: "var(--accent-error-subtle)", color: "var(--accent-error)", border: "1px solid transparent" }
      : undefined;

  return (
    <button
      disabled={disabled || loading}
      className={`touch-target inline-flex items-center justify-center rounded-[var(--radius-md)] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      style={dangerStyle}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
}
