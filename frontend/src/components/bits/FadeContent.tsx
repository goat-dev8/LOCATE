'use client';

/**
 * FadeContent — reveals arbitrary children when they scroll into view with an
 * optional directional slide and blur. Adapted from the reactbits.dev
 * "Fade Content" component. GPU-friendly (transform / opacity / blur only).
 */

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

export interface FadeContentProps {
  /** Content to reveal. */
  children: React.ReactNode;
  /** Add a blur(6px) → blur(0px) pass to the entrance. */
  blur?: boolean;
  /** Direction the content slides in from. */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Base delay (seconds) before the reveal starts. */
  delay?: number;
  /** Slide distance in pixels. */
  distance?: number;
  /** Reveal duration in seconds. */
  duration?: number;
  /** Fraction of the element that must be visible before animating (0–1). */
  threshold?: number;
  /** Reveal only the first time the element enters the viewport. */
  once?: boolean;
  /** Class applied to the wrapper. */
  className?: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function FadeContent({
  children,
  blur = false,
  direction = 'up',
  delay = 0,
  distance = 24,
  duration = 0.6,
  threshold = 0.2,
  once = true,
  className,
}: FadeContentProps) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once, amount: Math.min(Math.max(threshold, 0), 1) });

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  const offset =
    direction === 'up'
      ? { y: distance }
      : direction === 'down'
        ? { y: -distance }
        : direction === 'left'
          ? { x: distance }
          : { x: -distance };

  const initial = { opacity: 0, ...offset, ...(blur ? { filter: 'blur(6px)' } : {}) };
  const animate = { opacity: 1, x: 0, y: 0, ...(blur ? { filter: 'blur(0px)' } : {}) };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={initial}
      animate={inView ? animate : initial}
      transition={{ duration, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
