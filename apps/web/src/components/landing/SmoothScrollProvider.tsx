import type { ReactNode } from 'react';
/** Compatibility wrapper. AcquisitionMotion owns scrolling at the page level. */
export default function SmoothScrollProvider({ children }: { children: ReactNode }) { return <>{children}</>; }
