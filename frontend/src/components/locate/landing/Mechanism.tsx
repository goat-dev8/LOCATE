"use client";

/**
 * LOCATE — the mechanism, redrawn.
 *
 * A two-flow protocol visualization instead of a flowchart:
 *   · TOKEN FLOW      — the white circuit along the top: the lender's
 *     PreStock lists on the book, delivers on take, is sold short,
 *     bought back, and the net tokens return around the arc.
 *   · USDC FLOW       — the blue rails beneath: the borrower posts
 *     collateral into escrow; a verified return releases it back,
 *     elapsed grace claims it for the lender (default path, ember).
 *
 * Glowing nodes, animated flow paths, traveling particles — no boxes,
 * no imagery. The diagram shows movement of value, not offer terms.
 */

import { useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FadeContent } from "@/components/bits";
import { Eyebrow, RevealHeadline } from "./parts";

const CREAM = "#E4E4E8";
const BLUE = "#4D7CFF";
const EMBER = "#FF7849";
const BASE = "#242427";
const MUTED = "#71717A";
const INDEX = "#52525B";

const MONO = { fontFamily: "var(--font-mono)" };

/* ---------- glowing node ---------- */

function MechNode({
  x,
  y,
  title,
  sub,
  index,
  tone = "token",
  titleY,
  subY,
  indexY,
  big = false,
  animate = true,
  begin = "0s",
}: {
  x: number;
  y: number;
  title: string;
  sub?: string;
  index?: string;
  tone?: "token" | "usdc" | "ember";
  titleY: number;
  subY?: number;
  indexY?: number;
  big?: boolean;
  animate?: boolean;
  begin?: string;
}) {
  const core = tone === "usdc" ? BLUE : tone === "ember" ? EMBER : CREAM;
  const glow = `url(#glow-${tone})`;
  const r = big ? 7 : 5.5;
  const ring = big ? 12.5 : 9;
  const titleFill = tone === "usdc" ? BLUE : CREAM;
  /* dark halo behind glyphs — labels stay readable over animated paths */
  const halo = {
    stroke: "#0A0A0A",
    strokeWidth: 3.5,
    paintOrder: "stroke" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <g>
      <circle cx={x} cy={y} r={big ? 26 : 18} fill={glow}>
        {animate && (
          <animate
            attributeName="opacity"
            values="0.45;0.9;0.45"
            dur="4.6s"
            begin={begin}
            repeatCount="indefinite"
          />
        )}
      </circle>
      <circle cx={x} cy={y} r={ring} fill="none" stroke={core} strokeOpacity="0.28" strokeWidth="1" />
      <circle cx={x} cy={y} r={r} fill={core} />
      {index && indexY && (
        <text
          x={x}
          y={indexY}
          textAnchor="middle"
          fill={INDEX}
          fontSize="9"
          letterSpacing="1.6"
          style={MONO}
          {...halo}
        >
          {index}
        </text>
      )}
      <text
        x={x}
        y={titleY}
        textAnchor="middle"
        fill={titleFill}
        fontSize="12.5"
        fontWeight="700"
        letterSpacing="2.2"
        style={MONO}
        {...halo}
      >
        {title}
      </text>
      {sub && subY && (
        <text
          x={x}
          y={subY}
          textAnchor="middle"
          fill={tone === "ember" ? EMBER : MUTED}
          fontSize="9.5"
          letterSpacing="1.4"
          style={MONO}
          {...halo}
        >
          {sub}
        </text>
      )}
    </g>
  );
}

/* ---------- animated flow path ---------- */

function FlowPath({
  d,
  color,
  dur = 4.5,
  particle = true,
  particleR = 4,
  begin = "0s",
  arrow = true,
  bold = false,
}: {
  d: string;
  color: string;
  dur?: number;
  particle?: boolean;
  particleR?: number;
  begin?: string;
  arrow?: boolean;
  bold?: boolean;
}) {
  const marker =
    color === CREAM ? "arrowCream" : color === BLUE ? "arrowBlue" : "arrowEmber";
  const w = bold ? 1.8 : 1.5;
  const dashW = bold ? 2.2 : 1.8;
  return (
    <g>
      <path d={d} fill="none" stroke={BASE} strokeWidth="1.25" />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={w}
        strokeOpacity="0.62"
        strokeLinecap="round"
        markerEnd={arrow ? `url(#${marker})` : undefined}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={dashW}
        strokeLinecap="round"
        strokeDasharray="4 8"
        className="animate-dash-flow"
      />
      {particle && (
        <circle r={particleR} fill={color} className="rail-dot">
          <animateMotion
            dur={`${dur}s`}
            begin={begin}
            repeatCount="indefinite"
            path={d}
          />
        </circle>
      )}
    </g>
  );
}

