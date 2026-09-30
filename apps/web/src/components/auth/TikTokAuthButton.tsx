"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface TikTokAuthButtonProps {
  label?: string;
  className?: string;
}

export function OfficialTikTokIcon({ className = "w-6 h-6", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 448 512"
      width={size}
      height={size}
      className={`flex-shrink-0 ${className}`}
      fill="none"
      aria-hidden="true"
    >
      {/* Official TikTok Cyan Chromatic Offset */}
      <path
        d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V258.2a93.61 93.61 0 1 0 58.71 87.23V0h68.52a141.7 141.7 0 0 0 13.62 47.78 139.81 139.81 0 0 0 58.26 57.21 141.08 141.08 0 0 0 63.89 19.34z"
        fill="#25F4EE"
        transform="translate(-8, -5)"
        opacity="0.9"
      />
      {/* Official TikTok Red/Rose Chromatic Offset */}
      <path
        d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V258.2a93.61 93.61 0 1 0 58.71 87.23V0h68.52a141.7 141.7 0 0 0 13.62 47.78 139.81 139.81 0 0 0 58.26 57.21 141.08 141.08 0 0 0 63.89 19.34z"
        fill="#FE2C55"
        transform="translate(8, 5)"
        opacity="0.9"
      />
      {/* Official TikTok White Primary Glyph */}
      <path
        d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V258.2a93.61 93.61 0 1 0 58.71 87.23V0h68.52a141.7 141.7 0 0 0 13.62 47.78 139.81 139.81 0 0 0 58.26 57.21 141.08 141.08 0 0 0 63.89 19.34z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export default function TikTokAuthButton({
  label = "Continue with TikTok",
  className = "",
}: TikTokAuthButtonProps) {
  return (
    <a
      href={`${API_BASE}/oauth/tiktok/login`}
      className={`oy-tiktok-auth-btn flex min-h-[50px] w-full items-center justify-between gap-3 rounded-xl bg-black px-5 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#111113] hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${className}`}
      aria-label={label}
    >
      <div className="flex items-center gap-3">
        <OfficialTikTokIcon size={24} className="w-[24px] h-[24px]" />
        <span className="text-[14.5px] tracking-tight">{label}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-white/80 transition-transform duration-200 group-hover:translate-x-0.5" />
    </a>
  );
}
