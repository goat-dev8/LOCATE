"use client";

/**
 * BuyReturnDrawer — settle a borrowed loan: cover any token shortfall at the
 * market price, send the fee-aware gross, and get the receipt verified.
 */

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { returnOnChain } from "@/lib/locate/tx";
import { useLocate, locateAsset } from "@/lib/locate/store";
import { fmtToken, fmtUsd, grossForNet } from "@/lib/locate/seed";
import { ClickSpark } from "@/components/bits";
import { useDrawerFlow } from "../hooks";
import { DataRow, DoneState, Note, Payline, StagedProgress } from "../parts";
import { ActionDrawer } from "./frame";

export function BuyReturnDrawer({
  loanId,
  open,
  onOpenChange,
}: {
  loanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ActionDrawer
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="BUY & RETURN"
      title={loanId}
      description="Review the cover cost and confirm to return the net tokens and release your collateral."
    >
      <Body loanId={loanId} onClose={() => onOpenChange(false)} />
    </ActionDrawer>
  );
}

function Body({ loanId, onClose }: { loanId: string; onClose: () => void }) {
  const loan = useLocate((s) => s.loans.find((l) => l.id === loanId));
  const tokenBalances = useLocate((s) => s.tokenBalances);
  const navigate = useLocate((s) => s.navigate);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const asset = loan ? locateAsset(loan.assetId) : undefined;
  const gross = loan && asset ? grossForNet(loan.netRequired, asset.transferFeeBps) : 0;
  const held = loan ? (tokenBalances[loan.assetId] ?? 0) : 0;
  const shortfall = Math.max(0, gross - held);
  const coverCost = asset ? shortfall * asset.marketPrice : 0;

  const steps =
    shortfall > 0
      ? ["BUY SHORTFALL", "DELIVER NET", "VERIFY RETURN"]
      : ["SEND GROSS", "VERIFY DELIVERY", "RELEASE COLLATERAL"];
  const flow = useDrawerFlow(steps.length, 520);

  if (!loan || !asset) {
    return (
      <DoneState title="LOAN UNAVAILABLE" body="This loan is no longer open.">
        <button type="button" className="lc-btn lc-btn-ghost lc-btn-sm" onClick={onClose}>
          CLOSE
        </button>
      </DoneState>
    );
  }

  return (
    <>
      {flow.stage === "review" && (
        <div className="flex flex-col gap-1">
          <DataRow
            label="NET REQUIRED"
            value={`${fmtToken(loan.netRequired)} ${asset.symbol}`}
            tone="lime"
          />
          <DataRow
            label="GROSS TO SEND"
            value={`${fmtToken(gross)} ${asset.symbol}`}
          />
          <DataRow
            label="HELD IN WALLET"
            value={`${fmtToken(held)} ${asset.symbol}`}
            tone="muted"
          />
          <DataRow
            label="SHORTFALL"
            value={
              shortfall > 0
                ? `${fmtToken(shortfall)} ${asset.symbol}`
                : `NONE`
            }
            tone={shortfall > 0 ? "refuse" : "muted"}
          />
          {shortfall > 0 && (
            <DataRow
              label="ESTIMATED COVER COST"
              value={fmtUsd(coverCost)}
              tone="ember"
            />
          )}

          <div className="mt-4">
            <Payline
              label="COVER COST AT MARKET"
              value={fmtUsd(coverCost)}
              variant="total"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {flow.error && <Note tone="refuse">{flow.error.toUpperCase()}</Note>}
            {shortfall > 0 ? (
              <Note tone="ember">
                WALLET HOLDS {fmtToken(held)} OF {fmtToken(gross)}{" "}
                {asset.symbol} GROSS — THE REST IS FILLED AT MARKET.
              </Note>
            ) : (
              <Note tone="lime">WALLET COVERS FULL RETURN.</Note>
            )}
            <Note tone="ink">
              COLLATERAL RELEASED ON VERIFY: {fmtUsd(loan.collateralUsdc)}.
            </Note>
          </div>

          <div className="mt-6">
            <ClickSpark sparkColor="#46600A">
              <button
                type="button"
                onClick={() => {
                  if (!publicKey || !loan) return;
                  void flow.run(() => returnOnChain(connection, publicKey, sendTransaction, loan));
                }}
                className="lc-btn lc-btn-lime w-full"
              >
                CONFIRM · RETURN
              </button>
            </ClickSpark>
            <button
              type="button"
              className="lc-btn lc-btn-ghost lc-btn-sm mt-2.5 w-full"
              onClick={onClose}
            >
              NOT NOW
            </button>
          </div>
        </div>
      )}

      {flow.stage === "busy" && (
        <div className="pt-4">
          <p className="lc-label mb-5">SETTLING ON THE RAIL…</p>
          <StagedProgress steps={steps} activeIndex={flow.step} />
        </div>
      )}

      {flow.stage === "done" && (
        <DoneState
          title="RETURN VERIFIED — COLLATERAL RELEASED"
          body={`Full net delivery of ${fmtToken(loan.netRequired)} ${asset.symbol} confirmed. ${fmtUsd(
            loan.collateralUsdc,
          )} USDC is back in your wallet.`}
        >
          <ClickSpark sparkColor="#46600A">
            <button
              type="button"
              className="lc-btn lc-btn-ink lc-btn-sm"
              onClick={() => {
                onClose();
                navigate("verify");
              }}
            >
              VIEW RECEIPT
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
