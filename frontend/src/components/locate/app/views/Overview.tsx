"use client";

/**
 * LOCATE — Overview: the market at a glance + your position.
 */

import { ArrowUpRight, TrendingDown } from "lucide-react";
import { CountUp, FadeContent } from "@/components/bits";
import { useLocate } from "@/lib/locate/store";
import { fmtToken } from "@/lib/locate/seed";
import { useLiveMarket } from "@/lib/locate/useLiveMarket";
import { AssetLogo } from "../../landing/parts";
import { DataRow, StatusChip, useCountdown, ViewHead } from "../parts";
import { motion } from "framer-motion";

export function OverviewView() {
  const { navigate, offers, loans } = useLocate();
  const live = useLiveMarket();
  const openai = live.bySymbol("OPENAI");
  const activeSupply = offers
    .filter((o) => o.status === "ACTIVE" && !o.isYours)
    .reduce((acc, o) => acc + o.amount, 0);
  const activeOffers = offers.filter((o) => o.status === "ACTIVE" && !o.isYours).length;
  const myBorrowed = loans.find((l) => l.direction === "BORROWED" && l.status === "ACTIVE");
  const claimable = loans.find((l) => l.status === "CLAIMABLE");
  const borrowedCd = useCountdown(myBorrowed?.maturityAt ?? 0);

  return (
    <div>
      <ViewHead
        label="LIVE DEVNET BOOK"
        title="The book at a glance."
        serif="OpenAI first."
        actions={
          <>
            <button onClick={() => navigate("book")} className="lc-btn lc-btn-ink lc-btn-sm group">
              BROWSE BOOK
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </button>
            <button onClick={() => navigate("create")} className="lc-btn lc-btn-lime lc-btn-sm">
              CREATE OFFER
            </button>
          </>
        }
      />

      {/* market hero */}
      <FadeContent distance={22}>
        <div className="lc-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-5 border-b border-line px-6 py-5">
            <div className="flex items-center gap-4">
              <AssetLogo asset={{ id: "OPENAI", symbol: "OPENAI", name: "OpenAI PreStock", logo: "/logos/openai.webp", refPrice: openai?.markPrice ?? 0, marketPrice: openai?.tokenPrice ?? 0, transferFeeBps: 100, standard: "TOKEN-2022", blurb: "" }} size={52} className="rounded-2xl" />
              <div>
                <p className="font-sans text-[17px] font-semibold tracking-[-0.01em] text-white">
                  OpenAI PreStock
                </p>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                  TOKEN-2022 · 1% TRANSFER FEE
                </p>
              </div>
            </div>
            <span className="lc-chip-ember">
              <TrendingDown className="h-3 w-3" aria-hidden /> SHORTABLE
            </span>
          </div>
          <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {[
              { label: "REFERENCE", node: openai?.markPrice ? <CountUp to={openai.markPrice} prefix="$" separator="," duration={1.4} /> : "unavailable", tone: "muted" },
              { label: "MARKET", node: openai?.tokenPrice ? <CountUp to={openai.tokenPrice} prefix="$" separator="," duration={1.4} delay={0.1} /> : "unavailable", tone: "white" },
              { label: "PREMIUM", node: openai?.premiumPct ? <CountUp to={openai.premiumPct} prefix="+" suffix="%" decimals={1} duration={1.4} delay={0.2} /> : "unavailable", tone: "ember" },
              { label: "FEE / TERM", node: "1% · live term", tone: "muted" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1.5 px-6 py-5 [&:nth-child(odd)]:border-b [&:nth-child(odd)]:border-line sm:[&:nth-child(odd)]:border-b-0">
                <span className="lc-label">{s.label}</span>
                <span
                  className={`font-sans text-[clamp(1.3rem,2vw,1.65rem)] font-semibold tracking-[-0.02em] tabular-nums ${
                    s.tone === "ember"
                      ? "text-ember"
                      : s.tone === "white"
                        ? "text-white"
                        : "text-ink-2"
                  }`}
                >
                  {s.node}
                </span>
              </div>
            ))}
          </div>
          <p className="border-t border-line px-6 py-4 text-[13.5px] leading-[1.6] text-ink-2">
            Live PreStocks mark and token price from the LOCATE API. The mark is not an oracle and is not used for settlement.
          </p>
        </div>
      </FadeContent>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* short supply */}
        <FadeContent delay={0.08} distance={22}>
          <div className="lc-card lc-card-hover flex h-full flex-col p-6">
            <p className="lc-label mb-4">SHORT SUPPLY · OPENAI</p>
            <p className="font-sans text-[clamp(1.8rem,3vw,2.4rem)] font-semibold tracking-[-0.03em] tabular-nums text-white">
              {fmtToken(activeSupply)}
            </p>
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
              BORROWABLE NOW · {activeOffers} LIVE OFFERS
            </p>
            <div className="mt-auto pt-5">
              <button onClick={() => navigate("book")} className="lc-btn lc-btn-ghost lc-btn-sm w-full">
                PRESS AGAINST THE PREMIUM
              </button>
            </div>
          </div>
        </FadeContent>

        {/* active loans */}
        <FadeContent delay={0.14} distance={22}>
          <div className="lc-card lc-card-hover flex h-full flex-col p-6">
            <p className="lc-label mb-4">ACTIVE LOANS</p>
            {myBorrowed && (
              <button
                onClick={() => navigate("loan", myBorrowed.id)}
                className="group text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[12px] font-semibold text-white">
                    {myBorrowed.id} · BORROWED
                  </span>
                  <StatusChip status={myBorrowed.status} />
                </div>
                <p className="mt-2 font-mono text-[22px] font-semibold tabular-nums text-lime-deep transition-colors group-hover:text-white">
                  {borrowedCd.past ? "PAST DUE" : borrowedCd.label}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                  RETURN {fmtToken(myBorrowed.netRequired)} NET OPENAI
                </p>
              </button>
            )}
            {claimable && (
              <button
                onClick={() => navigate("loan", claimable.id)}
                className="mt-5 w-full rounded-xl border border-ember/30 bg-ember-soft p-4 text-left transition-colors hover:border-ember/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[12px] font-semibold text-white">
                    {claimable.id} · LENT
                  </span>
                  <StatusChip status={claimable.status} />
                </div>
                <p className="mt-2 font-mono text-[13px] font-bold text-ember">
                  CLAIM ${claimable.collateralUsdc.toFixed(2)} USDC
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                  GRACE ELAPSED · NOTHING RETURNED
                </p>
              </button>
            )}
            <div className="mt-auto pt-5">
              <button onClick={() => navigate("loans")} className="lc-btn lc-btn-ghost lc-btn-sm w-full">
                ALL LOANS
              </button>
            </div>
          </div>
        </FadeContent>

        {/* receipts */}
        <FadeContent delay={0.2} distance={22}>
          <div className="lc-card lc-card-hover flex h-full flex-col p-6">
            <p className="lc-label mb-4">SETTLEMENT INPUTS</p>
            <DataRow label="ORACLE" value="NONE" tone="accent" />
            <DataRow label="LIQUIDATION ENGINE" value="NONE" tone="accent" />
            <DataRow label="TRIGGER" value="TIME + DELIVERY" tone="strong" />
            <DataRow label="COLLATERAL" value="USDC · LOCKED" />
            <div className="mt-auto pt-5">
              <button onClick={() => navigate("verify")} className="lc-btn lc-btn-ghost lc-btn-sm w-full">
                PROOF ROOM
              </button>
            </div>
          </div>
        </FadeContent>
      </div>

      {/* supply discovery note */}
      <FadeContent delay={0.25} distance={18}>
        <motion.div
          className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-lime/20 bg-lime-soft px-5 py-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="lc-chip-lime">SUPPLY DISCOVERY</span>
          <p className="text-[13px] leading-[1.55] text-ink-2">
            Every offer listed is real deliverable supply — tokens that exist,
            with terms attached. Premiums compress when shorts can finally borrow.
          </p>
        </motion.div>
      </FadeContent>
    </div>
  );
}
