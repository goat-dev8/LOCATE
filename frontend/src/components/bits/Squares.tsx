'use client';

/**
 * Squares — a canvas-based grid of hairline squares drifting diagonally with
 * squares lighting up (lime) under the cursor and fading out. Adapted from
 * the reactbits.dev "Squares" component for LOCATE's warm LIGHT theme.
 * The canvas fills its parent (the parent must be `position: relative`);
 * the canvas itself is pointer-events-none and mouse position is tracked on
 * the parent element. Reduced motion renders a single static frame.
 */

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export interface SquaresProps {
  /** Diagonal drift direction of the grid. */
  direction?: 'right' | 'left' | 'up' | 'down';
  /** Grid drift speed (pattern cells per second). */
  speed?: number;
  /** Stroke color of the squares. */
  borderColor?: string;
  /** Square edge length in px. */
  squareSize?: number;
  /** Gap between squares in px. */
  gridGap?: number;
  /** Fill color used for the fading hover trail. */
  hoverFillColor?: string;
  /** Fill color of the square directly under the cursor (defaults to hoverFillColor). */
  fillColor?: string;
  /** Classes appended to the canvas element. */
  className?: string;
  /** Optional cap for the canvas width in px. */
  maxWidth?: number;
  /** Optional cap for the canvas height in px. */
  maxHeight?: number;
  /** Flat color used if the 2D canvas context is unavailable. */
  fallbackColor?: string;
}

interface HoverSquare {
  i: number;
  j: number;
  alpha: number;
}

const DIRECTIONS: Record<'right' | 'left' | 'up' | 'down', [number, number]> = {
  right: [1, 1],
  left: [-1, -1],
  up: [1, -1],
  down: [-1, 1],
};

export function Squares({
  direction = 'right',
  speed = 1,
  borderColor = 'rgba(26,24,21,0.08)',
  squareSize = 40,
  gridGap = 8,
  hoverFillColor = 'rgba(201,241,88,0.35)',
  fillColor,
  className,
  maxWidth,
  maxHeight,
  fallbackColor = 'rgba(26,24,21,0.06)',
}: SquaresProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Graceful fallback: a flat tint when 2D rendering is unavailable.
      canvas.style.backgroundColor = fallbackColor;
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const step = squareSize + gridGap;
    const [dirX, dirY] = DIRECTIONS[direction];

    let width = 0;
    let height = 0;
    let raf = 0;
    let lastFrame = performance.now();
    const startTime = performance.now();
    const hovered = new Map<string, HoverSquare>();
    let translate = 0; // current 0..step pattern offset

    const drawGrid = (ox: number, oy: number) => {
      ctx.lineWidth = 1;
      ctx.strokeStyle = borderColor;
      const cols = Math.ceil(width / step) + 2;
      const rows = Math.ceil(height / step) + 2;
      for (let i = -2; i < cols; i++) {
        for (let j = -2; j < rows; j++) {
          ctx.strokeRect(i * step + ox + 0.5, j * step + oy + 0.5, squareSize, squareSize);
        }
      }
    };

    const drawFills = (ox: number, oy: number) => {
      hovered.forEach((sq) => {
        ctx.globalAlpha = Math.min(Math.max(sq.alpha, 0), 1);
        ctx.fillStyle = sq.alpha >= 0.99 ? (fillColor ?? hoverFillColor) : hoverFillColor;
        ctx.fillRect(sq.i * step + ox, sq.j * step + oy, squareSize, squareSize);
      });
      ctx.globalAlpha = 1;
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      drawGrid(0, 0);
    };

    const drawFrame = (now: number) => {
      const t = ((now - startTime) / 1000) * speed;
      translate = (t % 1) * step;
      const ox = dirX * translate;
      const oy = dirY * translate;
      ctx.clearRect(0, 0, width, height);
      drawGrid(ox, oy);
      drawFills(ox, oy);

      // Fade the hover trail out over roughly 0.9s (frame-rate independent).
      const dt = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      hovered.forEach((sq, key) => {
        sq.alpha -= dt * 1.1;
        if (sq.alpha <= 0) hovered.delete(key);
      });
    };

    const loop = (now: number) => {
      drawFrame(now);
      raf = requestAnimationFrame(loop);
    };

    const resize = () => {
      width = Math.min(parent.clientWidth, maxWidth ?? Number.POSITIVE_INFINITY);
      height = Math.min(parent.clientHeight, maxHeight ?? Number.POSITIVE_INFINITY);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) drawStatic();
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > width || y > height) return;
      const relX = x - dirX * translate;
      const relY = y - dirY * translate;
      const i = Math.floor(relX / step);
      const j = Math.floor(relY / step);
      const withinX = relX - i * step < squareSize;
      const withinY = relY - j * step < squareSize;
      if (!withinX || !withinY) return;
      hovered.set(`${i},${j}`, { i, j, alpha: 1 });
      if (hovered.size > 64) {
        const oldest = hovered.keys().next().value;
        if (oldest !== undefined) hovered.delete(oldest);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    if (reduced) {
      drawStatic();
    } else {
      raf = requestAnimationFrame(loop);
      parent.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      if (!reduced) parent.removeEventListener('mousemove', handleMouseMove);
      hovered.clear();
    };
  }, [
    reduced,
    direction,
    speed,
    borderColor,
    squareSize,
    gridGap,
    hoverFillColor,
    fillColor,
    maxWidth,
    maxHeight,
    fallbackColor,
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 ${className ?? ''}`}
    />
  );
}
