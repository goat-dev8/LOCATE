"use client";

/**
 * LOCATE — LoanDetail view. Return and claim are real Devnet transactions.
 */

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { formatUnits } from "@/lib/locate/amounts";
import { feeBpsAtTake } from "@/lib/locate/pipeline";
import { locateApi } from "@/lib/locate/env";
import { dexEvidence } from "@/lib/locate/executionFacts";
import { SettlementRail, type RailStep } from "../SettlementRail";
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
  const [advanced, setAdvanced] = useState(false);
  const [steps, setSteps] = useState<RailStep[]>([]);
  const cd = useCountdown(loan?.maturityAt ?? 0);

  useEffect(() => {
    if (!loan) return;
    let alive = true;
    const wallet = loan.borrowerPubkey || loan.lenderPubkey || "";
    locateApi.receipts({ wallet, limit: 50 }).then((stored) => {
      if (!alive) return;
      const rows = (stored.receipts ?? []).filter((row) => String(row.loan ?? row.offer ?? "") === loan.id || String(row.offer ?? "") === loan.offerId);
      const sig = (kind: string) => {
        const row = rows.find((item) => String(item.kind) === kind);
        return row ? String(row.signature) : "";
      };
      const link = (signature: string) => signature ? `https://explorer.solana.com/tx/${signature}?cluster=devnet` : null;
      const taken = sig("loan_taken");
      const returned = sig("loan_returned");
      const claimed = sig("loan_claimed");
      const listed = sig("offer_created");
      const now = Date.now();
      const pastMaturity = now >= loan.maturityAt;
      const pastGrace = now >= loan.maturityAt + loan.graceHours * 3_600_000;
      const defaultPath = claimed.length > 0 || (loan.status === "CLAIMED") || (pastGrace && returned.length === 0 && loan.status !== "RETURNED");
      const devnetDex = dexEvidence.devnetDexResult;
      const verified = (signature: string, missing: string): { state: RailStep["state"]; detail: string } =>
        signature ? { state: "done", detail: signature } : { state: "waiting", detail: missing };
      const next: RailStep[] = defaultPath
        ? [
            { id: "taken", label: "Taken", ...verified(taken, "Not verified"), href: link(taken) },
            { id: "maturity", label: "Maturity", state: pastMaturity || claimed.length > 0 ? "done" : "waiting", detail: pastMaturity || claimed.length > 0 ? "The term ended." : "Waiting", href: null },
            { id: "grace", label: "Grace", state: pastGrace || claimed.length > 0 ? "done" : "current", detail: pastGrace || claimed.length > 0 ? "Grace elapsed without a return." : "Grace is running.", href: null },
            { id: "claimable", label: "Claimable", state: pastGrace || claimed.length > 0 ? "done" : "waiting", detail: pastGrace ? "The lender can claim." : "Not yet", href: null },
            { id: "claimed", label: "Claimed", ...verified(claimed, "Not verified"), href: link(claimed) },
          ]
        : [
            { id: "listed", label: "Listed", ...verified(listed, "Not verified"), href: link(listed) },
            { id: "taken", label: "Taken", ...verified(taken, "Not verified"), href: link(taken) },
            { id: "short", label: "Short", state: "blocked", detail: `External market. Devnet venue ${devnetDex}. Not this loan.`, href: null },
            { id: "buyback", label: "Buy back", state: "blocked", detail: "External market. Not this Devnet loan.", href: null },
            { id: "returned", label: "Returned", ...verified(returned, "Not verified"), href: link(returned) },
            { id: "released", label: "Collateral released", ...verified(returned, "Not verified"), href: link(returned) },
          ];
      setSteps(next);
    }).catch(() => {
      if (!alive) return;
      setSteps([]);
    });
    return () => {
      alive = false;
    };
  }, [loan]);

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
  const feeBps = feeBpsAtTake(loan.feeBps);
  const gross = feeBps == null ? null : grossForNet(loan.netRequired, feeBps);
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
        label={<><span className="normal-case">{loan.id}</span>{` · ${asset.symbol}`}</>}
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

      {steps.length > 0 && <div className="mb-5"><SettlementRail steps={steps} /></div>}

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
            <button onClick={() => setAdvanced((value) => !value)} className="mb-3 font-mono text-[12px] text-ink-3">
              {advanced ? "Hide details" : "Details"}
            </button>
            <DataRow label="AMOUNT" value={`${fmtToken(loan.amount, 6)} ${asset.symbol}`} />
            <DataRow
              label="NET REQUIRED"
              value={`${fmtToken(loan.netRequired, 6)} ${asset.symbol}`}
              tone="strong"
            />
            <DataRow
              label="GROSS TO RETURN"
              value={gross == null ? "not on this loan" : `${fmtToken(gross, 6)} ${asset.symbol}`}
              tone="accent"
            />
            <DataRow label="COLLATERAL" value={`${fmtUsd(loan.collateralUsdc)} USDC`} />
            <DataRow label="UPFRONT FEE" value={loan.feeKnown === false ? "NOT IN THIS RECEIPT" : `${fmtUsd(loan.feeUsdc)} USDC`} />
            <DataRow
              label="TRANSFER FEE AT TAKE"
              value={feeBps == null ? "not on this loan" : `${feeBps / 100}% · TOKEN-2022`}
            />
            {advanced && (
              <>
                <DataRow label="RAW AMOUNT" value={loan.amountRaw ?? "unavailable"} />
                <DataRow label="FEE RAW" value={loan.feeKnown === false ? "not in this receipt" : formatUnits(loan.feeRaw ?? "0", 6)} />
                <DataRow label="LOAN" value={loan.id} />
                <DataRow label="OFFER" value={loan.offerId} />
              </>
            )}
          </div>
        </div>
      </div>

      <BuyReturnDrawer loanId={loan.id} open={buyOpen} onOpenChange={setBuyOpen} />
      <ClaimDrawer loanId={loan.id} open={claimOpen} onOpenChange={setClaimOpen} />
    </div>
  );
}
