"use client";

/**
 * LOCATE — 06 · the workspace: dark app-UI previews on 3D tilt cards.
 * Real product surfaces floating on the dark canvas.
 * The lender card shows the live OpenAI price. The borrower card shows a
 * funded Devnet offer, or 0 borrowable when the book is empty.
 */

import { ArrowUpRight, Check, Lock } from "lucide-react";
import { FadeContent, TiltedCard } from "@/components/bits";
import { OPENAI_MARK } from "@/lib/locate/seed";
import { useLiveMarket, type LiveRow } from "@/lib/locate/useLiveMarket";
import { AssetLogo, Eyebrow, RevealHeadline, Section } from "./parts";

const OPENAI = OPENAI_MARK;

function fmtPremium(pct: number): string {
  return `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`;
}

function MiniRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[#232326] py-2.5 last:border-b-0">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">
        {label}
      </span>
      <span
        className={`font-mono text-[12.5px] tabular-nums ${
          strong ? "font-bold text-white" : "text-ink-2"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function rawUnits(raw: string, decimals: number): string {
  if (!/^\d+$/.test(raw)) return "unavailable";
  const scale = 10n ** BigInt(decimals);
  const value = BigInt(raw);
  const whole = value / scale;
  const frac = (value % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

function LenderPreview({ price }: { price: string }) {
  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#232326] bg-[#141416] text-left">
      <div className="flex items-center justify-between border-b border-[#232326] px-5 py-3.5">
        <span className="flex items-center gap-2">
          <span className="inline-block h-[7px] w-[7px] rounded-[2px] bg-lime" aria-hidden />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white">
            CREATE OFFER
          </span>
        </span>
        <span className="flex items-center gap-2">
          <AssetLogo asset={OPENAI} size={22} className="rounded-md" />
          <span className="lc-chip">OPENAI</span>
        </span>
      </div>
      <div className="px-5 py-2">
        <MiniRow label="LIVE OPENAI" value={price} strong />
        <MiniRow label="TERMS" value="set in the app" />
        <MiniRow label="TOKENS" value="stay until take" />
      </div>
      <div className="px-5 pb-2">
        <p className="rounded-xl border border-lime/25 bg-lime-soft px-4 py-3 font-mono text-[10px] font-medium uppercase leading-relaxed tracking-[0.1em] text-lime-deep">
          You keep your tokens until the offer is taken.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#232326] bg-[#101012] px-5 py-3.5">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          <Lock className="h-3 w-3" aria-hidden /> NO TRANSFER YET
        </span>
        <span className="lc-btn lc-btn-ink lc-btn-sm">LIST OFFER</span>
      </div>
    </div>
  );
}

function BorrowerPreview({ row }: { row: LiveRow | undefined }) {
  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#232326] bg-[#141416] text-left">
      <div className="flex items-center justify-between border-b border-[#232326] px-5 py-3.5">
        <span className="flex items-center gap-2">
          <span className="inline-block h-[7px] w-[7px] rounded-[2px] bg-ember" aria-hidden />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white">
            BORROWABLE PRESTOCKS
          </span>
        </span>
        <span className="lc-chip">{row?.bestOffer ? "FUNDED OFFER" : "0 BORROWABLE"}</span>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <AssetLogo asset={OPENAI} size={38} className="rounded-xl" />
            <div>
              <p className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-white">
                OPENAI
              </p>
              <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
                {row?.bestOffer
                  ? `${rawUnits(row.bestOffer.amountRaw, 9)} · ${rawUnits(row.bestOffer.collateralUsdc, 6)} USDC`
                  : "No funded Devnet offer"}
              </p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            {row?.premiumPct != null && (
              <span className="lc-chip-ember tabular-nums">{fmtPremium(row.premiumPct)}</span>
            )}
          </span>
        </div>
        <div className="mt-4 rounded-xl border border-[#232326] bg-[#101012] px-4 py-3">
          <MiniRow label="COLLATERAL" value={row?.bestOffer ? rawUnits(row.bestOffer.collateralUsdc, 6) + " USDC" : "none"} strong />
          <MiniRow label="FEE" value={row?.bestOffer ? rawUnits(row.bestOffer.feeUsdc, 6) + " USDC" : "none"} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#232326] bg-[#101012] px-5 py-3.5">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          <Check className="h-3 w-3 text-lime-deep" aria-hidden /> NET COMPUTED BEFORE SIGN
        </span>
        <span className="lc-btn lc-btn-lime lc-btn-sm group">
          TAKE OFFER
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

export function UIPreviews() {
  const live = useLiveMarket();
  const openaiRow = live.bySymbol("OPENAI");

  return (
    <Section>
      <div className="mx-auto max-w-3xl text-center">
        <FadeContent>
          <Eyebrow index="06" label="The workspace" className="justify-center" />
        </FadeContent>
        <RevealHeadline
          className="lc-display mt-6 text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.06]"
          segments={[
            { text: "One workspace." },
            { text: "Both sides", serif: true },
            { text: "of the trade." },
          ]}
        />
        <FadeContent delay={0.25}>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.7] text-ink-2">
            No dashboard maze, no twenty pages. One surface where you lend, borrow,
            return, and verify — with every number explained before you commit.
          </p>
        </FadeContent>
      </div>

      <div className="mt-14 grid items-center gap-10 sm:gap-8 lg:grid-cols-2">
        <FadeContent delay={0.1} distance={40} duration={0.9}>
          <div className="flex flex-col items-center gap-5">
            <span className="lc-chip">LENDER VIEW</span>
            <TiltedCard rotationAmount={7} scale={1.03} className="w-full">
              <div className="flex justify-center px-2 py-6">
                <LenderPreview price={openaiRow?.tokenPrice != null ? "$" + Math.round(openaiRow.tokenPrice).toLocaleString("en-US") : "unavailable"} />
              </div>
            </TiltedCard>
            <p className="max-w-sm text-center text-[13.5px] leading-[1.6] text-ink-2">
              Set terms in one focused panel. A clear final summary — collateral,
              fee, term — confirms the listing before anything moves.
            </p>
          </div>
        </FadeContent>

        <FadeContent delay={0.2} distance={40} duration={0.9}>
          <div className="flex flex-col items-center gap-5">
            <span className="lc-chip">BORROWER VIEW</span>
            <TiltedCard rotationAmount={7} scale={1.03} className="w-full">
              <div className="flex justify-center px-2 py-6">
                <BorrowerPreview row={openaiRow} />
              </div>
            </TiltedCard>
            <p className="max-w-sm text-center text-[13.5px] leading-[1.6] text-ink-2">
              The book shows funded Devnet offers. An empty book is 0 borrowable, not a sample price.
            </p>
          </div>
        </FadeContent>
      </div>
    </Section>
  );
}
