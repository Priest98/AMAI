import type { CSSProperties, ReactNode } from 'react';

/** Shared operational content is visible at first paint; acquisition owns rich motion. */
export function Reveal({ children, className = '', style }: {
  children: ReactNode; delay?: number; y?: number; className?: string; style?: CSSProperties;
}) {
  return <div className={className} style={style}>{children}</div>;
}
