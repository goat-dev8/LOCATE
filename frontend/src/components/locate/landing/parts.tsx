"use client";

/**
 * LOCATE landing — shared editorial primitives.
 * Dovetail-style: mono eyebrows, display sans + serif-italic accents,
 * hairline structure, generous rhythm.
 */

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/locate/types";

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ---------- brand logo badge ----------
   Issuer marks for the live market catalog are
   full-bleed 512×512 brand badges — rendered as rounded app-icon tiles. */

export function AssetLogo({
  asset,
  size = 36,
  className,
}: {
  asset: Asset;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-xl bg-[#141416] font-mono font-bold uppercase tracking-[0.08em] text-white ring-1 ring-line/80",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.28) }}
      aria-hidden
    >
      {asset.symbol.slice(0, 2)}
    </span>
  );
}

/* ---------- wordmark ---------- */

export function LocateMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="8.5" stroke="#0044FF" strokeWidth="2" />
      <path
        d="M16 2.5v5.5M16 24v5.5M2.5 16H8M24 16h5.5"
        stroke="#0044FF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2.4" fill="#4D7CFF" />
    </svg>
  );
}

export function Wordmark({
  dark = false,
  size = "md",
}: {
  dark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-[15px]" : "text-[17px]";
  return (
    <span className="inline-flex items-center gap-2.5">
      <LocateMark size={size === "lg" ? 30 : 24} />
      <span
        className={cn(
          "font-semibold tracking-[-0.02em]",
          text,
          dark ? "text-shell-ink" : "text-ink",
        )}
      >
        LOCATE
      </span>
    </span>
  );
}

/* ---------- eyebrow ---------- */

export function Eyebrow({
  index,
  label,
  dark = false,
  className,
}: {
  index?: string;
  label: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em]",
        dark ? "text-shell-ink-2" : "text-ink-3",
        className,
      )}
    >
      <span className="inline-block h-[7px] w-[7px] rounded-[2px] bg-lime" aria-hidden />
      {index && <span className="text-lime-deep">{index}</span>}
      <span aria-hidden>·</span>
      <span>{label}</span>
    </p>
  );
}

/* ---------- serif accent word ---------- */

export function Serif({ children }: { children: React.ReactNode }) {
  return <em className="lc-serif">{children}</em>;
}

/* ---------- mixed-typography reveal headline ----------
   Words stagger in with blur + rise; serif segments render in
   Instrument Serif italic. React-Bits SplitText pattern, extended
   to LOCATE's mixed editorial typography. */

export interface HeadSegment {
  text: string;
  serif?: boolean;
  lime?: boolean;
  break?: boolean;
}

export function RevealHeadline({
  segments,
  className,
  delay = 0,
  stagger = 0.055,
  as: Tag = "h2",
}: {
  segments: HeadSegment[];
  className?: string;
  delay?: number;
  stagger?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}) {
  const reduced = useReducedMotion();
  let wordIndex = 0;
  return (
    <Tag className={cn("text-balance", className)}>
      {segments.map((seg, si) =>
        seg.text.split(" ").map((word, wi) => {
          const i = wordIndex++;
          return (
            <motion.span
              key={`${si}-${wi}`}
              className={cn(
                "inline-block",
                seg.serif && "lc-serif font-normal",
                seg.lime && "text-lime-deep",
                seg.break && "block",
              )}
              initial={
                reduced
                  ? false
                  : { opacity: 0, y: "0.55em", filter: "blur(6px)" }
              }
              whileInView={
                reduced ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }
              }
              viewport={{ once: true, margin: "-12% 0px" }}
              transition={{
                duration: 0.7,
                ease: EASE,
                delay: delay + i * stagger,
              }}
            >
              {word}
              {wi < seg.text.split(" ").length - 1 ? "\u00A0" : ""}
            </motion.span>
          );
        }),
      )}
    </Tag>
  );
}

/* ---------- section shell ---------- */

export function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("relative scroll-mt-24 py-20 sm:py-28", className)}
    >
      <div className="lc-container">{children}</div>
    </section>
  );
}

/* ---------- mono stat block ---------- */

export function StatBlock({
  label,
  value,
  sub,
  tone = "ink",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "ink" | "lime" | "ember" | "muted";
  className?: string;
}) {
  const valueTone =
    tone === "lime"
      ? "text-lime-deep"
      : tone === "ember"
        ? "text-ember"
        : tone === "muted"
          ? "text-ink-2"
          : "text-ink";
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="lc-label">{label}</span>
      <span
        className={cn(
          "font-sans text-[clamp(1.6rem,2.6vw,2.1rem)] font-semibold tracking-[-0.03em] tabular-nums",
          valueTone,
        )}
      >
        {value}
      </span>
      {sub && <span className="font-mono text-[11px] text-ink-3">{sub}</span>}
    </div>
  );
}

/* ---------- blue hand-drawn underline for serif words ---------- */

export function LimeUnderline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 14"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("absolute -bottom-2 left-0 h-[0.28em] w-full", className)}
    >
      <path
        d="M3 10.5C48 4.5 118 3.2 217 7.8"
        stroke="#0044FF"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
