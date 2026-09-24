"use client";

/**
 * LOCATE — TakeOfferDrawer: lock USDC, receive net tokens.
 */

import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { DEVNET_USDC, LOCATE_PROGRAM_ID, buildTakeTx } from "@locate/sdk";
import { submitInstructions } from "@/lib/locate/tx";
import { useLocate } from "@/lib/locate/store";
import { ASSETS, fmtUsd, fmtToken, netFromGross, premium } from "@/lib/locate/seed";
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
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [stage, setStage] = useState<"review" | "busy" | "done">("review");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [newLoanId, setNewLoanId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const asset = ASSETS.find((a) => a.id === offer.assetId)!;
  const net = netFromGross(offer.amount, asset.transferFeeBps);
  const total = offer.collateralUsdc + offer.feeUsdc;

  const confirm = async () => {
    if (!publicKey || !offer.mint || !offer.nonce || !offer.amountRaw || !offer.collateralRaw || !offer.feeRaw || !offer.termSecs || !offer.graceSecs || !offer.expiresAtSec) {
      setError("Connect a Devnet wallet. This offer has no on-chain terms.");
      return;
    }
    setStage("busy");
    setError(null);
    const result = await submitInstructions(connection, publicKey, sendTransaction, buildTakeTx(publicKey, {
      lender: new PublicKey(offer.lender),
      mint: new PublicKey(offer.mint),
      usdcMint: DEVNET_USDC,
      nonce: BigInt(offer.nonce),
      amountRaw: BigInt(offer.amountRaw),
      collateralUsdc: BigInt(offer.collateralRaw),
      feeUsdc: BigInt(offer.feeRaw),
      termSecs: BigInt(offer.termSecs),
      graceSecs: BigInt(offer.graceSecs),
      expiresAt: BigInt(offer.expiresAtSec),
      decimals: 9,
    }, LOCATE_PROGRAM_ID));
    if (result.ok) {
      setNewLoanId(result.signature);
      setVerified(result.verified);
      setStage("done");
    } else {
      setError(result.simulated ? `Simulation — not a transaction. ${result.error}` : result.error);
      setStage("review");
    }
  };

  return (
    <>
        <SheetHeader className="space-y-1 border-b border-line px-6 pb-4 pt-6">
          <SheetTitle className="flex items-center gap-2.5 font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-white">
            <span className="inline-block h-[7px] w-[7px] rounded-[2px] bg-lime" aria-hidden />
            TAKE OFFER
          </SheetTitle>
          <SheetDescription className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            {offer.id} · {asset.symbol} · {premium(asset.refPrice, asset.marketPrice) >= 0 ? "+" : ""}
            {premium(asset.refPrice, asset.marketPrice).toFixed(1)}% PREMIUM
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-5">
          {stage === "review" && (
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
              <DataRow label="YOU RECEIVE NET" value={`${fmtToken(net)} ${asset.symbol}`} tone="accent" />
              <DataRow label="COLLATERAL LOCKED" value={fmtUsd(offer.collateralUsdc)} />
              <DataRow label="UPFRONT FEE" value={fmtUsd(offer.feeUsdc)} />
              <DataRow label="TERM" value={`${offer.termDays} DAYS + 48H GRACE`} />
              <DataRow
                label="RETURN REQUIREMENT"
                value={`${fmtToken(offer.amount)} NET`}
                tone="strong"
              />

              <Payline label="TOTAL LOCKED AT TAKE" value={fmtUsd(total)} variant="light" />

              {error && (
                <p className="mt-4 rounded-xl border border-refuse/30 bg-refuse-soft px-4 py-3 font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.1em] text-refuse">
                  {error}
                </p>
              )}

              <p className="mt-4 text-[12.5px] leading-[1.6] text-ink-2">
                The tokens leave the lender&apos;s wallet only now. Your obligation:
                return {fmtToken(offer.amount)} net {asset.symbol} before maturity
                plus grace — or the collateral is claimed.
              </p>

              <button
                onClick={confirm}
                className="lc-btn lc-btn-lime mt-5 w-full disabled:pointer-events-none disabled:opacity-40"
              >
                CONFIRM — LOCK &amp; BORROW
              </button>
            </>
          )}

          {stage === "busy" && (
            <div className="py-6">
              <StagedProgress steps={STAGES} activeIndex={step} />
            </div>
          )}

          {stage === "done" && (
            <DoneState
              title={verified ? "Verified on-chain" : "Confirmed"}
              body={verified ? `Signature ${newLoanId}` : `Confirmed on Devnet. Receipt verification is still pending. Signature ${newLoanId}`}
            >
              <button
                onClick={() => {
                  onClose();
                  navigate("loan", newLoanId ?? undefined);
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
