import type { ReactNode, CSSProperties } from "react";
// Keep content visible in server HTML and avoid delayed animation layout shifts.
export default function GsapReveal({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  y?: number;
  duration?: number;
  start?: string;
}) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
