'use client';

/**
 * StarBorder — a pill/rounded wrapper whose border shows a comet of light
 * traveling around the ring. Adapted from the reactbits.dev "Star Border"
 * component and re-tuned for cream backgrounds: a faint static ring keeps the
 * shape legible while the bright conic comet sweeps, and the inner surface
 * defaults to LOCATE surface (#141416, overridable via the `--locate-paper`
 * CSS variable). Override the default pill shape with an important utility,
 * e.g. `className="!rounded-2xl"`.
 */

import { useReducedMotion } from 'framer-motion';

export interface StarBorderProps {
  /** Content inside the border. Bring your own padding, e.g. a padded span. */
  children: React.ReactNode;
  /** Glow color (CSS color). */
  color?: string;
  /** Seconds for a full revolution. */
  speed?: number;
  /** Ring thickness in px. */
  thickness?: number;
  /** Class applied to the outer wrapper. */
  className?: string;
  /** Render as a button (default) or a plain div. */
  as?: 'button' | 'div';
}

const STAR_CSS = `
@property --locate-bits-star-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
@keyframes locate-bits-star-spin {
  to { --locate-bits-star-angle: 360deg; }
}
`;

export function StarBorder({
  children,
  color = '#C9F158',
  speed = 4,
  thickness = 1.5,
  className,
  as = 'button',
}: StarBorderProps) {
  const reduced = useReducedMotion() ?? false;

  const inner = (
    <>
      {/* Injected once per page thanks to React 19 style de-duplication. */}
      <style href="locate-bits-star-border" precedence="medium">
        {STAR_CSS}
      </style>
      {/* Faint static ring so the shape never fully disappears. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: color, opacity: 0.18 }}
      />
      {/* Traveling comet. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: `conic-gradient(from var(--locate-bits-star-angle, 0deg), ${color} 0deg, transparent 80deg, transparent 280deg, ${color} 360deg)`,
          animation: reduced
            ? undefined
            : `locate-bits-star-spin ${speed}s linear infinite`,
        }}
      />
      <span
        className="relative z-[1] flex w-full items-center justify-center rounded-[inherit]"
        style={{ background: 'var(--locate-paper, #141416)' }}
      >
        {children}
      </span>
    </>
  );

  const sharedClass = `relative rounded-full ${className ?? ''}`;
  const sharedStyle: React.CSSProperties = { padding: `${thickness}px` };

  if (as === 'div') {
    return (
      <div className={sharedClass} style={sharedStyle}>
        {inner}
      </div>
    );
  }

  return (
    <button type="button" className={sharedClass} style={sharedStyle}>
      {inner}
    </button>
  );
}
