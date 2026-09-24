'use client';

/**
 * ShinyText — text with a periodic sheen sweep (a white/lime highlight that
 * glides across the glyphs). Adapted from the reactbits.dev "Shiny Text"
 * component and re-tuned for LOCATE's light theme: the base text keeps its
 * inherited ink color and remains fully selectable; only a clipped gradient
 * overlay sweeps. Disabled or reduced-motion renders plain static text.
 */

import { useReducedMotion } from 'framer-motion';

export interface ShinyTextProps {
  /** Text to render. */
  text: string;
  /** Class applied to the wrapper span (font, size, color…). */
  className?: string;
  /** Seconds per sheen cycle (sweep + rest). */
  speed?: number;
  /** Disable the sheen entirely (plain text). */
  disabled?: boolean;
}

const SHINY_CSS = `
.locate-bits-shiny-overlay {
  color: transparent;
  -webkit-text-fill-color: transparent;
  background-image: linear-gradient(
    110deg,
    rgba(255, 255, 255, 0) 22%,
    rgba(255, 255, 255, 0.85) 42%,
    rgba(201, 241, 88, 0.95) 52%,
    rgba(255, 255, 255, 0) 78%
  );
  background-size: 250% 100%;
  -webkit-background-clip: text;
  background-clip: text;
}
@keyframes locate-bits-shiny-sweep {
  0% { background-position: 0% 0; }
  60% { background-position: 100% 0; }
  100% { background-position: 100% 0; }
}
`;

export function ShinyText({ text, className, speed = 5, disabled = false }: ShinyTextProps) {
  const reduced = useReducedMotion() ?? false;
  const active = !reduced && !disabled;

  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      {/* Injected once per page thanks to React 19 style de-duplication. */}
      <style href="locate-bits-shiny-text" precedence="medium">
        {SHINY_CSS}
      </style>
      {text}
      {active && (
        <span
          aria-hidden="true"
          className="locate-bits-shiny-overlay pointer-events-none absolute inset-0"
          style={{ animation: `locate-bits-shiny-sweep ${speed}s ease-in-out infinite` }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
