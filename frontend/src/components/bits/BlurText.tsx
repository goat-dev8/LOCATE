'use client';

/**
 * BlurText — reveals text word-by-word (or letter-by-letter) with a blur-to-
 * sharp rise, adapted from the reactbits.dev "Blur Text" component. Designed
 * for LOCATE's warm light theme; GPU-friendly (opacity + blur + y only).
 */

import { useRef, type CSSProperties, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

export interface BlurTextProps {
  /** Text to reveal. */
  text: string;
  /** Class applied to the rendered wrapper element. */
  className?: string;
  /** Base delay (seconds) before the first word starts. */
  delay?: number;
  /** Fraction of the element that must be visible before animating (0–1). */
  threshold?: number;
  /** Reveal by whole words or individual letters. */
  by?: 'word' | 'letter';
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

const HIDDEN = { opacity: 0, y: 12, filter: 'blur(8px)' };
const SHOWN = { opacity: 1, y: 0, filter: 'blur(0px)' };

export function BlurText({
  text,
  className,
  delay = 0,
  threshold = 0.1,
  by = 'word',
  once = true,
}: BlurTextProps) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once, amount: Math.min(Math.max(threshold, 0), 1) });

  if (reduced) {
    return <span className={className}>{text}</span>;
  }

  const rendered: ReactNode[] = [];
  let unitIndex = 0;
  text.split(' ').forEach((word, wordIndex) => {
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
          initial={HIDDEN}
          animate={inView ? SHOWN : HIDDEN}
          transition={{ duration: 0.5, ease: EASE, delay: delay + index * 0.08 }}
        >
          {content}
        </motion.span>
      );
      unitIndex += 1;
    });
  });

  return (
    <span className={className}>
      <span style={SR_ONLY}>{text}</span>
      <span ref={ref} aria-hidden="true">
        {rendered}
      </span>
    </span>
  );
}
