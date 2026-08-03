import React from "react";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Design System v2 loading primitive -- shimmering placeholder block. */
export function Skeleton({ className = "", style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} />;
}

/** A row of skeleton cards, sized like the app's standard grid tiles. */
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full" />
      ))}
    </div>
  );
}

/** A stack of skeleton list rows, sized like the app's standard list items. */
export function SkeletonListRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
