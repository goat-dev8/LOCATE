"use client";

/**
 * BuyReturnDrawer — settle a borrowed loan: cover any token shortfall at the
 * market price, send the fee-aware gross, and get the receipt verified.
 */

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_2022, ata } from "@locate/sdk";
import { returnInstructions } from "@/lib/locate/tx";
import { phaseCopy, usePreparedTx } from "@/lib/locate/usePreparedTx";
import { useLocate, locateAsset } from "@/lib/locate/store";
import { fmtToken, fmtUsd, grossForNet, uiFromRaw } from "@/lib/locate/seed";
import { DEVNET_MINT } from "@/lib/locate/env";
import { ClickSpark } from "@/components/bits";
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
  const navigate = useLocate((s) => s.navigate);
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const tx = usePreparedTx();
  const [held, setHeld] = useState(0);

  useEffect(() => {
    if (!publicKey) {
      setHeld(0);
      return;
    }
    const mint = new PublicKey(loan?.mint || DEVNET_MINT);
    connection
      .getTokenAccountBalance(ata(publicKey, mint, TOKEN_2022), "confirmed")
      .then((result) => setHeld(uiFromRaw(result.value.amount, result.value.decimals)))
      .catch(() => setHeld(0));
  }, [connection, publicKey, loan?.mint]);

  const asset = loan ? locateAsset(loan.assetId) : undefined;
  const gross = loan && asset ? grossForNet(loan.netRequired, asset.transferFeeBps) : 0;
  const shortfall = Math.max(0, gross - held);
  const coverCost = asset ? shortfall * (asset.marketPrice ?? 0) : 0;

  const steps =
    shortfall > 0
      ? ["BUY SHORTFALL", "DELIVER NET", "VERIFY RETURN"]
      : ["SEND GROSS", "VERIFY DELIVERY", "RELEASE COLLATERAL"];

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
      {(tx.phase === "review" || tx.phase === "ready") && (
        <div className="flex flex-col gap-1">
          <DataRow
            label="NET REQUIRED"
            value={`${fmtToken(loan.netRequired, 6)} ${asset.symbol}`}
            tone="lime"
          />
          <DataRow
            label="GROSS TO SEND"
            value={`${fmtToken(gross, 6)} ${asset.symbol}`}
          />
          <DataRow
            label="HELD IN WALLET"
            value={`${fmtToken(held, 6)} ${asset.symbol}`}
            tone="muted"
          />
          <DataRow
            label="SHORTFALL"
            value={
              shortfall > 0
                ? `${fmtToken(shortfall, 6)} ${asset.symbol}`
                : `NONE`
            }
            tone={shortfall > 0 ? "refuse" : "muted"}
          />
          {shortfall > 0 && (
            <DataRow
              label="ESTIMATED COVER COST"
              value={asset.marketPrice ? fmtUsd(coverCost) : "UNAVAILABLE"}
              tone="ember"
            />
          )}

          <div className="mt-4">
            <Payline
              label="COVER COST AT MARKET"
              value={asset.marketPrice ? fmtUsd(coverCost) : "UNAVAILABLE"}
              variant="total"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {tx.error && <Note tone="refuse">{tx.error.toUpperCase()}</Note>}
            {tx.phase === "ready" && (
              <Note tone="ink">SIMULATION PASSED. NO TRANSACTION WAS SENT. APPROVE IN PHANTOM TO RETURN.</Note>
            )}
            {shortfall > 0 ? (
              <Note tone="ember">
                WALLET HOLDS {fmtToken(held, 6)} OF {fmtToken(gross, 6)}{" "}
                {asset.symbol} GROSS. THE TRANSFER FEE MEANS THE RECEIVED NET IS NOT ENOUGH TO RETURN. NO DEVNET VENUE FILLS THIS SHORTFALL.
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
                  if (tx.phase === "ready") {
                    void tx.approve();
                    return;
                  }
                  void returnInstructions(publicKey, loan).then((built) => tx.simulate(built));
                }}
                className="lc-btn lc-btn-lime w-full"
              >
                {tx.phase === "ready" ? "APPROVE IN PHANTOM" : "SIMULATE RETURN"}
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
          <StagedProgress steps={steps} activeIndex={tx.phase === "simulating" ? 0 : 1} />
        </div>
      )}

      {tx.phase === "done" && (
        <DoneState
          title={tx.verified ? "Verified on-chain" : "Confirmed"}
          body={`Net delivery of ${fmtToken(loan.netRequired)} ${asset.symbol} confirmed. ${fmtUsd(
            loan.collateralUsdc,
          )} USDC collateral release depends on verification. Signature ${tx.signature ?? ""}.`}
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
