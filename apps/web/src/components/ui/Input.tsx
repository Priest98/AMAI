"use client";

import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: React.ReactNode;
}

/**
 * Design System v2 input primitive -- consistent sunken-surface field with
 * a visible focus ring using the brand accent, matching .input-field in
 * globals.css. Label/hint/error are optional so this can drop into forms
 * that only want the field itself.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leadingIcon, className = "", id, ...rest },
  ref
) {
  const inputId = id || rest.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-overline block">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="absolute left-3.5 flex items-center pointer-events-none" style={{ color: "var(--text-muted)" }}>
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input-field w-full text-body py-3 ${leadingIcon ? "pl-10 pr-3.5" : "px-3.5"} ${error ? "!border-[var(--accent-error)]" : ""} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs font-medium" style={{ color: "var(--accent-error)" }}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-caption">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
