"use client";

/**
 * ConfirmOfferDrawer — final review before a listing goes live: the exact
 * terms, the collateralization, and the tokens at risk until settlement.
 */

import { useLocate, locateAsset } from "@/lib/locate/store";
import { fmtToken, fmtUsd } from "@/lib/locate/seed";
import type { CreateOfferInput } from "@/lib/locate/types";
import { ClickSpark } from "@/components/bits";
import { useDrawerFlow } from "../hooks";
import { DataRow, DoneState, Note, Payline, StagedProgress } from "../parts";
import { ActionDrawer } from "./frame";

const STEPS = ["SIGN LISTING", "POST TO BOOK", "LIVE"];

export function ConfirmOfferDrawer({
  input,
  open,
  onOpenChange,
}: {
  input: CreateOfferInput;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ActionDrawer
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="LIST OFFER"
      title={`${fmtToken(input.amount)} ${input.assetId}`}
      description="Final review of the listing terms before it goes live on the book."
    >
      <Body input={input} onClose={() => onOpenChange(false)} />
    </ActionDrawer>
  );
}

function Body({
  input,
  onClose,
}: {
  input: CreateOfferInput;
  onClose: () => void;
}) {
  const createOffer = useLocate((s) => s.createOffer);
  const navigate = useLocate((s) => s.navigate);
  const flow = useDrawerFlow(STEPS.length, 520);

  const asset = locateAsset(input.assetId)!;
  const collateralization =
    (input.collateralUsdc / (input.amount * asset.marketPrice)) * 100;

  return (
    <>
      {flow.stage === "review" && (
        <div className="flex flex-col gap-1">
          <DataRow label="ASSET" value={`${asset.symbol} · ${asset.standard}`} />
          <DataRow label="AMOUNT" value={`${fmtToken(input.amount)} ${asset.symbol}`} />
          <DataRow label="COLLATERAL" value={fmtUsd(input.collateralUsdc)} />
          <DataRow label="UPFRONT FEE" value={fmtUsd(input.feeUsdc)} />
          <DataRow label="TERM" value={`${input.termDays} DAYS`} />
          <DataRow label="LISTING EXPIRY" value={`${input.expiryHours}H`} />
          <DataRow
            label="COLLATERALIZATION"
            value={`${Math.round(collateralization)}%`}
            tone={collateralization < 150 ? "ember" : "lime"}
          />

          <div className="mt-4">
            <Payline
              label="YOUR TOKENS AT RISK · UNTIL SETTLED"
              value={`${fmtToken(input.amount)} ${asset.symbol}`}
              variant="total"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {flow.error && <Note tone="refuse">{flow.error.toUpperCase()}</Note>}
            <Note tone="lime">
              YOU KEEP YOUR TOKENS UNTIL THE OFFER IS TAKEN.
            </Note>
            <Note tone="ink">
              IF THE BORROWER DEFAULTS, YOU CLAIM {fmtUsd(input.collateralUsdc)}.
            </Note>
          </div>

          <div className="mt-6">
            <ClickSpark sparkColor="#46600A">
              <button
                type="button"
                onClick={() => void flow.run(() => createOffer(input))}
                className="lc-btn lc-btn-ink w-full"
              >
                CONFIRM · LIST OFFER
              </button>
            </ClickSpark>
            <button
              type="button"
              className="lc-btn lc-btn-ghost lc-btn-sm mt-2.5 w-full"
              onClick={onClose}
            >
              KEEP EDITING
            </button>
          </div>
        </div>
      )}

      {flow.stage === "busy" && (
        <div className="pt-4">
          <p className="lc-label mb-5">LISTING ON THE BOOK…</p>
          <StagedProgress steps={STEPS} activeIndex={flow.step} />
        </div>
      )}

      {flow.stage === "done" && (
        <DoneState
          title="OFFER LISTED"
          body={`${fmtToken(input.amount)} ${asset.symbol} is borrowable for ${input.termDays} days at ${fmtUsd(
            input.collateralUsdc,
          )} collateral and a ${fmtUsd(input.feeUsdc)} upfront fee. You keep the tokens until a taker fills it.`}
        >
          <ClickSpark sparkColor="#46600A">
            <button
              type="button"
              className="lc-btn lc-btn-lime lc-btn-sm"
              onClick={() => {
                onClose();
                navigate("offers");
              }}
            >
              VIEW MY OFFERS
            </button>
          </ClickSpark>
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
