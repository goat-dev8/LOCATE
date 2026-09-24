'use client';

/**
 * SplitText — splits text into words or characters and reveals them with a
 * staggered rise / slide / blur / rotate animation when scrolled into view.
 * Adapted from the reactbits.dev "Split Text" component for LOCATE's warm
 * light theme. Fully GPU-friendly (transform + opacity + filter only).
 */

import { useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

export type SplitTextAnimationStyle = 'up' | 'down' | 'left' | 'right' | 'blur' | 'rotate';
export type SplitTextBy = 'word' | 'char';
export type SplitTextTag = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';

export interface SplitTextProps {
  /** Text to split and animate. */
  text: string;
  /** Class applied to the rendered wrapper element. */
  className?: string;
  /** Base delay (seconds) before the first unit starts animating. */
  delay?: number;
  /** Entrance style applied to each word/character. */
  animationStyle?: SplitTextAnimationStyle;
  /** Split by whole words or individual characters. */
  by?: SplitTextBy;
  /** Fraction of the element that must be visible before animating (0–1). */
  threshold?: number;
  /** Seconds between each unit's animation start. */
  stagger?: number;
  /** Wrapper element type. */
  as?: SplitTextTag;
  /** Animate only the first time the element enters the viewport. */
  once?: boolean;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
};

interface UnitAnimation {
  initial: { opacity: number; x?: number; y?: number; rotate?: number; filter?: string };
  animate: { opacity: number; x?: number; y?: number; rotate?: number; filter?: string };
  duration: number;
  origin?: string;
}

function getUnitAnimation(style: SplitTextAnimationStyle): UnitAnimation {
  switch (style) {
    case 'down':
      return { initial: { opacity: 0, y: -28 }, animate: { opacity: 1, y: 0 }, duration: 0.6 };
    case 'left':
      return { initial: { opacity: 0, x: 28 }, animate: { opacity: 1, x: 0 }, duration: 0.6 };
    case 'right':
      return { initial: { opacity: 0, x: -28 }, animate: { opacity: 1, x: 0 }, duration: 0.6 };
    case 'blur':
      return {
        initial: { opacity: 0, y: 10, filter: 'blur(8px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        duration: 0.8,
      };
    case 'rotate':
      return {
        initial: { opacity: 0, y: 14, rotate: -8 },
        animate: { opacity: 1, y: 0, rotate: 0 },
        duration: 0.7,
        origin: '0% 100%',
      };
    case 'up':
    default:
      return { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, duration: 0.6 };
  }
}

export function SplitText({
  text,
  className,
  delay = 0,
  animationStyle = 'up',
  by = 'word',
  threshold = 0.3,
  stagger = 0.03,
  as = 'div',
  once = true,
}: SplitTextProps) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once, amount: Math.min(Math.max(threshold, 0), 1) });
  const unitAnim = useMemo(() => getUnitAnimation(animationStyle), [animationStyle]);
  const words = useMemo(() => text.split(' '), [text]);

  const Tag: SplitTextTag = as;

  if (reduced) {
    return <Tag className={className}>{text}</Tag>;
  }

  const rendered: ReactNode[] = [];
  let unitIndex = 0;
  words.forEach((word, wordIndex) => {
    // Preserve word gaps as real, rendered spaces.
    if (wordIndex > 0) {
      rendered.push(<span key={`gap-${wordIndex}`}>{' '}</span>);
    }
    const units = by === 'word' ? [word] : word.split('');
    units.forEach((content, charIndex) => {
      if (content === '') return;
      const index = unitIndex;
      rendered.push(
        <motion.span
          key={`w${wordIndex}-c${charIndex}`}
          className="inline-block"
          style={unitAnim.origin ? { transformOrigin: unitAnim.origin } : undefined}
          initial={unitAnim.initial}
          animate={inView ? unitAnim.animate : unitAnim.initial}
          transition={{ duration: unitAnim.duration, ease: EASE, delay: delay + index * stagger }}
        >
          {content}
        </motion.span>
      );
      unitIndex += 1;
    });
  });

  return (
    <Tag className={className}>
      <span style={SR_ONLY}>{text}</span>
      <span ref={ref} aria-hidden="true">
        {rendered}
      </span>
    </Tag>
  );
}
