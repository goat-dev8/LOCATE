"use client";

/**
 * CancelOfferDrawer — withdraw one of your live listings. Free, instant, and
 * the tokens never left the wallet.
 */

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { cancelOnChain } from "@/lib/locate/tx";
import { useLocate, locateAsset } from "@/lib/locate/store";
import { fmtToken, fmtUsd } from "@/lib/locate/seed";
import { ClickSpark } from "@/components/bits";
import { useDrawerFlow } from "../hooks";
import { DataRow, DoneState, Note, Payline, StagedProgress } from "../parts";
import { ActionDrawer } from "./frame";

const STEPS = ["WITHDRAW LISTING", "CONFIRMED"];

export function CancelOfferDrawer({
  offerId,
  open,
  onOpenChange,
}: {
  offerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ActionDrawer
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="CANCEL OFFER"
      title={offerId ?? ""}
      description="Withdraw this listing from the book. Your tokens never left your wallet."
    >
      {offerId && <Body offerId={offerId} onClose={() => onOpenChange(false)} />}
    </ActionDrawer>
  );
}

function Body({ offerId, onClose }: { offerId: string; onClose: () => void }) {
  const offer = useLocate((s) => s.offers.find((o) => o.id === offerId));
  const navigate = useLocate((s) => s.navigate);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const flow = useDrawerFlow(STEPS.length, 560);

  if (!offer) {
    return (
      <DoneState title="OFFER UNAVAILABLE" body="This listing is no longer on the book.">
        <button type="button" className="lc-btn lc-btn-ghost lc-btn-sm" onClick={onClose}>
          CLOSE
        </button>
      </DoneState>
    );
  }

  const asset = locateAsset(offer.assetId)!;
  const cancellable = offer.isYours && offer.status === "ACTIVE";

  return (
    <>
      {flow.stage === "review" && (
        <div className="flex flex-col gap-1">
          <DataRow label="OFFER" value={offer.id} />
          <DataRow label="ASSET" value={`${asset.symbol} · ${asset.standard}`} />
          <DataRow label="AMOUNT" value={`${fmtToken(offer.amount)} ${asset.symbol}`} />
          <DataRow label="COLLATERAL ASKED" value={fmtUsd(offer.collateralUsdc)} tone="muted" />
          <DataRow label="STATUS" value={offer.status} tone={cancellable ? "lime" : "muted"} />

          <div className="mt-4">
            <Payline
              label="CANCEL COST · NOTHING LEAVES THE WALLET"
              value={fmtUsd(0)}
              variant="total"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {flow.error && <Note tone="refuse">{flow.error.toUpperCase()}</Note>}
            <Note tone="lime">
              YOUR TOKENS NEVER LEFT YOUR WALLET — CANCEL IS FREE AND INSTANT.
            </Note>
          </div>

          <div className="mt-6">
            <ClickSpark sparkColor="#46600A">
              <button
                type="button"
                disabled={!cancellable}
                onClick={() => {
                  if (!publicKey) {
                    flow.run(async () => ({ ok: false, error: "Connect a Devnet wallet." }));
                    return;
                  }
                  void flow.run(() => cancelOnChain(connection, publicKey, sendTransaction, offer));
                }}
                className={
                  "lc-btn lc-btn-ink w-full" +
                  (!cancellable ? " pointer-events-none opacity-40" : "")
                }
              >
                CONFIRM · CANCEL LISTING
              </button>
            </ClickSpark>
            <button
              type="button"
              className="lc-btn lc-btn-ghost lc-btn-sm mt-2.5 w-full"
              onClick={onClose}
            >
              KEEP IT LISTED
            </button>
          </div>
        </div>
      )}

      {flow.stage === "busy" && (
        <div className="pt-4">
          <p className="lc-label mb-5">WITHDRAWING…</p>
          <StagedProgress steps={STEPS} activeIndex={flow.step} />
        </div>
      )}

      {flow.stage === "done" && (
        <DoneState
          title="OFFER CANCELLED"
          body={`${fmtToken(offer.amount)} ${asset.symbol} stays in your wallet — the listing is off the book.`}
        >
          <button
            type="button"
            className="lc-btn lc-btn-ink lc-btn-sm"
            onClick={() => {
              onClose();
              navigate("offers");
            }}
          >
            VIEW MY OFFERS
          </button>
          <button
            type="button"
            className="lc-btn lc-btn-ghost lc-btn-sm"
            onClick={onClose}
          >
            CLOSE
          </button>
        </DoneState>
      )}
    </>
  );
}
