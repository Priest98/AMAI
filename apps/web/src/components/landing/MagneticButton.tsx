"use client";

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

/**
 * Wraps a link/button and nudges it a few pixels toward the cursor while
 * hovered ("magnetic" hover), snapping back with a spring on mouse-leave.
 * Pure CSS transforms via framer-motion's spring-backed motion values, so
 * it's cheap (no re-render per mouse-move) and automatically inert when the
 * user has prefers-reduced-motion set.
 */
export default function MagneticButton({
  children,
  className = '',
  strength = 0.35,
  as: Component = motion.div,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  /** 0-1, how strongly the element follows the cursor. */
  strength?: number;
  as?: any;
  [key: string]: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * strength);
    y.set(relY * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <Component
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY, display: 'inline-block' }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}
