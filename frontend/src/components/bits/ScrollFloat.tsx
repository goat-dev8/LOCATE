'use client';

/**
 * ScrollFloat — parallax float for text: content enters, holds, and exits
 * with translate/scale/opacity tied to scroll progress. Adapted from the
 * reactbits.dev "Scroll Float" component. Progress is smoothed with a light
 * spring; static content renders when reduced motion is preferred.
 */

import { useRef, type ReactNode, type RefObject } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';

export interface ScrollFloatAnimation {
  opacity?: number;
  translateY?: number;
  scale?: number;
}

export interface ScrollFloatProps {
  /** Content (usually a string) to float. */
  children: ReactNode;
  /** Ref of a scrollable ancestor element; defaults to the viewport. */
  scrollContainerRef?: RefObject<HTMLElement | null>;
  /** Class applied to the outer (measured) container. */
  containerClassName?: string;
  /** Class applied to the inner (animated) element. */
  textClassName?: string;
  /** Scroll-progress window over which the entrance runs, e.g. [0.1, 0.5].
   * The exit is mirrored at the end of the scroll range. */
  range?: [number, number];
  /** Starting values for the entrance (interpolated to identity). */
  enterAnimation?: ScrollFloatAnimation;
  /** Ending values for the exit (interpolated from identity). */
  exitAnimation?: ScrollFloatAnimation;
}

const SPRING = { stiffness: 100, damping: 25, restDelta: 0.001 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function ScrollFloat({
  children,
  scrollContainerRef,
  containerClassName,
  textClassName,
  range = [0.1, 0.5],
  enterAnimation,
  exitAnimation,
}: ScrollFloatProps) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement | null>(null);

  const enter: Required<ScrollFloatAnimation> = {
    opacity: 0,
    translateY: 80,
    scale: 1,
    ...enterAnimation,
  };
  const exit: Required<ScrollFloatAnimation> = {
    opacity: 0,
    translateY: -80,
    scale: 1,
    ...exitAnimation,
  };

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
    container: scrollContainerRef ?? undefined,
  });
  const smoothProgress = useSpring(scrollYProgress, SPRING);

  // Sanitize the enter window; the exit window is mirrored around the end.
  const start = clamp(range[0], 0, 0.9);
  const end = clamp(range[1], start + 0.05, 0.95);
  const exitStart = Math.max(1 - end, end + 0.0001);
  const exitEnd = Math.max(1 - start, exitStart + 0.0001);
  const input = [start, end, exitStart, exitEnd];

  const opacity = useTransform(smoothProgress, input, [enter.opacity, 1, 1, exit.opacity], {
    clamp: true,
  });
  const y = useTransform(smoothProgress, input, [enter.translateY, 0, 0, exit.translateY], {
    clamp: true,
  });
  const scale = useTransform(smoothProgress, input, [enter.scale, 1, 1, exit.scale], {
    clamp: true,
  });

  if (reduced) {
    return (
      <div className={containerClassName}>
        <div className={textClassName}>{children}</div>
      </div>
    );
  }

  return (
    <div ref={ref} className={containerClassName}>
      <motion.div className={textClassName} style={{ opacity, y, scale }}>
        {children}
      </motion.div>
    </div>
  );
}
