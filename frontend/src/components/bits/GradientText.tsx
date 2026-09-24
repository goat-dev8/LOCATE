'use client';

/**
 * GradientText — text painted with a slowly flowing gradient (ink → olive →
 * ink by default), optionally wrapped in a matching gradient border glow.
 * Adapted from the reactbits.dev "Gradient Text" component for LOCATE's warm
 * light theme. Reduced motion renders the static gradient at rest.
 */

import { useReducedMotion } from 'framer-motion';

export interface GradientTextProps {
  /** Text to paint. */
  children: string;
  /** Class applied to the outer wrapper. */
  className?: string;
  /** Gradient stops (first and last should match for a seamless flow). */
  colors?: string[];
  /** Seconds per full gradient oscillation. */
  animationSpeed?: number;
  /** Wrap the text in a gradient border ring. */
  showBorder?: boolean;
  /** Border ring thickness in px (when `showBorder`). */
  borderWidth?: number;
  /** Border ring radius in px (when `showBorder`). */
  borderRadius?: number;
  /** Start color of the border ring gradient (defaults to colors[0]). */
  gradientFrom?: string;
  /** End color of the border ring gradient (defaults to the last color). */
  gradientTo?: string;
}

const GRADIENT_CSS = `
@keyframes locate-bits-gradient-x {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`;

export function GradientText({
  children,
  className,
  colors = ['#FFFFFF', '#4D7CFF', '#FFFFFF'],
  animationSpeed = 5,
  showBorder = false,
  borderWidth = 1.5,
  borderRadius = 999,
  gradientFrom,
  gradientTo,
}: GradientTextProps) {
  const reduced = useReducedMotion() ?? false;

  const stops = colors.length >= 2 ? colors : [...colors, ...colors];
  const textGradient = `linear-gradient(90deg, ${stops.join(', ')})`;

  const textStyle: React.CSSProperties = {
    backgroundImage: textGradient,
    backgroundSize: '300% 100%',
    backgroundPosition: '0% 50%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    animation: reduced
      ? undefined
      : `locate-bits-gradient-x ${animationSpeed}s ease-in-out infinite`,
  };

  const text = <span style={textStyle}>{children}</span>;

  return (
    <span className={`inline-block ${className ?? ''}`}>
      {/* Injected once per page thanks to React 19 style de-duplication. */}
      <style href="locate-bits-gradient-text" precedence="medium">
        {GRADIENT_CSS}
      </style>
      {showBorder ? (
        <span
          style={{
            display: 'inline-block',
            padding: `${borderWidth}px`,
            borderRadius: `${borderRadius}px`,
            backgroundImage: `linear-gradient(90deg, ${gradientFrom ?? stops[0]}, ${gradientTo ?? stops[stops.length - 1]})`,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: `${Math.max(borderRadius - borderWidth, 0)}px`,
              background: 'var(--locate-paper, #0A0A0A)',
            }}
          >
            {text}
          </span>
        </span>
      ) : (
        text
      )}
    </span>
  );
}
