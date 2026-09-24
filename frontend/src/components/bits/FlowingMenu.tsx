'use client';

/**
 * FlowingMenu — a vertical list of large editorial rows; hovering (or
 * focusing) a row slides its text right, tints the background, and reveals a
 * rounded image preview on the right (desktop only), with an optional
 * hover-image crossfade. Adapted from the reactbits.dev "Flowing Menu"
 * component for LOCATE's warm light theme (paper bg, ink text, hairlines).
 */

import { motion, useReducedMotion, type Variants } from 'framer-motion';

export interface FlowingMenuItem {
  /** Row label (large editorial text). */
  text: string;
  /** Preview image revealed on hover (desktop). */
  imageSrc: string;
  /** Optional image crossfaded in while hovering the row. */
  hoverImageSrc?: string;
}

export interface FlowingMenuProps {
  /** Menu rows. */
  items: FlowingMenuItem[];
  /** Class applied to the list container. */
  className?: string;
  /** Called when a row is clicked. */
  onSelect?: (item: FlowingMenuItem, index: number) => void;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const tintVariants: Variants = {
  rest: { opacity: 0 },
  hover: { opacity: 1, transition: { duration: 0.35 } },
};

const textVariants: Variants = {
  rest: { x: 0, transition: { duration: 0.4, ease: EASE } },
  hover: { x: 12, transition: { duration: 0.4, ease: EASE } },
};

const arrowVariants: Variants = {
  rest: { opacity: 0.35, x: 0, transition: { duration: 0.35, ease: EASE } },
  hover: { opacity: 1, x: 6, transition: { duration: 0.35, ease: EASE } },
};

const imageVariants: Variants = {
  rest: {
    opacity: 0,
    scale: 0.82,
    skewY: 4,
    y: '-50%',
    transition: { duration: 0.45, ease: EASE },
  },
  hover: {
    opacity: 1,
    scale: 1,
    skewY: 0,
    y: '-50%',
    transition: { duration: 0.45, ease: EASE },
  },
};

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

interface FlowingMenuRowProps {
  item: FlowingMenuItem;
  index: number;
  onSelect?: (item: FlowingMenuItem, index: number) => void;
}

function FlowingMenuRow({ item, index, onSelect }: FlowingMenuRowProps) {
  return (
    <motion.button
      type="button"
      layout
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileFocus="hover"
      onClick={() => onSelect?.(item, index)}
      className="group relative flex w-full cursor-pointer items-center border-t border-[#232326] px-4 py-6 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:px-6 md:py-8 lg:py-10"
    >
      {/* Background tint (GPU-friendly opacity layer). */}
      <motion.span
        variants={tintVariants}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-white/[0.04]"
      />

      {/* Editorial label; reserves space for the preview panel on large screens. */}
      <motion.span
        variants={textVariants}
        className="relative z-[1] flex-1 pr-12 text-2xl font-medium tracking-tight text-white sm:text-3xl md:text-4xl lg:pr-56 lg:text-5xl"
      >
        {item.text}
      </motion.span>

      {/* Preview panel (hidden on mobile). */}
      <motion.span
        variants={imageVariants}
        aria-hidden="true"
        className="pointer-events-none absolute right-14 top-1/2 z-[2] hidden h-28 w-44 overflow-hidden rounded-xl border border-[#2A2A2D] lg:block"
      >
        {item.hoverImageSrc ? (
          <>
            <img
              src={item.imageSrc}
              alt=""
              loading="lazy"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <img
              src={item.hoverImageSrc}
              alt=""
              loading="lazy"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          </>
        ) : (
          <img
            src={item.imageSrc}
            alt=""
            loading="lazy"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </motion.span>

      {/* CTA arrow pinned to the right edge. */}
      <motion.span
        variants={arrowVariants}
        className="absolute right-4 z-[3] shrink-0 text-white md:right-6"
      >
        <ArrowIcon />
      </motion.span>
    </motion.button>
  );
}

export function FlowingMenu({ items, className, onSelect }: FlowingMenuProps) {
  const reduced = useReducedMotion() ?? false;

  if (items.length === 0) {
    return null;
  }

  if (reduced) {
    return (
      <div className={`divide-y divide-[#232326] border-b border-[#232326] ${className ?? ''}`}>
        {items.map((item, index) => (
          <button
            key={`${index}-${item.text}`}
            type="button"
            onClick={() => onSelect?.(item, index)}
            className="flex w-full cursor-pointer items-center gap-6 px-4 py-6 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white hover:bg-white/[0.03] md:px-6 md:py-8 lg:py-10"
          >
            <span className="flex-1 pr-12 text-2xl font-medium tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
              {item.text}
            </span>
            <ArrowIcon className="opacity-60" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`border-b border-[#232326] ${className ?? ''}`}>
      {items.map((item, index) => (
        <FlowingMenuRow
          key={`${index}-${item.text}`}
          item={item}
          index={index}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
