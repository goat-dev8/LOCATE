"use client";

/**
 * LOCATE — TakeOfferDrawer: lock USDC, receive net tokens.
 */

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useWallet } from "@solana/wallet-adapter-react";
import { ILLUSTRATIVE, quoteEconomics } from "@locate/sdk";
import { takeInstructions } from "@/lib/locate/tx";
import { phaseCopy, usePreparedTx } from "@/lib/locate/usePreparedTx";
import { useLocate } from "@/lib/locate/store";
import { ASSETS, fmtUsd, fmtToken, formatDuration, netFromGross } from "@/lib/locate/seed";
import { locateApi } from "@/lib/locate/env";
import { useLiveMarket } from "@/lib/locate/useLiveMarket";
import type { Offer } from "@/lib/locate/types";
import { AssetLogo } from "../../landing/parts";
import { DoneState, DataRow, Payline, StagedProgress } from "../parts";

const STAGES = ["LOCK COLLATERAL + FEE", "TRANSFER TOKENS", "DELIVERED TO WALLET"];

export function TakeOfferDrawer({
  offer,
  onClose,
}: {
  offer: Offer | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={!!offer}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-line bg-background p-0 sm:max-w-md"
      >
        {offer && <TakeOfferInner key={offer.id} offer={offer} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function TakeOfferInner({
  offer,
  onClose,
}: {
  offer: Offer;
  onClose: () => void;
}) {
  const navigate = useLocate((s) => s.navigate);
  const { publicKey } = useWallet();
  const tx = usePreparedTx();
  const live = useLiveMarket();
  const row = live.bySymbol(offer.assetId);
  const [economics, setEconomics] = useState<Record<string, unknown> | null>(null);
  const [breakEven, setBreakEven] = useState("Break-even unavailable");
  const [thesisKind, setThesisKind] = useState<"premium_compression" | "skip">("skip");

  useEffect(() => {
    let alive = true;
    locateApi
      .offerEconomics(offer.id)
      .then((facts) => {
        if (!alive) return;
        setEconomics(facts);
        const quoted = quoteEconomics({
          receivedRaw: BigInt(String(facts.receivedRaw ?? 0)),
          returnGrossRaw: BigInt(String(facts.returnGrossRaw ?? 0)),
          feeUsdc: BigInt(String(facts.maxLossUsdc ?? facts.collateralUsdc ?? 0)),
          proceedsMin: null,
          buyOut: null,
          quoteAgeMs: 0,
        });
        setBreakEven(quoted.breakeven ? `${quoted.breakeven.dropBps.toString()} bps` : "Break-even unavailable");
      })
      .catch(() => {
        if (alive) {
          setEconomics(null);
          setBreakEven("Break-even unavailable");
        }
      });
    return () => {
      alive = false;
    };
  }, [offer.id]);

  const asset = ASSETS.find((a) => a.id === offer.assetId)!;
  const net = netFromGross(offer.amount, asset.transferFeeBps);
  const total = offer.collateralUsdc + offer.feeUsdc;

  const confirm = async () => {
    if (!publicKey) {
      return;
    }
    if (thesisKind !== "skip") {
      try {
        await locateApi.postThesis({
          wallet: publicKey.toBase58(),
          mint: offer.mint ?? "",
          offer: offer.id,
          kind: "premium_compression",
          note: "Optional non-binding thesis. Does not change take bytes.",
          acknowledgedNonBinding: true,
        });
      } catch {
        /* thesis is optional; take still proceeds */
      }
    }
    await tx.simulate(takeInstructions(publicKey, offer));
  };

  return (
    <>
        <SheetHeader className="space-y-1 border-b border-line px-6 pb-4 pt-6">
          <SheetTitle className="flex items-center gap-2.5 font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-white">
            <span className="inline-block h-[7px] w-[7px] rounded-[2px] bg-lime" aria-hidden />
            TAKE OFFER
          </SheetTitle>
          <SheetDescription className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            {offer.id} · {asset.symbol} · {row?.premiumPct == null ? "PREMIUM UNAVAILABLE" : `${row.premiumPct >= 0 ? "+" : ""}${row.premiumPct.toFixed(1)}% PREMIUM`}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-5">
          {(tx.phase === "review" || tx.phase === "ready") && (
            <>
              <div className="mb-5 flex items-center gap-3.5 rounded-xl border border-line bg-cream p-4">
                <AssetLogo asset={asset} size={44} className="rounded-xl" />
                <div>
                  <p className="font-sans text-[15px] font-semibold text-white">
                    {asset.symbol}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                    TOKEN-2022 · {asset.transferFeeBps / 100}% FEE
                  </p>
                </div>
              </div>

              <DataRow label="AMOUNT OFFERED" value={`${fmtToken(offer.amount)} ${asset.symbol}`} />
              <DataRow label="YOU RECEIVE NET" value={`${fmtToken(net, 6)} ${asset.symbol}`} tone="accent" />
              <DataRow label="COLLATERAL LOCKED" value={fmtUsd(offer.collateralUsdc)} />
              <DataRow label="UPFRONT FEE" value={fmtUsd(offer.feeUsdc)} />
              <DataRow label="TERM" value={`${formatDuration(Number(offer.termSecs ?? offer.termDays * 86_400))} + ${formatDuration(Number(offer.graceSecs ?? 48 * 3600))} GRACE`} />
              <DataRow
                label="RETURN REQUIREMENT"
                value={`${fmtToken(offer.amount)} NET`}
                tone="strong"
              />

              <Payline label="TOTAL LOCKED AT TAKE" value={fmtUsd(total)} variant="light" />

              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">WHY SHORT</p>
              <DataRow label="RECEIVED RAW" value={economics?.receivedRaw ? String(economics.receivedRaw) : "unavailable"} />
              <DataRow label="RETURN GROSS" value={economics?.returnGrossRaw ? String(economics.returnGrossRaw) : "unavailable"} />
              <DataRow label="BREAK-EVEN" value={breakEven} />
              <p className="mt-2 font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.1em] text-ink-3">
                {ILLUSTRATIVE} Jupiter quotes are not used on Devnet.
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setThesisKind("skip")}
                  className={thesisKind === "skip" ? "lc-btn lc-btn-ink lc-btn-sm" : "lc-btn lc-btn-ghost lc-btn-sm"}
                >
                  SKIP THESIS
                </button>
                <button
                  type="button"
                  onClick={() => setThesisKind("premium_compression")}
                  className={thesisKind === "premium_compression" ? "lc-btn lc-btn-ink lc-btn-sm" : "lc-btn lc-btn-ghost lc-btn-sm"}
                >
                  PREMIUM COMPRESSION
                </button>
              </div>

              {tx.phase === "ready" && !tx.error && (
                <p className="mt-4 rounded-xl border border-line bg-cream px-4 py-3 font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.1em] text-ink-2">
                  Simulation passed. No transaction was sent. Approve in Phantom to borrow.
                </p>
              )}

              {tx.error && (
                <p className="mt-4 rounded-xl border border-refuse/30 bg-refuse-soft px-4 py-3 font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.1em] text-refuse">
                  {tx.error}
                </p>
              )}

              <p className="mt-4 text-[12.5px] leading-[1.6] text-ink-2">
                The tokens leave the lender&apos;s wallet only now. Your obligation:
                return {fmtToken(offer.amount)} net {asset.symbol} before maturity
                plus grace — or the collateral is claimed.
              </p>

              {tx.phase === "review" ? (
                <button
                  onClick={confirm}
                  className="lc-btn lc-btn-lime mt-5 w-full disabled:pointer-events-none disabled:opacity-40"
                >
                  SIMULATE BORROW
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void tx.approve()}
                  className="lc-btn lc-btn-lime mt-5 w-full"
                >
                  APPROVE IN PHANTOM
                </button>
              )}
            </>
          )}

          {(tx.phase === "simulating" || tx.phase === "signing" || tx.phase === "confirming") && (
            <div className="py-6">
              <p className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                {phaseCopy(tx.phase)}
                {tx.phase === "confirming" && tx.signature ? ` ${tx.signature}` : ""}
              </p>
              <StagedProgress steps={STAGES} activeIndex={tx.phase === "simulating" ? 0 : tx.phase === "signing" ? 1 : 2} />
            </div>
          )}

          {tx.phase === "done" && (
            <DoneState
              title={tx.verified ? "Verified on-chain" : "Confirmed"}
              body={tx.verified ? `Signature ${tx.signature}` : `Confirmed on Devnet. Receipt verification is still pending. Signature ${tx.signature}`}
            >
              <button
                onClick={() => {
                  onClose();
                  navigate("loans");
                }}
                className="lc-btn lc-btn-ink lc-btn-sm"
              >
                VIEW LOAN
              </button>
              <button
                onClick={onClose}
                className="lc-btn lc-btn-ghost lc-btn-sm"
              >
                STAY IN BOOK
              </button>
            </DoneState>
          )}
        </div>
    </>
  );
}
