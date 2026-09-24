"use client";

/**
 * LOCATE — 01 · the problem: you can buy, you can sell, you can't borrow.
 * The premium readout on the right is LIVE — sourced from the real
 * PreStocks product data via the LOCATE API. Market figures come from that response.
 */

import { motion } from "framer-motion";
import { LiveIndicator } from "./LiveIndicator";
import { useLiveMarket } from "@/lib/locate/useLiveMarket";
import { OPENAI_MARK, fmtUsd } from "@/lib/locate/seed";
import { FadeContent, ScrollFloat } from "@/components/bits";
import { AssetLogo, EASE, Eyebrow, RevealHeadline, Section } from "./parts";

const OPENAI = OPENAI_MARK;

export function Problem() {
  const live = useLiveMarket();
  const row = live.bySymbol("OPENAI");
  const pct = row?.premiumPct ?? null;
  const refShare = row?.tokenPrice && row.markPrice
    ? Math.min(96, Math.max(4, (row.markPrice / row.tokenPrice) * 100))
    : 76;

  return (
    <Section id="problem">
      <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_1fr] lg:gap-16">
        <div>
          <FadeContent>
            <Eyebrow index="01" label="The problem" />
          </FadeContent>
          <RevealHeadline
            className="lc-display mt-6 text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.06]"
            segments={[
              { text: "You can buy a PreStock." },
              { text: "You can sell one.", break: true },
              { text: "You still can't" },
              { text: "borrow", serif: true },
              { text: "one." },
            ]}
          />
          <FadeContent delay={0.25} direction="up">
            <p className="mt-7 max-w-xl text-[17px] leading-[1.7] text-ink-2">
              PreStocks trade at a premium over their reference price. Holders
              sit on idle supply that earns nothing. Shorts have nothing to
              sell. With no borrow rail, nothing ever presses against the
              premium.
            </p>
            <p className="mt-4 max-w-xl text-[17px] leading-[1.7] text-ink-2">
              Every mature market has a borrow rail. PreStocks don&apos;t —
              until now.
            </p>
          </FadeContent>
          <FadeContent delay={0.35} direction="up">
            <div className="mt-8 flex items-center gap-4 border-l-2 border-lime pl-5">
              <AssetLogo asset={OPENAI} size={44} className="rounded-2xl" />
              <p className="font-mono text-[11.5px] uppercase leading-[1.9] tracking-[0.14em] text-ink-2">
                LOCATE builds the missing rail —<br />
                idle supply becomes borrowable short supply.
              </p>
            </div>
          </FadeContent>
        </div>

        {/* live premium readout — real data, honest states */}
        <FadeContent delay={0.15} distance={40} duration={0.9}>
          <div className="lc-card lc-card-hover overflow-hidden">
            <div className="p-7 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AssetLogo asset={OPENAI} size={40} className="rounded-xl" />
                  <div className="flex flex-col gap-1">
                    <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-white">
                      {OPENAI.name}
                    </span>
                    <LiveIndicator status={live.status} at={live.at} />
                  </div>
                </div>
              </div>

              <div className="mt-7 flex items-end justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="lc-label">Reference · mark price</span>
                  <span className="font-sans text-[clamp(1.7rem,2.8vw,2.2rem)] font-semibold tracking-[-0.03em] tabular-nums text-ink-2">
                    {row && row.markPrice ? fmtUsd(row.markPrice) : "unavailable"}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5 text-right">
                  <span className="lc-label">Market · token price</span>
                  <span className="font-sans text-[clamp(1.7rem,2.8vw,2.2rem)] font-semibold tracking-[-0.03em] tabular-nums text-ink">
                    {row && row.tokenPrice ? fmtUsd(row.tokenPrice) : "unavailable"}
                  </span>
                </div>
              </div>

              {/* the gap bar */}
              <div
                className="mt-8"
                role="img"
                aria-label={
                  pct !== null
                    ? `Market price exceeds reference price by ${pct.toFixed(1)} percent`
                    : "Market data unavailable"
                }
              >
                <div className="relative flex h-16 w-full overflow-hidden rounded-2xl border border-line bg-[#101012]">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${refShare}%` }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
                    className="flex items-center justify-center bg-ink"
                  >
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0A0A0A]">
                      REF
                    </span>
                  </motion.div>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${100 - refShare}%` }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 1.1, ease: EASE, delay: 0.9 }}
                    className="relative flex items-center justify-center bg-lime"
                  >
                    <motion.span
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.9, duration: 0.5 }}
                      className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white"
                    >
                      PREMIUM
                    </motion.span>
                  </motion.div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
                    REFERENCE · MARK PRICE
                  </span>
                  {pct !== null ? (
                    <span className="rounded-full bg-lime-soft px-3 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-lime-deep tabular-nums">
                      +{pct.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="lc-chip">PREMIUM —</span>
                  )}
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
                    MARKET · TOKEN PRICE
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-line px-7 py-4 sm:px-8">
              <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ink-3">
                {live.status === "live"
                  ? "Live product data · prestocks.com · refreshes each minute"
                  : live.status === "loading"
                    ? "Resolving live PreStock market data…"
                    : "Live market data unavailable right now — the problem stands without it."}
              </p>
            </div>
          </div>
        </FadeContent>
      </div>

      {/* editorial beat */}
      <div className="py-16 sm:py-24">
        <ScrollFloat
          containerClassName="relative"
          enterAnimation={{ opacity: 0, translateY: 42, scale: 0.97 }}
          exitAnimation={{ opacity: 0, translateY: -42, scale: 0.97 }}
        >
          <p className="lc-display text-center text-[clamp(1.7rem,3.8vw,3rem)] leading-[1.15]">
            Premiums persist when <em className="lc-serif">nothing is borrowable.</em>
          </p>
        </ScrollFloat>
      </div>
    </Section>
  );
}
