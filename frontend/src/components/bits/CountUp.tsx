'use client';

/**
 * CountUp — animated number counter that eases from `from` to `to` once it
 * enters the viewport. Adapted from the reactbits.dev "Count Up" component.
 * Hydration-safe: the first paint always shows the `from` value and the
 * animation is driven client-side via framer-motion's `animate()`.
 */

import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion';

export interface CountUpProps {
  /** Starting value of the counter. */
  from?: number;
  /** Final value of the counter. */
  to: number;
  /** Animation duration in seconds. */
  duration?: number;
  /** Delay before the count starts (seconds). */
  delay?: number;
  /** String prepended to the number, e.g. "$". */
  prefix?: string;
  /** String appended to the number, e.g. "%". */
  suffix?: string;
  /** Number of decimal places to render. */
  decimals?: number;
  /** Thousands separator, e.g. "," or "." or "" (none). */
  separator?: string;
  /** Class applied to the rendered span. */
  className?: string;
  /** Only start counting when this is true (in addition to being in view). */
  startWhen?: boolean;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function formatValue(value: number, decimals: number, separator: string): string {
  const fixed = value.toFixed(decimals);
  if (!separator) return fixed;
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return decPart !== undefined ? `${grouped}.${decPart}` : grouped;
}

export function CountUp({
  from = 0,
  to,
  duration = 2,
  delay = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  separator = ',',
  className,
  startWhen = true,
}: CountUpProps) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (reduced || !inView || !startWhen) return;

    const controls: AnimationPlaybackControls = animate(from, to, {
      duration,
      delay,
      ease: EASE,
      onUpdate: (latest: number) => setValue(latest),
    });
    return () => controls.stop();
  }, [reduced, inView, startWhen, from, to, duration, delay]);

  // With reduced motion we simply land on the final value — no state, no
  // cascading renders; the flag flips once after hydration via matchMedia.
  const displayed = reduced ? to : value;

  return (
    <span
      ref={ref}
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      aria-label={`${prefix}${formatValue(to, decimals, separator)}${suffix}`}
    >
      {prefix}
      {formatValue(displayed, decimals, separator)}
      {suffix}
    </span>
  );
}
