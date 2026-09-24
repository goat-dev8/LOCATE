"use client";

/**
 * LOCATE — 02 · the borrow rail: the full short lifecycle as one
 * interactive editorial rail. Hover or click a move to inspect it —
 * every step is explained with a clean UI/diagram element, no imagery.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FadeContent } from "@/components/bits";
import { EASE, Eyebrow, RevealHeadline, Section } from "./parts";
import { cn } from "@/lib/utils";

/* ---------- shared diagram palette (mechanism language) ---------- */

const GOLD = "#E8B84B";
const LIME = "#4D7CFF";
const EMBER = "#FF7849";
const CREAM = "#E4E4E8";
const MUTED = "#71717A";
const BASE = "#2A2A2D";

function DNode({
  x,
  y,
  w,
  label,
  sub,
  accent,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={sub ? 46 : 34}
        rx={10}
        fill="#1A1A1E"
        stroke={accent ?? "#3A3A40"}
        strokeWidth={1.3}
      />
      <text
        x={x + w / 2}
        y={y + (sub ? 20 : 22)}
        textAnchor="middle"
        fill={accent ?? CREAM}
        fontSize={10.5}
        fontWeight={700}
        letterSpacing={1.6}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {label}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + 36}
          textAnchor="middle"
          fill={MUTED}
          fontSize={8}
          letterSpacing={1.1}
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function DFlow({
  d,
  color,
  dot = true,
  dur = 3.4,
}: {
  d: string;
  color: string;
  dot?: boolean;
  dur?: number;
}) {
  return (
    <g>
      <path d={d} fill="none" stroke={BASE} strokeWidth={1.4} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        opacity={0.5}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeDasharray="3 8"
        className="animate-dash-flow"
      />
      {dot && (
        <circle r={3.2} fill={color} className="rail-dot">
          <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  );
}

function DNote({
  x,
  y,
  text,
  color = MUTED,
  anchor = "start",
}: {
  x: number;
  y: number;
  text: string;
  color?: string;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={color}
      fontSize={8}
      letterSpacing={1.3}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {text}
    </text>
  );
}

/* ---------- the five step diagrams ---------- */

function DiagramOffer() {
  return (
    <svg viewBox="0 0 280 132" className="h-auto w-full" role="img" aria-label="Diagram: the lender lists an offer on the book while tokens stay in the lender wallet">
      <DNode x={12} y={26} w={92} label="LENDER" sub="PRESTOCK WALLET" />
      <DNode x={176} y={26} w={92} label="OFFER" sub="ON THE BOOK" accent={GOLD} />
      <DFlow d="M 104 49 L 176 49" color={GOLD} />
      <DNote x={140} y={40} text="LISTING" anchor="middle" />
      <DFlow d="M 58 72 L 58 100" color={BASE} dot={false} />
      <DNode x={12} y={100} w={92} label="TOKENS STAY" />
      <DNote x={140} y={115} text="AN OFFER IS A LISTING — NOT A TRANSFER" anchor="middle" color={LIME} />
    </svg>
  );
}

function DiagramTake() {
  return (
    <svg viewBox="0 0 280 132" className="h-auto w-full" role="img" aria-label="Diagram: borrower locks USDC collateral and fee, then the PreStock tokens are delivered">
      <DNode x={12} y={16} w={110} label="BORROWER" sub="LOCKS USDC + FEE" accent={LIME} />
      <DNode x={158} y={16} w={110} label="COLLATERAL" sub="LOCKED AT TAKE" />
      <DFlow d="M 122 39 L 158 39" color={EMBER} dur={2.6} />
      <DFlow d="M 58 62 L 58 84" color={LIME} />
      <DNode x={12} y={84} w={110} label="PRESTOCK" sub="DELIVERED · NET" accent={GOLD} />
      <DNote x={213} y={76} text="TOKEN-2022" anchor="middle" />
      <DNote x={213} y={88} text="FEE-AWARE NET" anchor="middle" />
      <DFlow d="M 122 107 L 158 107" color={BASE} dot={false} />
      <DNote x={140} y={124} text="EVERYTHING COMPUTED BEFORE SIGN" anchor="middle" />
    </svg>
  );
}

function DiagramShort() {
  return (
    <svg viewBox="0 0 280 132" className="h-auto w-full" role="img" aria-label="Diagram: the borrower sells the borrowed PreStock into the market premium">
      <DNode x={12} y={30} w={104} label="BORROWER" sub="HOLDS TOKENS" />
      <DNode x={164} y={30} w={104} label="MARKET" sub="THE PREMIUM" accent={EMBER} />
      <DFlow d="M 116 53 L 164 53" color={EMBER} dur={2.8} />
      <DNote x={140} y={44} text="SELL" anchor="middle" color={EMBER} />
      <DNote x={140} y={90} text="A CLOCKED OBLIGATION TO RETURN REAL TOKENS" anchor="middle" />
      <g>
        <circle cx={34} cy={104} r={9} fill="none" stroke={MUTED} strokeWidth={1.3} />
        <path d="M34 104 L34 98 M34 104 L38 106" stroke={MUTED} strokeWidth={1.3} strokeLinecap="round" />
        <DNote x={50} y={107} text="TERM CLOCK STARTS" />
      </g>
      <DNote x={216} y={107} text="NO HEALTH FACTOR" anchor="middle" />
    </svg>
  );
}

function DiagramReturn() {
  return (
    <svg viewBox="0 0 280 132" className="h-auto w-full" role="img" aria-label="Diagram: buy back from the market and return the net token requirement to the lender">
      <DNode x={12} y={16} w={110} label="MARKET" sub="BUY BACK" />
      <DNode x={158} y={16} w={110} label="BORROWER" sub="COVERS" accent={LIME} />
      <DFlow d="M 122 39 L 158 39" color={LIME} dur={2.8} />
      <DFlow d="M 213 62 L 213 84" color={GOLD} />
      <DNode x={158} y={84} w={110} label="LENDER" sub="RECEIVES NET" accent={GOLD} />
      <DNote x={140} y={62} text="RETURN · NET REQUIREMENT" anchor="middle" />
      <DNote x={70} y={107} text="FEE-AWARE" />
      <DNote x={213} y={124} text="VERIFIED TO THE LAST DECIMAL" anchor="middle" color={LIME} />
    </svg>
  );
}

function DiagramSettle() {
  return (
    <svg viewBox="0 0 280 132" className="h-auto w-full" role="img" aria-label="Diagram: at maturity, verified delivery releases collateral to the borrower; after grace with nothing delivered, the lender claims the collateral">
      <g>
        <circle cx={140} cy={24} r={11} fill="none" stroke={CREAM} strokeWidth={1.4} />
        <path d="M140 24 L140 17 M140 24 L145 27" stroke={CREAM} strokeWidth={1.4} strokeLinecap="round" />
        <DNote x={140} y={48} text="MATURITY" anchor="middle" color={CREAM} />
      </g>
      <DFlow d="M 128 34 C 96 40, 76 56, 62 74" color={LIME} dur={3} dot={false} />
      <DFlow d="M 152 34 C 184 40, 204 56, 218 74" color={EMBER} dur={3} dot={false} />
      <DNode x={12} y={74} w={104} label="VERIFIED" sub="COLLATERAL BACK" accent={LIME} />
      <DNode x={164} y={74} w={104} label="CLAIM" sub="AFTER 48H GRACE" accent={EMBER} />
      <DNote x={64} y={112} text="DELIVERY SATISFIED" anchor="middle" color={LIME} />
      <DNote x={216} y={112} text="NOTHING DELIVERED" anchor="middle" color={EMBER} />
    </svg>
  );
}

/* ---------- the steps ---------- */

interface Step {
  n: string;
  title: string;
  who: "LENDER" | "BORROWER" | "PROTOCOL";
  lede: string;
  body: string;
  chips: string[];
  note?: { text: string; tone: "lime" | "ember" };
  diagram: React.ReactNode;
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "OFFER",
    who: "LENDER",
    lede: "List real tokens — without letting go.",
    body: "The holder lists an offer: amount, the USDC collateral required from the borrower, the upfront fee, and the term. An offer is a listing, not a transfer — tokens stay in the lender's wallet until taken.",
    chips: ["AMOUNT", "COLLATERAL", "UPFRONT FEE", "TERM"],
    note: { text: "You keep your tokens until the offer is taken.", tone: "lime" },
    diagram: <DiagramOffer />,
  },
  {
    n: "02",
    title: "TAKE",
    who: "BORROWER",
    lede: "Post USDC collateral. Receive the PreStock.",
    body: "The borrower posts the USDC collateral and pays the lender's fee upfront. The borrowed PreStock is delivered — net of Token-2022 transfer fees, computed before anyone signs.",
    chips: ["USDC POSTED", "FEE PREPAID", "NET COMPUTED"],
    diagram: <DiagramTake />,
  },
  {
    n: "03",
    title: "SHORT",
    who: "BORROWER",
    lede: "Sell the borrowed token into the premium.",
    body: "The borrower can sell the borrowed PreStock into the market premium. This short is a clocked obligation to return real tokens — not a leveraged position managed by a liquidation engine.",
    chips: ["SELL INTO PREMIUM", "DELIVERY OBLIGATION", "NO HEALTH FACTOR"],
    diagram: <DiagramShort />,
  },
  {
    n: "04",
    title: "RETURN",
    who: "BORROWER",
    lede: "Buy back. Deliver the required amount.",
    body: "Before maturity, the borrower buys back the tokens and returns the required amount — fee-aware to the last decimal. A verified return releases the collateral.",
    chips: ["BUY BACK", "NET REQUIREMENT", "FEE-AWARE"],
    diagram: <DiagramReturn />,
  },
  {
    n: "05",
    title: "SETTLE",
    who: "PROTOCOL",
    lede: "Time decides. Nothing else does.",
    body: "Verified net delivery → collateral returns to the borrower. Maturity plus 48 hours of grace with nothing delivered → the collateral goes to the lender. Binary, verifiable, done.",
    chips: ["TIME", "DELIVERY", "USDC COLLATERAL"],
    note: { text: "Default after grace → lender claims the USDC.", tone: "ember" },
    diagram: <DiagramSettle />,
  },
];

const WHO_TONE: Record<Step["who"], string> = {
  LENDER: "lc-chip-lime",
  BORROWER: "lc-chip-ember",
  PROTOCOL: "lc-chip",
};

export function Lifecycle() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <Section id="how">
      <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <FadeContent>
            <Eyebrow index="02" label="The borrow rail" />
          </FadeContent>
          <RevealHeadline
            className="lc-display mt-6 text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.06]"
            segments={[
              { text: "Five moves." },
              { text: "One", serif: true },
              { text: "clock." },
            ]}
          />
          <FadeContent delay={0.25}>
            <p className="mt-6 max-w-md text-[17px] leading-[1.7] text-ink-2">
              From idle holding to settled loan — the full lifecycle of a
              LOCATE borrow. Hover or click a move to inspect it. Every move
              answers the same questions: what moves, what is paid, what is
              owed, and what happens next.
            </p>
          </FadeContent>

          {/* detail panel */}
          <FadeContent delay={0.35} className="mt-9">
            <div className="lc-card overflow-hidden">
              <div className="relative border-b border-line bg-shell px-5 py-6 sm:px-7">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.n}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.99 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="mx-auto max-w-[320px]"
                  >
                    {step.diagram}
                  </motion.div>
                </AnimatePresence>
                <span className="absolute left-4 top-4 rounded-full bg-[#0A0A0ACC] px-3 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
                  MOVE {step.n}
                </span>
                <span className={cn("absolute right-4 top-4", WHO_TONE[step.who])}>
                  {step.who}
                </span>
              </div>
              <div className="p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.n}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.32, ease: EASE }}
                  >
                    <h3 className="lc-display text-xl">{step.lede}</h3>
                    <p className="mt-3 text-[14px] leading-[1.65] text-ink-2">
                      {step.body}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {step.chips.map((c) => (
                        <span key={c} className="lc-chip">{c}</span>
                      ))}
                    </div>
                    {step.note && (
                      <p
                        className={`mt-5 rounded-xl px-4 py-3 font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.12em] ${
                          step.note.tone === "lime"
                            ? "bg-lime-soft text-lime-deep"
                            : "bg-ember-soft text-ember-deep"
                        }`}
                      >
                        {step.note.text}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </FadeContent>
        </div>

        <div>
          {/* the step rail */}
          <FadeContent delay={0.1} direction="right" distance={30}>
            <ol className="overflow-hidden rounded-[24px] border border-line bg-cream">
              {STEPS.map((s, i) => {
                const isActive = i === active;
                return (
                  <li key={s.n} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onClick={() => setActive(i)}
                      aria-current={isActive}
                      className={cn(
                        "group flex w-full items-center gap-4 px-5 py-5 text-left transition-colors duration-300 sm:px-7",
                        isActive ? "bg-[#18181B]" : "hover:bg-[#161619]",
                      )}
                    >
                      <span
                        className={cn(
                          "font-mono text-[12px] font-semibold tabular-nums transition-colors",
                          isActive ? "text-lime-deep" : "text-ink-3",
                        )}
                      >
                        {s.n}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block font-sans text-[clamp(1.15rem,2.2vw,1.6rem)] font-semibold tracking-[-0.02em] transition-colors",
                            isActive ? "text-white" : "text-ink-2",
                          )}
                        >
                          {s.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] text-ink-3">
                          {s.lede}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "hidden shrink-0 transition-all duration-300 sm:block",
                          isActive ? "opacity-100" : "opacity-0",
                        )}
                      >
                        <ArrowRight className="h-4 w-4 text-lime-deep" aria-hidden />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 flex items-center justify-between px-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
                ← hover or click a move
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
                LENDER → BORROWER → PROTOCOL
              </span>
            </div>
          </FadeContent>

          {/* claim path */}
          <FadeContent delay={0.25} direction="right" distance={26}>
            <div className="lc-card mt-6 flex items-start gap-4 p-5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ember-soft text-ember">
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-ink">
                  The alternate ending — CLAIM
                </p>
                <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-2">
                  If the borrower never returns the tokens, the loan matures,
                  48 hours of grace pass, and the lender claims the locked USDC
                  collateral. No auction, no partial fills, no negotiation.
                </p>
              </div>
            </div>
          </FadeContent>
        </div>
      </div>
    </Section>
  );
}
