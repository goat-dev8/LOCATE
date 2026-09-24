'use client';

/**
 * TiltedCard — 3D perspective tilt on hover: the card rotates toward the
 * cursor via damped springs and scales up slightly. Adapted from the
 * reactbits.dev "Tilted Card" component. Renders an image (with optional
 * caption overlay) or arbitrary children; static when reduced motion is on.
 */

import { useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

export interface TiltedCardProps {
  /** Content to tilt; ignored when `imageSrc` is provided. */
  children?: React.ReactNode;
  /** Optional image source; when set the card renders the image. */
  imageSrc?: string;
  /** Alt text for the image. */
  altText?: string;
  /** Caption rendered over the bottom of the image. */
  caption?: string;
  /** Maximum rotation in degrees. */
  rotationAmount?: number;
  /** Hover scale. */
  scale?: number;
  /** Class applied to the caption overlay. */
  overlayClassName?: string;
  /** Class applied to the outer (perspective) container. */
  className?: string;
}

const SPRING = { stiffness: 260, damping: 20 };

export function TiltedCard({
  children,
  imageSrc,
  altText = '',
  caption,
  rotationAmount = 8,
  scale = 1.05,
  overlayClassName,
  className,
}: TiltedCardProps) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement | null>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const scaleValue = useMotionValue(1);
  const rotateXSpring = useSpring(rotateX, SPRING);
  const rotateYSpring = useSpring(rotateY, SPRING);
  const scaleSpring = useSpring(scaleValue, SPRING);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * 2 * rotationAmount);
    rotateX.set(-(py - 0.5) * 2 * rotationAmount);
  };

  const handleMouseEnter = () => {
    if (!reduced) scaleValue.set(scale);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    scaleValue.set(1);
  };

  const content = imageSrc ? (
    <div className="relative h-full w-full overflow-hidden rounded-[inherit]">
      <img
        src={imageSrc}
        alt={altText}
        draggable={false}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      {caption ? (
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 md:p-4 ${overlayClassName ?? ''}`}
        >
          <span className="text-sm font-medium text-white md:text-base">{caption}</span>
        </div>
      ) : null}
    </div>
  ) : (
    children
  );

  if (reduced) {
    return <div className={className}>{content}</div>;
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          rotateX: rotateXSpring,
          rotateY: rotateYSpring,
          scale: scaleSpring,
          transformStyle: 'preserve-3d',
        }}
      >
        {content}
      </motion.div>
    </div>
  );
}
