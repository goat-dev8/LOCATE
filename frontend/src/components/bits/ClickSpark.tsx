'use client';

/**
 * ClickSpark — wraps any element and, on click, bursts a ring of small line
 * particles outward from the click point. Adapted from the reactbits.dev
 * "Click Spark" component. Particles are tiny rotated spans animated with
 * transform + opacity only; they remove themselves when finished.
 */

import { useCallback, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface ClickSparkProps {
  /** The interactive element to wrap. Clicks anywhere inside spawn sparks. */
  children: React.ReactNode;
  /** Color of the spark lines (CSS color). */
  sparkColor?: string;
  /** Length of each spark line in px. */
  sparkSize?: number;
  /** Number of sparks per burst. */
  sparkCount?: number;
  /** Seconds each spark lives. */
  sparkDuration?: number;
  /** Class applied to the wrapper span. */
  className?: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
}

interface SparkParticleProps {
  spark: Spark;
  color: string;
  size: number;
  duration: number;
  onDone: (id: number) => void;
}

function SparkParticle({ spark, color, size, duration, onDone }: SparkParticleProps) {
  const radians = (spark.angle * Math.PI) / 180;
  const travel = size * 2.6;
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute z-10"
      style={{
        left: spark.x,
        top: spark.y,
        width: size,
        height: 2,
        marginLeft: -size / 2,
        marginTop: -1,
        backgroundColor: color,
        borderRadius: 1,
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: spark.angle }}
      animate={{
        x: Math.cos(radians) * travel,
        y: Math.sin(radians) * travel,
        opacity: 0,
        scale: 0.3,
        rotate: spark.angle,
      }}
      transition={{ duration, ease: EASE }}
      onAnimationComplete={() => onDone(spark.id)}
    />
  );
}

export function ClickSpark({
  children,
  sparkColor = '#FFFFFF',
  sparkSize = 10,
  sparkCount = 8,
  sparkDuration = 0.5,
  className,
}: ClickSparkProps) {
  const reduced = useReducedMotion() ?? false;
  const [sparks, setSparks] = useState<Spark[]>([]);
  const idRef = useRef(0);

  const removeSpark = useCallback((id: number) => {
    setSparks((prev) => prev.filter((spark) => spark.id !== id));
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLSpanElement>) => {
      if (reduced) return;
      const rect = event.currentTarget.getBoundingClientRect();
      // Keyboard-triggered clicks (detail === 0) burst from the center.
      const x =
        event.detail === 0 ? rect.width / 2 : event.clientX - rect.left;
      const y =
        event.detail === 0 ? rect.height / 2 : event.clientY - rect.top;

      const base = (idRef.current * 47) % 360;
      const burst: Spark[] = Array.from({ length: sparkCount }, (_, i) => ({
        id: idRef.current++,
        x,
        y,
        angle: base + (360 / sparkCount) * i,
      }));
      // Keep at most a few bursts alive to avoid runaway DOM growth.
      setSparks((prev) => [...prev.slice(-(sparkCount * 3)), ...burst]);
    },
    [reduced, sparkCount]
  );

  return (
    <span
      className={`relative inline-flex ${className ?? ''}`}
      onClick={handleClick}
    >
      {children}
      {sparks.map((spark) => (
        <SparkParticle
          key={spark.id}
          spark={spark}
          color={sparkColor}
          size={sparkSize}
          duration={sparkDuration}
          onDone={removeSpark}
        />
      ))}
    </span>
  );
}
