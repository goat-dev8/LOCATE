"use client";

/**
 * ClaimDrawer — the lender's remedy after grace: claim the locked collateral
 * and forfeit the borrower's tokens. Final action, ember-framed.
 */

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { claimInstructions, simulateEarlyClaim } from "@/lib/locate/tx";
import { phaseCopy, usePreparedTx } from "@/lib/locate/usePreparedTx";
import { useLocate, locateAsset } from "@/lib/locate/store";
import { fmtToken, fmtUsd, formatDuration } from "@/lib/locate/seed";
import { ClickSpark } from "@/components/bits";
import { DataRow, DoneState, Note, Payline, StagedProgress } from "../parts";
import { ActionDrawer } from "./frame";

const STEPS = ["VERIFY DEFAULT", "TRANSFER COLLATERAL"];

export function ClaimDrawer({
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
      eyebrow="CLAIM COLLATERAL"
      title={loanId}
      description="Claim the borrower's locked USDC collateral after the grace window elapsed."
    >
      <Body loanId={loanId} onClose={() => onOpenChange(false)} />
    </ActionDrawer>
  );
}

function Body({ loanId, onClose }: { loanId: string; onClose: () => void }) {
  const loan = useLocate((s) => s.loans.find((l) => l.id === loanId));
  const navigate = useLocate((s) => s.navigate);
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [simNote, setSimNote] = useState<string | null>(null);
  const tx = usePreparedTx();

  if (!loan) {
    return (
      <DoneState title="LOAN UNAVAILABLE" body="This loan is no longer open.">
        <button type="button" className="lc-btn lc-btn-ghost lc-btn-sm" onClick={onClose}>
          CLOSE
        </button>
      </DoneState>
    );
  }

  const asset = locateAsset(loan.assetId)!;
  const claimable = loan.status === "CLAIMABLE" && loan.direction === "LENT";

  return (
    <>
      {(tx.phase === "review" || tx.phase === "ready") && (
        <div className="flex flex-col gap-1">
          <DataRow
            label="DELIVERED"
            value={`${fmtToken(loan.amount)} ${asset.symbol}`}
            tone="muted"
          />
          <DataRow label="RETURNED" value="NONE" tone="refuse" />
          <DataRow label="GRACE WINDOW" value={formatDuration(loan.graceHours * 3600)} tone="muted" />
          <DataRow
            label="NET REQUIRED"
            value={`${fmtToken(loan.netRequired)} ${asset.symbol}`}
            tone="muted"
          />

          <div className="mt-4">
            <Payline
              label="YOU CLAIM"
              value={fmtUsd(loan.collateralUsdc)}
              variant="ember"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {tx.error && <Note tone="refuse">{tx.error.toUpperCase()}</Note>}
            {simNote && <Note tone="ink">{simNote}</Note>}
            <Note tone="ember">CLAIM IS FINAL — THE TOKENS ARE FORFEIT.</Note>
          </div>

          <div className="mt-6">
            {!claimable && (
              <button
                type="button"
                className="lc-btn lc-btn-ghost mb-2.5 w-full"
                onClick={() => {
                  if (!publicKey) {
                    setSimNote("Connect a Devnet wallet.");
                    return;
                  }
                  setSimNote("Simulation — not a transaction.");
                  void simulateEarlyClaim(connection, publicKey, loan).then(setSimNote);
                }}
              >
                SIMULATE EARLY CLAIM
              </button>
            )}
            <ClickSpark sparkColor="#B23F07">
              <button
                type="button"
                disabled={!claimable}
                onClick={() => {
                  if (!publicKey || !claimable) return;
                  if (tx.phase === "ready") {
                    void tx.approve();
                    return;
                  }
                  void claimInstructions(publicKey, loan).then((built) => tx.simulate(built));
                }}
                className={
                  "lc-btn bg-ember text-[#FFF4EC] transition-all duration-300 hover:bg-ember-deep w-full" +
                  (!claimable ? " pointer-events-none opacity-40" : "")
                }
              >
                {tx.phase === "ready" ? "APPROVE IN PHANTOM" : `SIMULATE CLAIM ${fmtUsd(loan.collateralUsdc)}`}
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

      {(tx.phase === "simulating" || tx.phase === "signing" || tx.phase === "confirming") && (
        <div className="pt-4">
          <p className="lc-label mb-5">{phaseCopy(tx.phase).toUpperCase()}{tx.phase === "confirming" && tx.signature ? ` ${tx.signature}` : ""}</p>
          <StagedProgress steps={STEPS} activeIndex={tx.phase === "simulating" ? 0 : 1} />
        </div>
      )}

      {tx.phase === "done" && (
        <DoneState
          title="COLLATERAL CLAIMED"
          body={`${fmtUsd(loan.collateralUsdc)} USDC released to your wallet. The ${fmtToken(
            loan.netRequired,
          )} ${asset.symbol} position is closed and its receipt is on file.`}
        >
          <ClickSpark sparkColor="#B23F07">
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
