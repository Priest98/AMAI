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
      <rect width="40" height="40" rx="12" fill="url(#monogramGrad)" />
      <defs>
        <linearGradient id="monogramGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0A1931" />
          <stop offset="100%" stopColor="#4A7FA7" />
        </linearGradient>
      </defs>
      {/* Stylized Typographic 'A' Monogram */}
      <path
        d="M20 9L29 29H24.5L22.5 24.5H17.5L15.5 29H11L20 9ZM20 14.8L18.7 18.5H21.3L20 14.8Z"
        fill="#F6FAFD"
        className="font-black tracking-tighter"
      />
      <circle cx="20" cy="20" r="1.5" fill="rgba(246, 250, 253, 0.4)" />
    </svg>
  );
}

export function Logo({ className = "", variant = "full", size = "md", ...props }: LogoProps) {
  if (variant === "monogram") {
    return <Monogram className={className || "h-8 w-8"} {...props} />;
  }

  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`} {...props}>
      <Monogram className="h-8 w-8 flex-shrink-0" />
      <div className="flex items-center space-x-1.5">
        <span className="font-extrabold tracking-[0.2em] uppercase font-sans text-xl" style={{ color: 'var(--text-primary)' }}>
          AMAI
        </span>
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: 'var(--accent-secondary)', boxShadow: '0 0 6px var(--accent-secondary)' }}
        />
      </div>
    </div>
  );
}
