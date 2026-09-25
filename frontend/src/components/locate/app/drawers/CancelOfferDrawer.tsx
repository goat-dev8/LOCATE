"use client";

/**
 * CancelOfferDrawer — withdraw one of your live listings. Free, instant, and
 * the tokens never left the wallet.
 */

import { cancelInstructions } from "@/lib/locate/tx";
import { phaseCopy, usePreparedTx } from "@/lib/locate/usePreparedTx";
import { TxSteps } from "../TxSteps";
import { useLocate, locateAsset } from "@/lib/locate/store";
import { fmtToken, fmtUsd } from "@/lib/locate/seed";
import { ClickSpark } from "@/components/bits";
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
  const tx = usePreparedTx();

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
      {(tx.phase === "review" || tx.phase === "ready") && (
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
            {tx.error && <Note tone="refuse">{tx.error.toUpperCase()}</Note>}
            {tx.phase === "ready" && (
              <Note tone="ink">SIMULATION PASSED. NO TRANSACTION WAS SENT. APPROVE IN PHANTOM TO CANCEL.</Note>
            )}
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
                  if (tx.phase === "ready") {
                    void tx.approve();
                    return;
                  }
                  const built = cancelInstructions(offer);
                  if (!built) return;
                  void tx.simulate(built);
                }}
                className={
                  "lc-btn lc-btn-ink w-full" +
                  (!cancellable ? " pointer-events-none opacity-40" : "")
                }
              >
                {tx.phase === "ready" ? "APPROVE IN PHANTOM" : "SIMULATE CANCEL"}
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

      {(tx.phase === "simulating" || tx.phase === "signing" || tx.phase === "confirming") && (
        <div className="pt-4">
          <TxSteps phase={tx.phase} />
          <p className="lc-label mb-5">{phaseCopy(tx.phase)}{tx.phase === "confirming" && tx.signature ? <span className="mt-2 block break-all font-mono text-[12px] normal-case tracking-normal text-white">{tx.signature}</span> : null}</p>
          <StagedProgress steps={STEPS} activeIndex={tx.phase === "simulating" ? 0 : 1} />
        </div>
      )}

      {tx.phase === "done" && (
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
