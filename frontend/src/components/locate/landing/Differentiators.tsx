"use client";

/**
 * LOCATE — 04 · settlement philosophy: price moves do not liquidate the
 * loan. No oracle, no liquidation, time + delivery + USDC collateral.
 * Clean line-icon pillars — no imagery.
 */

import { FadeContent, GradientText, SpotlightCard } from "@/components/bits";
import { Eyebrow, RevealHeadline, Section } from "./parts";

/* ---------- clean line icons ---------- */

function IconNoOracle() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="h-full w-full">
      <path
        d="M6 30c4-8 8-12 12-12s6 6 10 6 8-4 14-12"
        stroke="#7D9BFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 8l32 32"
        stroke="#FF7849"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="10" cy="38" r="2.4" fill="#71717A" />
      <circle cx="24" cy="40" r="2.4" fill="#71717A" />
      <circle cx="38" cy="38" r="2.4" fill="#71717A" />
    </svg>
  );
}

function IconNoLiquidation() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="h-full w-full">
      <rect
        x="10"
        y="21"
        width="28"
        height="20"
        rx="5"
        stroke="#7D9BFF"
        strokeWidth="2"
      />
      <path
        d="M16 21v-5a8 8 0 0 1 16 0v5"
        stroke="#7D9BFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M24 27v8" stroke="#E4E4E8" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6 6l4 4M42 6l-4 4M6 42l4-4M42 42l-4-4"
        stroke="#2A2A2D"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTimeDelivery() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="h-full w-full">
      <circle cx="24" cy="24" r="17" stroke="#7D9BFF" strokeWidth="2" />
      <path
        d="M24 14v10l7 5"
        stroke="#E4E4E8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 7V3M24 45v-4M7 24H3M45 24h-4"
        stroke="#7D9BFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const CARDS = [
  {
    icon: <IconNoOracle />,
    label: "SETTLEMENT INPUT",
    title: "No oracle",
    body: "No price feeds to manipulate, no mark-to-market debt, no keeper-triggered cascades. The protocol never looks at the market — it only counts tokens and time.",
  },
  {
    icon: <IconNoLiquidation />,
    label: "RISK MODEL",
    title: "No liquidation",
    body: "Collateral is locked at take-time, not managed. There is no health factor, no maintenance margin, and nothing to unwind mid-flight. USDC sits. The clock runs.",
  },
  {
    icon: <IconTimeDelivery />,
    label: "THE ONLY TRIGGER",
    title: "Time + delivery",
    body: "Maturity is the event. Net tokens delivered on time releases collateral; nothing delivered after grace hands the USDC to the lender. Binary, verifiable, done.",
  },
];

const NOT_IN_STACK = [
  "PRICE ORACLES",
  "LIQUIDATION ENGINES",
  "HEALTH FACTORS",
  "MARGIN CALLS",
  "KEEPER NETWORKS",
  "MARK-TO-MARKET",
  "AI PRICING",
  "AMM UNWINDS",
];

export function Differentiators() {
  return (
    <Section id="settlement" className="overflow-hidden">
      <div className="mx-auto max-w-3xl text-center">
        <FadeContent>
          <Eyebrow index="04" label="Settlement philosophy" className="justify-center" />
        </FadeContent>
        <RevealHeadline
          className="lc-display mt-6 text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.06]"
          segments={[
            { text: "Price moves do not" },
            { text: "liquidate", serif: true },
            { text: "the loan." },
          ]}
        />
        <FadeContent delay={0.25}>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.7] text-ink-2">
            LOCATE settles on three inputs — time, delivery, and USDC
            collateral. The market can do whatever it wants in between; the
            loan doesn&apos;t care. Everything else is engineering theater we
            deliberately left out.
          </p>
        </FadeContent>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {CARDS.map((c, i) => (
          <FadeContent key={c.title} delay={i * 0.1} distance={34} duration={0.8}>
            <SpotlightCard
              className="lc-card lc-card-hover flex h-full flex-col p-6"
              spotlightColor="rgba(0,68,255,0.22)"
              variant="hover"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#101012] ring-1 ring-line">
                  {c.icon}
                </span>
                <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-ink-3">
                  0{i + 1}
                </span>
              </div>
              <div className="mt-6 flex flex-1 flex-col">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
                  {c.label}
                </p>
                <h3 className="lc-display mt-2 text-[22px]">{c.title}</h3>
                <p className="mt-3 text-[14px] leading-[1.65] text-ink-2">{c.body}</p>
              </div>
            </SpotlightCard>
          </FadeContent>
        ))}
      </div>

      {/* not in the stack */}
      <FadeContent delay={0.2} className="mt-12">
        <div className="lc-card-flat bg-paper-2 p-7 sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3">
              Not in the stack
            </p>
            <GradientText
              className="text-[clamp(1.15rem,2vw,1.5rem)] font-semibold tracking-[-0.02em]"
              colors={["#FFFFFF", "#4D7CFF", "#FFFFFF"]}
              animationSpeed={6}
            >
              If it needs a feed, it isn&apos;t settlement.
            </GradientText>
          </div>
          <div className="mt-6 flex flex-wrap gap-2" aria-label="Excluded mechanisms">
            {NOT_IN_STACK.map((t) => (
              <span
                key={t}
                className="lc-chip relative text-ink-3 line-through decoration-refuse/70 decoration-[1.5px]"
                title="Not part of the LOCATE protocol"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </FadeContent>
    </Section>
  );
}
