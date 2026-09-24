'use client';

/**
 * SpotlightCard — a card whose surface glows with a radial spotlight that
 * follows the cursor. Adapted from the reactbits.dev "Spotlight Card"
 * component and re-tuned for LOCATE's warm light theme (soft lime glow).
 *
 * The default shell is `relative rounded-2xl border border-[#232326] bg-[#141416]`;
 * any `rounded-*`, `border*` or `bg-*` classes passed via `className` replace
 * the corresponding default (e.g. `bg-[#1A1A1E]` or `rounded-xl`).
 */

import { useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export interface SpotlightCardProps {
  /** Card content; sits above the spotlight overlay and receives pointer events. */
  children: React.ReactNode;
  /** Classes for the card shell. Conflicting `rounded` / `border` / `bg`
   * utilities override their defaults. */
  className?: string;
  /** Radial gradient color of the spotlight (CSS color). */
  spotlightColor?: string;
  /** 'default' keeps a subtle always-on glow; 'hover' glows only while hovered. */
  variant?: 'default' | 'hover';
}

const DEFAULT_SPOTLIGHT = 'rgba(0, 68, 255, 0.30)';

const SHELL_DEFAULTS = ['relative', 'rounded-2xl', 'border', 'border-[#232326]', 'bg-[#141416]'];

const SHELL_FAMILIES = ['rounded', 'border', 'bg'] as const;

function familyOf(cls: string): (typeof SHELL_FAMILIES)[number] | undefined {
  return SHELL_FAMILIES.find((family) => cls === family || cls.startsWith(`${family}-`));
}

function mergeShell(userClassName: string | undefined): string {
  if (!userClassName) return SHELL_DEFAULTS.join(' ');
  const userClasses = userClassName.split(/\s+/).filter(Boolean);
  const activeFamilies = new Set(
    userClasses
      .map((cls) => familyOf(cls))
      .filter((family): family is (typeof SHELL_FAMILIES)[number] => family !== undefined)
  );
  const defaults = SHELL_DEFAULTS.filter((cls) => {
    const family = familyOf(cls);
    return family === undefined || !activeFamilies.has(family);
  });
  return [...defaults, ...userClasses].join(' ');
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = DEFAULT_SPOTLIGHT,
  variant = 'default',
}: SpotlightCardProps) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--locate-spot-x', `${event.clientX - rect.left}px`);
    el.style.setProperty('--locate-spot-y', `${event.clientY - rect.top}px`);
  };

  const showGlow = variant === 'default' || hovered;

  return (
    <div
      ref={ref}
      className={mergeShell(className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-500"
        style={{
          opacity: showGlow ? 1 : 0,
          transitionDuration: reduced ? '0ms' : undefined,
          background:
            'radial-gradient(420px circle at var(--locate-spot-x, 50%) var(--locate-spot-y, 50%), ' +
            `${spotlightColor}, transparent 65%)`,
        }}
      />
      {children}
    </div>
  );
}
