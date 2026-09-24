"use client";

/**
 * LOCATE — 03 · the Opportunity Layer.
 *
 * What makes LOCATE different from a plain order book: it discovers
 * eligible PreStocks, reads their live premium/reference context from the
 * real product data (prestocks.com via /api/prestocks), and then resolves
 * supply, economics, and cover cost per live offer — leading into
 * BORROW → SHORT → RETURN → VERIFY.
 */

import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { ClickSpark, FadeContent } from "@/components/bits";
import { useLocate } from "@/lib/locate/store";
import { catalogAsset, fmtUsdMaybe } from "@/lib/locate/seed";
import { useLiveMarket } from "@/lib/locate/useLiveMarket";
import { LiveIndicator } from "./LiveIndicator";
import { AssetLogo, EASE, Eyebrow, RevealHeadline, Section } from "./parts";
import { cn } from "@/lib/utils";

const CAPABILITIES = [
  {
    n: "01",
    tag: "DISCOVER",
    body: "Resolves every eligible PreStock — the real listings, the real tokens, nothing else.",
  },
  {
    n: "02",
    tag: "CONTEXT",
    body: "Reads the current premium against reference for each listing from the live API.",
  },
  {
    n: "03",
    tag: "SUPPLY",
    body: "Shows whether real borrowable supply exists on the book — actual tokens, not IOUs.",
  },
  {
    n: "04",
    tag: "ECONOMICS",
    body: "Shows the actual borrowing economics: the fee, the USDC collateral, the term.",
  },
  {
    n: "05",
    tag: "COVER",
    body: "When a return path can be proven, shows the cost to cover the borrow — and where you break even.",
  },
] as const;

const THEN_STEPS = ["BORROW", "SHORT", "RETURN", "VERIFY"] as const;

/** Edge threshold: premiums at or above this read as a shortable edge. */
const EDGE_PCT = 5;

function assetFor(symbol: string) {
  return catalogAsset(symbol);
}

function fmtPremium(pct: number): string {
  return `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`;
}