/* ---------- small technical note ---------- */

function Note({
  x,
  y,
  text,
  color = MUTED,
  anchor = "middle",
  strong = false,
}: {
  x: number;
  y: number;
  text: string;
  color?: string;
  anchor?: "start" | "middle" | "end";
  strong?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={color}
      fontSize={strong ? "10.5" : "9.5"}
      fontWeight={strong ? "600" : "400"}
      letterSpacing="1.5"
      style={MONO}
      stroke="#0A0A0A"
      strokeWidth={3.5}
      paintOrder="stroke"
      strokeLinejoin="round"
    >
      {text}
    </text>
  );
}

/* ---------- legend ---------- */

function Legend() {
  const items = [
    { color: CREAM, label: "TOKEN FLOW", dashed: false },
    { color: BLUE, label: "USDC COLLATERAL FLOW", dashed: false },
    { color: EMBER, label: "DEFAULT PATH", dashed: true },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
      {items.map((it) => (
        <span
          key={it.label}
          className="flex items-center gap-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-2"
        >
          <svg width="24" height="4" viewBox="0 0 24 4" aria-hidden>
            <line
              x1="0"
              y1="2"
              x2="24"
              y2="2"
              stroke={it.color}
              strokeWidth="1.8"
              strokeDasharray={it.dashed ? "3 4" : undefined}
            />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ---------- the mechanism ---------- */

export function Mechanism() {
  const reduced = useReducedMotion();

  /* the full token circuit — particles ride the whole loop */
  const circuit =
    "M 100 170 L 1030 170 C 1080 165, 1112 120, 1112 85 C 1112 60, 1075 54, 1015 54 L 235 54 C 155 54, 100 80, 100 170";

  return (
    <section id="mechanism" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="lc-container">
        {/* header */}
        <div className="max-w-2xl">
          <FadeContent>
            <Eyebrow label="The mechanism" />
          </FadeContent>
          <RevealHeadline
            className="lc-display mt-6 text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.06]"
            segments={[
              { text: "One loop. Two flows." },
              { text: "Zero", break: true },
              { text: "liquidations.", serif: true },
            ]}
          />
        </div>

        <FadeContent delay={0.25} direction="up">
          <p className="mt-6 max-w-xl text-[16px] leading-[1.7] text-ink-2">
            The lender&apos;s PreStock travels the top of the loop. The
            borrower&apos;s USDC sits locked beneath it. Nothing moves the
            collateral but a verified return — or elapsed grace.
          </p>
        </FadeContent>

        {/* the visualization — open on the canvas, no box */}
        <FadeContent delay={0.3} duration={0.9} distance={32}>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <Legend />
            <p className="lc-label">HOW VALUE MOVES</p>
          </div>
          <div className="mt-6 overflow-x-auto no-scrollbar">
            <svg
              viewBox="0 0 1160 415"
              className="block h-auto w-full min-w-[900px] select-none"
              role="img"
              aria-label="LOCATE mechanism: the lender lists an idle PreStock on the book; on take the borrower posts USDC collateral and the token is delivered; the borrower sells short into the premium, buys back, and returns net tokens to the lender; a verified return releases the collateral back to the borrower, while no return after grace lets the lender claim the collateral."
            >
              <defs>
                <radialGradient id="glow-token">
                  <stop offset="0%" stopColor="#E4E4E8" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#E4E4E8" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="glow-usdc">
                  <stop offset="0%" stopColor="#0044FF" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#0044FF" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="glow-ember">
                  <stop offset="0%" stopColor="#FF7849" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#FF7849" stopOpacity="0" />
                </radialGradient>
                {[
                  { id: "arrowCream", color: CREAM },
                  { id: "arrowBlue", color: BLUE },
                  { id: "arrowEmber", color: EMBER },
                ].map((m) => (
                  <marker
                    key={m.id}
                    id={m.id}
                    viewBox="0 0 10 10"
                    refX="7.5"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto-start-reverse"
                  >
                    <path d="M0 0L10 5L0 10z" fill={m.color} />
                  </marker>
                ))}
              </defs>

              {/* ============ TOKEN FLOW — the top circuit ============ */}

              {/* top lane */}
              <FlowPath d="M 100 170 L 1030 170" color={CREAM} particle={false} />
              <Note x={220} y={144} text="LISTS PRESTOCK" color={MUTED} />
              <Note x={445} y={144} text="TOKEN DELIVERED" color={CREAM} strong />
              <Note x={430} y={198} text="USDC FEE → LENDER · UPFRONT" color={BLUE} />

              {/* return arc — net tokens back to the lender */}
              <FlowPath
                d="M 1030 170 C 1080 165, 1112 120, 1112 85 C 1112 60, 1075 54, 1015 54 L 235 54 C 155 54, 100 80, 100 170"
                color={CREAM}
                particle={false}
              />
              <Note x={565} y={42} text="BUY BACK · RETURN NET TOKENS" color={CREAM} strong />

              {/* circulating token particles — the loop is alive */}
              {!reduced && (
                <>
                  <circle r="4" fill={CREAM} className="rail-dot">
                    <animateMotion dur="11s" repeatCount="indefinite" path={circuit} />
                  </circle>
                  <circle r="4" fill={CREAM} className="rail-dot">
                    <animateMotion dur="11s" begin="-5.5s" repeatCount="indefinite" path={circuit} />
                  </circle>
                </>
              )}

              {/* token nodes */}
              <MechNode x={100} y={170} index="01" title="LENDER" titleY={126} indexY={108} begin="-0.4s" />
              <MechNode
                x={340}
                y={170}
                index="02"
                title="OFFER LISTED"
                sub="IDLE PRESTOCK → BOOK"
                titleY={126}
                subY={204}
                indexY={108}
                begin="-1.2s"
              />
              <MechNode x={580} y={170} index="03" title="BORROWER" titleY={126} indexY={108} begin="-2s" />
              <MechNode
                x={800}
                y={170}
                index="04"
                title="SELLS SHORT"
                sub="INTO THE PREMIUM"
                titleY={126}
                subY={204}
                indexY={108}
                begin="-2.8s"
              />
              <MechNode
                x={1030}
                y={170}
                index="05"
                title="BUY BACK"
                sub="COVERS THE SHORT"
                titleY={126}
                subY={204}
                indexY={108}
                begin="-3.6s"
              />

              {/* ============ USDC FLOW — the rails beneath ============ */}

              {/* down rail — the borrower posts collateral into escrow */}
              <FlowPath d="M 562 184 L 562 314" color={BLUE} dur={3.6} particleR={3} />
              <Note x={546} y={236} text="BORROWER POSTS" color={BLUE} anchor="end" strong />
              <Note x={546} y={250} text="USDC COLLATERAL" color={BLUE} anchor="end" />

              {/* up rail — verified return releases the collateral */}
              <FlowPath d="M 598 314 L 598 184" color={BLUE} dur={3.6} begin="-1.8s" particleR={3} />
              <Note x={614} y={236} text="RETURN VERIFIED" color={BLUE} anchor="start" strong />
              <Note x={614} y={250} text="COLLATERAL RELEASED" color={BLUE} anchor="start" />

              {/* escrow — the collateral hub */}
              <MechNode
                x={580}
                y={330}
                title="USDC ESCROW"
                sub="LOCKED · NOT PRICE-MANAGED"
                tone="usdc"
                big
                titleY={372}
                subY={388}
                begin="-1.6s"
              />

              {/* default path — grace elapses, lender claims */}
              <FlowPath
                d="M 566 336 C 430 346, 280 332, 205 292 C 150 262, 118 224, 103 184"
                color={EMBER}
                dur={9}
                particleR={3.5}
                bold
              />
              {/* maturity clock */}
              <g>
                <circle cx={196} cy={369} r="9" fill="none" stroke={MUTED} strokeWidth="1.3" />
                <path
                  d="M196 369 L196 363.5 M196 369 L200 371"
                  stroke={MUTED}
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </g>
              <Note x={214} y={372} text="NO RETURN · GRACE ELAPSES" color={EMBER} anchor="start" />
              <Note x={214} y={386} text="COLLATERAL CLAIMED BY LENDER" color={EMBER} anchor="start" />
            </svg>
          </div>
        </FadeContent>

        {/* footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="lc-label">SETTLED BY TIME · DELIVERY · USDC COLLATERAL</p>
          <a
            href="#how"
            className="group inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-2 transition-colors hover:text-ink"
          >
            STEP-BY-STEP LIFECYCLE
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden
            />
          </a>
        </div>
      </div>
    </section>
  );
}
