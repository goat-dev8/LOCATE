'use client';

/**
 * Magnet — children are gently pulled toward the cursor while it hovers
 * within `padding` px of the wrapper bounds, and spring back on leave.
 * Adapted from the reactbits.dev "Magnet" component. Automatically disabled
 * on coarse-pointer (touch) devices and when reduced motion is preferred.
 */

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

export interface MagnetProps {
  /** Content that gets magnetized. */
  children: React.ReactNode;
  /** Distance in px beyond the wrapper bounds in which the magnet is active. */
  padding?: number;
  /** Disable the magnet effect entirely. */
  disabled?: boolean;
  /** Fraction of the cursor offset applied as translation (0–1). */
  magnetStrength?: number;
  /** Class applied to the outer wrapper div. */
  wrapperClassName?: string;
  /** Class applied to the inner (translated) div. */
  innerClassName?: string;
}

const SPRING = { stiffness: 150, damping: 15, mass: 0.1 };

export function Magnet({
  children,
  padding = 50,
  disabled = false,
  magnetStrength = 0.3,
  wrapperClassName,
  innerClassName,
}: MagnetProps) {
  const reduced = useReducedMotion() ?? false;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    if (disabled || reduced || window.matchMedia('(pointer: coarse)').matches) {
      x.set(0);
      y.set(0);
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const withinX = Math.abs(dx) <= rect.width / 2 + padding;
      const withinY = Math.abs(dy) <= rect.height / 2 + padding;
      if (withinX && withinY) {
        x.set(dx * magnetStrength);
        y.set(dy * magnetStrength);
      } else {
        x.set(0);
        y.set(0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [disabled, reduced, padding, magnetStrength, x, y]);

  return (
    <div ref={wrapperRef} className={wrapperClassName}>
      <motion.div className={innerClassName} style={{ x: springX, y: springY }}>
        {children}
      </motion.div>
    </div>
  );
}