export function Opportunity() {
  const live = useLiveMarket();
  const openApp = useLocate((s) => s.openApp);
  const navigate = useLocate((s) => s.navigate);

  const openBook = () => {
    openApp();
    navigate("book");
  };

  return (
    <Section id="opportunity" className="bg-paper-2/60">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        {/* left — the capabilities */}
        <div>
          <FadeContent>
            <Eyebrow index="03" label="The opportunity layer" />
          </FadeContent>
          <RevealHeadline
            className="lc-display mt-6 text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.06]"
            segments={[
              { text: "Find the borrow" },
              { text: "actually", break: true },
              { text: "worth", serif: true },
              { text: "taking." },
            ]}
          />
          <FadeContent delay={0.25}>
            <p className="mt-6 max-w-md text-[17px] leading-[1.7] text-ink-2">
              LOCATE does more than list a book. Before you ever touch an
              offer, the Opportunity Layer tells you where shorting a
              PreStock actually makes sense — and what the borrow truly
              costs.
            </p>
          </FadeContent>

          <div className="mt-9 space-y-0 border-t border-line">
            {CAPABILITIES.map((c, i) => (
              <motion.div
                key={c.tag}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-8%" }}
                transition={{ duration: 0.55, ease: EASE, delay: 0.1 + i * 0.07 }}
                className="flex gap-5 border-b border-line py-4.5 sm:py-5"
              >
                <span className="font-mono text-[11px] font-semibold tabular-nums text-lime-deep">
                  {c.n}
                </span>
                <div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink">
                    {c.tag}
                  </p>
                  <p className="mt-1.5 max-w-sm text-[14px] leading-[1.6] text-ink-2">
                    {c.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* right — the live discovery table */}
        <FadeContent delay={0.15} distance={40} duration={0.9}>
          <div className="lc-card overflow-hidden">
            {/* header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-shell px-5 py-4 sm:px-6">
              <span className="flex items-center gap-2.5">
                <span className="inline-block h-[7px] w-[7px] rounded-[2px] bg-lime animate-pulse-dot" aria-hidden />
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                  Shortable now
                </span>
              </span>
              <LiveIndicator status={live.status} at={live.at} />
            </div>

            {/* column head */}
            <div className="hidden grid-cols-[1.5fr_1fr_1fr_auto] gap-4 border-b border-line px-5 py-2.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.16em] text-ink-3 sm:grid sm:px-6">
              <span>PreStock</span>
              <span className="text-right">Reference</span>
              <span className="text-right">Market</span>
              <span className="w-[92px] text-right">Premium</span>
            </div>

            {/* rows */}
            <div className="max-h-[430px] overflow-y-auto lc-scroll">
              {live.status === "loading" &&
                Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 border-b border-line/60 px-5 py-[13px] last:border-b-0 sm:px-6"
                    aria-hidden
                  >
                    <span className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-[#1E1E21]" />
                    <span className="h-3 w-20 animate-pulse rounded-full bg-[#1E1E21]" />
                    <span className="ml-auto h-3 w-14 animate-pulse rounded-full bg-[#1E1E21]" />
                    <span className="h-3 w-12 animate-pulse rounded-full bg-[#1E1E21]" />
                  </div>
                ))}

              {live.status === "waking" && (
                <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
                    API waking up — retrying.
                  </p>
                </div>
              )}

              {live.status === "unavailable" && (
                <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
                    Market data unavailable.
                  </p>
                  <p className="max-w-xs text-[13px] leading-[1.6] text-ink-3">
                    The Opportunity Layer reads live PreStocks catalog data from the LOCATE API.
                    It does not invent numbers.
                  </p>
                </div>
              )}

              {(live.status === "live" || live.status === "stale") &&
                live.byPremium.map((r, i) => {
                  const asset = assetFor(r.symbol);
                  const edge = (r.premiumPct ?? 0) >= EDGE_PCT;
                  const canTake = Boolean(r.bestOffer);
                  return (
                    <motion.button
                      key={r.symbol}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: EASE, delay: 0.04 * i }}
                      onClick={() => {
                        openApp();
                        navigate(canTake ? "book" : "create");
                      }}
                      className="group flex w-full items-center gap-4 border-b border-line/60 px-5 py-[13px] text-left transition-colors last:border-b-0 hover:bg-[#18181B] sm:grid sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:gap-4 sm:px-6"
                      aria-label={`${asset.name} — reference ${fmtUsdMaybe(r.markPrice)}, market ${fmtUsdMaybe(r.tokenPrice)}, premium ${r.premiumPct == null ? "unavailable" : fmtPremium(r.premiumPct)}.`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <AssetLogo asset={asset} size={36} className="rounded-lg" />
                        <span className="min-w-0">
                          <span className="block truncate font-sans text-[13.5px] font-semibold tracking-[-0.01em] text-white">
                            {asset.symbol}
                          </span>
                          <span className="block font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3 sm:hidden">
                            {canTake ? "TAKE OFFER" : "NO BORROWABLE SUPPLY"}
                          </span>
                        </span>
                      </span>
                      <span className="hidden text-right font-mono text-[12px] tabular-nums text-ink-2 sm:block">
                        {fmtUsdMaybe(r.markPrice)}
                      </span>
                      <span className="hidden text-right font-mono text-[12px] tabular-nums text-white sm:block">
                        {fmtUsdMaybe(r.tokenPrice)}
                      </span>
                      <span className="ml-auto flex w-[92px] shrink-0 items-center justify-end gap-2">
                        <span
                          className={cn(
                            "font-mono text-[12.5px] font-bold tabular-nums",
                            r.premiumPct == null
                              ? "text-ink-3"
                              : edge
                                ? "text-ember"
                                : r.premiumPct >= 0
                                  ? "text-ink-2"
                                  : "text-ink-3",
                          )}
                        >
                          {r.premiumPct == null ? "—" : fmtPremium(r.premiumPct)}
                        </span>
                        <ArrowUpRight
                          className="h-3.5 w-3.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                      </span>
                    </motion.button>
                  );
                })}
            </div>

            {/* footer — the handoff into the rail */}
            <div className="border-t border-line bg-[#101012] px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-ink-3">
                  Then the rail takes over —{" "}
                  <span className="text-ink-2">
                    {THEN_STEPS.join(" → ")}
                  </span>
                </p>
                <ClickSpark sparkColor="#7D9BFF" sparkCount={7}>
                  <button onClick={openBook} className="lc-btn lc-btn-lime lc-btn-sm group">
                    OPEN THE BOOK
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                  </button>
                </ClickSpark>
              </div>
            </div>
          </div>

          <FadeContent delay={0.3}>
            <p className="mt-4 px-1 font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.14em] text-ink-3">
              Supply, economics, and cover cost are resolved per live offer
              inside the book — never estimated on this page.
            </p>
          </FadeContent>
        </FadeContent>
      </div>
    </Section>
  );
}
