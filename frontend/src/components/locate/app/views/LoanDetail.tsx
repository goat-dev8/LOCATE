"use client";

/**
 * LOCATE — LoanDetail view. Return and claim are real Devnet transactions.
 */

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocate } from "@/lib/locate/store";
import {
  ASSETS,
  DAY,
  fmtUsd,
  fmtToken,
  formatDuration,
  grossForNet,
} from "@/lib/locate/seed";
import { AssetLogo } from "../../landing/parts";
import {
  DataRow,
  EmptyState,
  MaturityRing,
  StatusChip,
  useCountdown,
  ViewHead,
} from "../parts";
import { BuyReturnDrawer } from "../drawers/BuyReturnDrawer";
import { ClaimDrawer } from "../drawers/ClaimDrawer";

export function LoanDetailView() {
  const { activeLoanId, loanById, navigate } = useLocate();
  const loan = activeLoanId ? loanById(activeLoanId) : undefined;
  const [buyOpen, setBuyOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const cd = useCountdown(loan?.maturityAt ?? 0);

  if (!loan) {
    return (
      <EmptyState
        title="NO LOAN SELECTED"
        body="Open a loan from My Loans to inspect its maturity, requirements, and settlement path."
        action={
          <button onClick={() => navigate("loans")} className="lc-btn lc-btn-ghost lc-btn-sm">
            GO TO MY LOANS
          </button>
        }
      />
    );
  }

  const asset = ASSETS.find((a) => a.id === loan.assetId) ?? ASSETS[0]!;
  const gross = grossForNet(loan.netRequired, asset.transferFeeBps);
  const span = loan.maturityAt - loan.startedAt || DAY;
  const progress = (Date.now() - loan.startedAt) / span;

  return (
    <div>
      <button
        onClick={() => navigate("loans")}
        className="mb-5 flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-3 transition-colors hover:text-ink-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> MY LOANS
      </button>

      <ViewHead
        label={`${loan.id} · ${asset.symbol}`}
        title={loan.direction === "BORROWED" ? "You borrowed." : "You lent."}
        serif="The clock decides."
        actions={
          <>
            <StatusChip status={loan.status} />
            <button onClick={() => navigate("verify")} className="lc-btn lc-btn-ghost lc-btn-sm">
              VIEW RECEIPT
            </button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="lc-card flex flex-col items-center gap-4 p-6">
          <p className="lc-label self-start">MATURITY</p>
          <MaturityRing
            progress={progress}
            tone={loan.status === "ACTIVE" ? (cd.past ? "ember" : "accent") : "done"}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              {loan.status === "ACTIVE" ? (cd.past ? "PAST DUE" : "REMAINING") : loan.status}
            </span>
            <span
              className={`font-mono text-[19px] font-bold tabular-nums ${
                loan.status === "ACTIVE" && cd.past ? "text-ember" : "text-white"
              }`}
            >
              {loan.status === "ACTIVE" ? cd.label : "SETTLED"}
            </span>
          </MaturityRing>
          <p className="text-center font-mono text-[10px] uppercase leading-[1.7] tracking-[0.12em] text-ink-3">
            {loan.termsKnown === false
              ? "SETTLED ON THE VERIFIED RECEIPT"
              : <>MATURITY + {formatDuration(loan.graceHours * 3600)} GRACE<br />THEN LENDER CAN CLAIM</>}
          </p>
          {loan.direction === "BORROWED" && loan.status === "ACTIVE" && (
            <button onClick={() => setBuyOpen(true)} className="lc-btn lc-btn-lime w-full">
              RETURN
            </button>
          )}
          {loan.direction === "LENT" && (loan.status === "ACTIVE" || loan.status === "CLAIMABLE") && (
            <button onClick={() => setClaimOpen(true)} className="lc-btn lc-btn-ink w-full">
              {loan.status === "CLAIMABLE" ? "CLAIM COLLATERAL" : "SIMULATE EARLY CLAIM"}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="lc-card p-6">
            <div className="mb-4 flex items-center gap-3.5">
              <AssetLogo asset={asset} size={40} className="rounded-xl" />
              <p className="font-sans text-[15px] font-semibold text-white">
                {asset.name}
              </p>
            </div>
            <DataRow label="AMOUNT" value={`${fmtToken(loan.amount, 6)} ${asset.symbol}`} />
            <DataRow
              label="NET REQUIRED"
              value={`${fmtToken(loan.netRequired, 6)} ${asset.symbol}`}
              tone="strong"
            />
            <DataRow
              label="GROSS TO RETURN"
              value={`${fmtToken(gross, 6)} ${asset.symbol}`}
              tone="accent"
            />
            <DataRow label="COLLATERAL" value={`${fmtUsd(loan.collateralUsdc)} USDC`} />
            <DataRow label="UPFRONT FEE" value={loan.feeKnown === false ? "NOT IN THIS RECEIPT" : `${fmtUsd(loan.feeUsdc)} USDC`} />
            <DataRow
              label="TRANSFER FEE"
              value={`${asset.transferFeeBps / 100}% · TOKEN-2022`}
            />
          </div>
        </div>
      </div>

      <BuyReturnDrawer loanId={loan.id} open={buyOpen} onOpenChange={setBuyOpen} />
      <ClaimDrawer loanId={loan.id} open={claimOpen} onOpenChange={setClaimOpen} />
    </div>
  );
}
