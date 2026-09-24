'use client';

/**
 * DecryptionText — text scrambles through random glyphs before settling into
 * its final characters, locking left-to-right (sequential) or at random.
 * Adapted from the reactbits.dev "Decryption Text" component. Hydration-safe:
 * the server render equals the final text; the scramble only starts inside
 * effects (all randomness is client-side only).
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';

export interface DecryptionTextProps {
  /** Text to scramble and reveal. */
  text: string;
  /** Class applied to the wrapper span. */
  className?: string;
  /** Milliseconds per scramble frame. */
  speed?: number;
  /** Reveal characters left-to-right (true) or in random order (false). */
  sequential?: boolean;
  /** Milliseconds to wait before the first character locks. */
  revealDelay?: number;
  /** Glyph pool used while scrambling. */
  characters?: string;
  /** Run the scramble on mount or on hover. */
  animateOn?: 'mount' | 'hover';
  /** Class applied to each settled character (e.g. a decode highlight). */
  setClassName?: string;
}

const DEFAULT_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

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

interface CharState {
  ch: string;
  settled: boolean;
}

function toSettled(text: string): CharState[] {
  return text.split('').map((ch) => ({ ch, settled: true }));
}

export function DecryptionText({
  text,
  className,
  speed = 50,
  sequential = true,
  revealDelay = 0,
  characters = DEFAULT_CHARACTERS,
  animateOn = 'mount',
  setClassName,
}: DecryptionTextProps) {
  const reduced = useReducedMotion() ?? false;
  const [chars, setChars] = useState<CharState[]>(() => toSettled(text));

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef(0);
  const lockAtRef = useRef<number[]>([]);

  const stopScramble = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    const t = tickRef.current;
    const lockAt = lockAtRef.current;
    let done = true;
    const next: CharState[] = text.split('').map((ch, i) => {
      if (ch === ' ') return { ch, settled: true };
      const lock = lockAt[i] ?? 0;
      if (t >= lock) return { ch, settled: true };
      done = false;
      return {
        ch: characters[(t + i) % characters.length],
        settled: false,
      };
    });
    if (done) {
      setChars(toSettled(text));
      stopScramble();
      return;
    }
    setChars(next);
    tickRef.current = t + 1;
  }, [text, characters, stopScramble]);

  const startScramble = useCallback(() => {
    if (reduced || intervalRef.current !== null) return;
    const baseTicks = Math.round(revealDelay / Math.max(speed, 1));
    lockAtRef.current = text.split('').map((_, i) =>
      sequential
        ? baseTicks + i
        : baseTicks + ((i * 3) % (text.length + 8))
    );
    tickRef.current = 0;
    advance();
    intervalRef.current = setInterval(advance, speed);
  }, [reduced, revealDelay, speed, sequential, text, advance]);

  // Reset whenever the text itself changes.
  useEffect(() => {
    setChars(toSettled(text));
  }, [text]);

  useEffect(() => {
    if (animateOn !== 'mount') return;
    startScramble();
    return stopScramble;
  }, [animateOn, startScramble, stopScramble]);

  // Safety net: never leave an interval running after unmount.
  useEffect(() => stopScramble, [stopScramble]);

  if (reduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      className={className}
      onMouseEnter={animateOn === 'hover' ? startScramble : undefined}
    >
      <span style={SR_ONLY}>{text}</span>
      <span aria-hidden="true">
        {chars.map((char, i) => (
          <span key={i} className={char.settled ? setClassName : undefined}>
            {char.ch}
          </span>
        ))}
      </span>
    </span>
  );
}
