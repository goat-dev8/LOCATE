"use client";

/**
 * LOCATE — LoanDetail view + BuyReturn & Claim drawers.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useLocate } from "@/lib/locate/store";
import {
  ASSETS,
  DAY,
  HOUR,
  fmtUsd,
  fmtToken,
  grossForNet,
  GRACE_HOURS,
} from "@/lib/locate/seed";
import type { Loan } from "@/lib/locate/types";
import { AssetLogo } from "../../landing/parts";
import {
  DataRow,
  DoneState,
  EmptyState,
  MaturityRing,
  Payline,
  StagedProgress,
  StatusChip,
  useCountdown,
  ViewHead,
} from "../parts";

/* ================= view ================= */

export function LoanDetailView() {
  const { activeLoanId, loanById, navigate, receipts } = useLocate();
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

  const asset = ASSETS.find((a) => a.id === loan.assetId)!;
  const gross = grossForNet(loan.netRequired, asset.transferFeeBps);
  const span = loan.maturityAt - loan.startedAt || DAY;
  const progress = (Date.now() - loan.startedAt) / span;
  const receipt = receipts.find((r) => r.loanId === loan.id);

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
            {receipt && (
              <button onClick={() => navigate("verify")} className="lc-btn lc-btn-ghost lc-btn-sm">
                VIEW RECEIPT
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* maturity ring card */}
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
            MATURITY + {GRACE_HOURS}H GRACE
            <br />
            THEN LENDER CAN CLAIM
          </p>
          {loan.direction === "BORROWED" && loan.status === "ACTIVE" && (
            <button onClick={() => setBuyOpen(true)} className="lc-btn lc-btn-lime w-full">
              BUY &amp; RETURN
            </button>
          )}
          {loan.direction === "LENT" && loan.status === "CLAIMABLE" && (
            <button onClick={() => setClaimOpen(true)} className="lc-btn lc-btn-ink w-full">
              CLAIM COLLATERAL
            </button>
          )}
        </div>

        {/* data + timeline */}
        <div className="flex flex-col gap-5">
          <div className="lc-card p-6">
            <div className="mb-4 flex items-center gap-3.5">
              <AssetLogo asset={asset} size={40} className="rounded-xl" />
              <p className="font-sans text-[15px] font-semibold text-white">
                {asset.name}
              </p>
            </div>
            <DataRow label="AMOUNT" value={`${fmtToken(loan.amount)} ${asset.symbol}`} />
            <DataRow
              label="NET REQUIRED"
              value={`${fmtToken(loan.netRequired)} ${asset.symbol}`}
              tone="strong"
            />
            <DataRow
              label="GROSS TO RETURN"
              value={`${fmtToken(gross)} ${asset.symbol}`}
              tone="accent"
            />
            <DataRow label="COLLATERAL" value={`${fmtUsd(loan.collateralUsdc)} USDC`} />
            <DataRow label="UPFRONT FEE" value={`${fmtUsd(loan.feeUsdc)} USDC`} />
            <DataRow
              label="TRANSFER FEE"
              value={`${asset.transferFeeBps / 100}% · TOKEN-2022`}
            />
          </div>

          <div className="lc-card p-6">
            <p className="lc-label mb-5">SETTLEMENT PATH</p>
            <ol className="flex flex-col">
              {[
                { label: "OFFER TAKEN", state: "done" },
                { label: "NET RETURN REQUIRED", state: "done" },
                {
                  label: `MATURITY + ${GRACE_HOURS}H GRACE`,
                  state: loan.status === "ACTIVE" ? "active" : "done",
                },
                {
                  label:
                    loan.status === "RETURNED"
                      ? "RETURNED · VERIFIED"
                      : loan.status === "CLAIMABLE"
                        ? "AWAITING YOUR CLAIM"
                        : loan.status === "CLAIMED"
                          ? "COLLATERAL CLAIMED"
                          : "PENDING",
                  state:
                    loan.status === "ACTIVE"
                      ? "todo"
                      : loan.status === "CLAIMABLE"
                        ? "ember"
                        : "done",
                },
              ].map((s, i, arr) => {
                const done = s.state === "done";
                const active = s.state === "active";
                const ember = s.state === "ember";
                return (
                  <li key={s.label} className="flex items-center gap-3.5">
                    <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                      {i < arr.length - 1 && (
                        <span
                          className={`absolute left-1/2 top-full h-[30px] w-px -translate-x-1/2 ${
                            done || ember ? "bg-lime/40" : "bg-line"
                          }`}
                          aria-hidden
                        />
                      )}
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[9px] font-bold ${
                          done
                            ? "border-lime/50 bg-lime-soft text-lime-deep"
                            : ember
                              ? "border-ember/50 bg-ember-soft text-ember"
                              : active
                                ? "border-lime bg-lime text-white"
                                : "border-line bg-[#101012] text-ink-3"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </span>
                    <span
                      className={`pb-8 font-mono text-[11px] font-medium uppercase tracking-[0.14em] ${
                        ember ? "text-ember" : done ? "text-lime-deep" : active ? "text-white" : "text-ink-3"
                      }`}
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      <BuyReturnDrawer loan={loan} open={buyOpen} onClose={() => setBuyOpen(false)} />
      <ClaimDrawer loan={loan} open={claimOpen} onClose={() => setClaimOpen(false)} />
    </div>
  );
}

/* ================= buy & return drawer ================= */

const BUY_STAGES = ["BUY SHORTFALL", "DELIVER NET", "VERIFY RETURN"];

export function BuyReturnDrawer({
  loan,
  open,
  onClose,
}: {
  loan: Loan;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-line bg-background p-0 sm:max-w-md"
      >
        {open && <BuyReturnInner key={loan.id} loan={loan} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function BuyReturnInner({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const buyAndReturn = useLocate((s) => s.buyAndReturn);
  const tokenBalances = useLocate((s) => s.tokenBalances);
  const navigate = useLocate((s) => s.navigate);
  const [stage, setStage] = useState<"review" | "busy" | "done">("review");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const asset = ASSETS.find((a) => a.id === loan.assetId)!;
  const gross = grossForNet(loan.netRequired, asset.transferFeeBps);
  const held = tokenBalances[loan.assetId] ?? 0;
  const shortfall = Math.max(0, +(gross - held).toFixed(6));
  const coverCost = shortfall * asset.marketPrice;

  const confirm = () => {
    setStage("busy");
    const res = buyAndReturn(loan.id);
    if (res.ok) setStage("done");
    else {
      setError(res.error ?? "Return failed.");
      setStage("review");
    }
  };

  return (
    <>
      <SheetHeader className="space-y-1 border-b border-line px-6 pb-4 pt-6">
        <SheetTitle className="flex items-center gap-2.5 font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-white">
          <span className="inline-block h-[7px] w-[7px] rounded-[2px] bg-lime" aria-hidden />
          BUY &amp; RETURN
        </SheetTitle>
        <SheetDescription className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
          {loan.id} · {asset.symbol}
        </SheetDescription>
      </SheetHeader>

        <div className="px-6 py-5">
          {stage === "review" && (
            <>
              <DataRow label="NET REQUIRED" value={`${fmtToken(loan.netRequired)} ${asset.symbol}`} tone="strong" />
              <DataRow label="GROSS TO SEND" value={`${fmtToken(gross)} ${asset.symbol}`} />
              <DataRow label="HELD IN WALLET" value={`${fmtToken(held)} ${asset.symbol}`} />
              <DataRow
                label="SHORTFALL"
                value={shortfall > 0 ? `${fmtToken(shortfall)} ${asset.symbol}` : "NONE"}
                tone={shortfall > 0 ? "ember" : "accent"}
              />
              <DataRow
                label="ESTIMATED COVER COST"
                value={shortfall > 0 ? `≈ ${fmtUsd(coverCost)} AT MARKET` : "$0.00"}
              />

              <Payline
                label="COLLATERAL RELEASED ON VERIFY"
                value={fmtUsd(loan.collateralUsdc)}
                variant="light"
              />

              <p className="mt-4 text-[12.5px] leading-[1.6] text-ink-2">
                LOCATE buys the shortfall at market, delivers the fee-aware gross,
                and verifies the net lands exactly at the requirement. Your USDC
                collateral unlocks the moment verification passes.
              </p>

              {error && (
                <p className="mt-4 rounded-xl border border-refuse/30 bg-refuse-soft px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-refuse">
                  {error}
                </p>
              )}

              <button onClick={confirm} className="lc-btn lc-btn-lime mt-5 w-full">
                CONFIRM — BUY &amp; RETURN
              </button>
            </>
          )}

          {stage === "busy" && (
            <div className="py-6">
              <StagedProgress steps={BUY_STAGES} activeIndex={step} />
            </div>
          )}

          {stage === "done" && (
            <DoneState
              title="RETURN VERIFIED"
              body={`Net delivery confirmed to the last decimal. ${fmtUsd(loan.collateralUsdc)} collateral released to your wallet.`}
            >
              <button
                onClick={() => {
                  onClose();
                  navigate("verify");
                }}
                className="lc-btn lc-btn-ink lc-btn-sm"
              >
                VIEW RECEIPT
              </button>
              <button onClick={onClose} className="lc-btn lc-btn-ghost lc-btn-sm">
                DONE
              </button>
            </DoneState>
          )}
        </div>
    </>
  );
}

/* ================= claim drawer ================= */

export function ClaimDrawer({
  loan,
  open,
  onClose,
}: {
  loan: Loan;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-line bg-background p-0 sm:max-w-md"
      >
        {open && <ClaimInner key={loan.id} loan={loan} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function ClaimInner({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const claimCollateral = useLocate((s) => s.claimCollateral);
  const navigate = useLocate((s) => s.navigate);
  const [stage, setStage] = useState<"review" | "busy" | "done">("review");
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const confirm = () => {
    setStage("busy");
    const res = claimCollateral(loan.id);
    if (res.ok) setStage("done");
    else {
      setError(res.error ?? "Claim failed.");
      setStage("review");
    }
  };

  return (
    <>
        <SheetHeader className="space-y-1 border-b border-line px-6 pb-4 pt-6">
          <SheetTitle className="flex items-center gap-2.5 font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-white">
            <span className="inline-block h-[7px] w-[7px] rounded-[2px] bg-ember" aria-hidden />
            CLAIM COLLATERAL
          </SheetTitle>
          <SheetDescription className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            {loan.id} · LENT · GRACE ELAPSED
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-5">
          {stage === "review" && (
            <>
              <DataRow label="NET REQUIRED" value={`${fmtToken(loan.netRequired)} ${loan.assetId}`} />
              <DataRow label="RETURNED" value="NONE" tone="refuse" />
              <DataRow label="GRACE ELAPSED" value={`${loan.graceHours}H`} tone="ember" />

              <Payline label="YOU CLAIM" value={fmtUsd(loan.collateralUsdc)} variant="ember" />

              <p className="mt-4 rounded-xl border border-ember/30 bg-ember-soft px-4 py-3 font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.1em] text-ember">
                CLAIM IS FINAL — TOKENS ARE FORFEIT. NO ORACLE, NO AUCTION, NO NEGOTIATION.
              </p>

              {error && (
                <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-refuse">
                  {error}
                </p>
              )}

              <button onClick={confirm} className="lc-btn lc-btn-ink mt-5 w-full">
                CONFIRM — CLAIM {fmtUsd(loan.collateralUsdc)}
              </button>
            </>
          )}

          {stage === "busy" && (
            <div className="py-6">
              <StagedProgress steps={["EXECUTE CLAIM"]} activeIndex={0} />
            </div>
          )}

          {stage === "done" && (
            <DoneState
              title="COLLATERAL CLAIMED"
              body={`${fmtUsd(loan.collateralUsdc)} USDC released to your wallet. A receipt is recorded in the proof room.`}
            >
              <button
                onClick={() => {
                  onClose();
                  navigate("verify");
                }}
                className="lc-btn lc-btn-ink lc-btn-sm"
              >
                VIEW RECEIPT
              </button>
            </DoneState>
          )}
        </div>
    </>
  );
}
