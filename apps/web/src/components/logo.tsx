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
      <rect width="40" height="40" rx="12" className="fill-slate-950 dark:fill-white transition-colors" />
      {/* Stylized Typographic 'A' Monogram */}
      <path
        d="M20 9L29 29H24.5L22.5 24.5H17.5L15.5 29H11L20 9ZM20 14.8L18.7 18.5H21.3L20 14.8Z"
        className="fill-white dark:fill-slate-950 font-black tracking-tighter"
      />
      <circle cx="20" cy="20" r="1.5" className="fill-rose-500" />
    </svg>
  );
}

export function Logo({ className = "", variant = "full", size = "md", ...props }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 text-sm",
    md: "h-8 text-lg",
    lg: "h-10 text-2xl",
  };

  if (variant === "monogram") {
    return <Monogram className={className || "h-8 w-8"} {...props} />;
  }

  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`} {...props}>
      <Monogram className="h-8 w-8 flex-shrink-0" />
      <div className="flex items-center space-x-1.5">
        <span className="font-extrabold tracking-[0.2em] text-slate-900 dark:text-white uppercase font-sans text-xl">
          AMAI
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0" />
      </div>
    </div>
  );
}
