"use client";

/**
 * LOCATE — MyLoans: borrowed & lent positions with live clocks.
 */

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { FadeContent } from "@/components/bits";
import { useLocate } from "@/lib/locate/store";
import { ASSETS, fmtToken, formatDuration, grossForNet, netFromGross } from "@/lib/locate/seed";
import { loanPhase, nextLoanAction } from "@/lib/locate/loanPhase";
import { AssetLogo } from "../../landing/parts";
import { EmptyState, Segmented, StatusChip, useCountdown, ViewHead } from "../parts";
import { cn } from "@/lib/utils";

export function MyLoansView() {
  const loans = useLocate((s) => s.loans);
  const navigate = useLocate((s) => s.navigate);
  const [filter, setFilter] = useState("ALL");

  const list = loans.filter((l) => filter === "ALL" || l.status === filter);

  return (
    <div>
      <ViewHead
        label="WHAT HAVE I BORROWED"
        title="What have I borrowed?"
        serif="And what I lent."
      />

      <FadeContent distance={16}>
        <div className="mb-6">
          <Segmented
            options={["ALL", "ACTIVE", "RETURNED", "CLAIMABLE", "CLAIMED"]}
            value={filter}
            onChange={setFilter}
            ariaLabel="Filter loans"
          />
        </div>
      </FadeContent>

      {list.length === 0 ? (
        <EmptyState
          title="NO LOANS IN THIS STATE"
          body="Take an offer from the book, or list your own supply — everything with a clock lands here."
          action={
            <button onClick={() => navigate("book")} className="lc-btn lc-btn-ink lc-btn-sm">
              BROWSE THE BOOK
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((l, i) => (
            <LoanRow key={l.id} loan={l} delay={i * 0.06} onOpen={() => navigate("loan", l.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function LoanRow({
  loan,
  delay,
  onOpen,
}: {
  loan: import("@/lib/locate/types").Loan;
  delay: number;
  onOpen: () => void;
}) {
  const asset = ASSETS.find((a) => a.id === loan.assetId)!;
  const cd = useCountdown(loan.maturityAt);
  const borrowed = loan.direction === "BORROWED";
  const feeBps = loan.feeBps ?? asset.transferFeeBps;
  const received = netFromGross(loan.amount, feeBps);
  const requiredGross = grossForNet(loan.netRequired, feeBps);
  const phase = loanPhase(loan);

  return (
    <FadeContent delay={delay} distance={20} duration={0.55}>
      <button
        onClick={onOpen}
        className="lc-card lc-card-hover group flex w-full flex-col gap-4 p-5 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <AssetLogo asset={asset} size={40} className="rounded-xl" />
            <div>
              <p className="font-mono text-[12px] font-semibold text-white">{loan.id}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                {borrowed ? "YOU BORROWED" : "YOU LENT"} · {fmtToken(loan.netRequired, 6)} NET
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em]",
                borrowed
                  ? "border-lime/25 bg-lime-soft text-lime-deep"
                  : "border-ember/25 bg-ember-soft text-ember",
              )}
            >
              {loan.direction}
            </span>
            <StatusChip status={phase} />
          </div>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
          Borrowed gross {fmtToken(loan.amount, 6)} → fee {feeBps} bps → received net {fmtToken(received, 6)} → required return gross {fmtToken(requiredGross, 6)} → lender receives required net {fmtToken(loan.netRequired, 6)}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-2">{nextLoanAction(loan)}{loan.termsKnown === false ? "" : ` · grace ${formatDuration(loan.graceHours * 3600)}`} · collateral ${loan.collateralUsdc.toFixed(2)}</p>
        <div className="flex items-center justify-between border-t border-line/70 pt-4">
          {loan.status === "CLAIMABLE" ? (
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-ember">CLAIMABLE</p>
          ) : loan.status === "ACTIVE" ? (
            <p
              className={cn(
                "font-mono text-[17px] font-bold tabular-nums",
                cd.past ? "text-ember" : "text-white",
              )}
            >
              {cd.past ? "PAST DUE " : ""}
              {cd.label}
            </p>
          ) : (
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-lime-deep">
              SETTLED · {loan.status}
            </p>
          )}
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3 transition-colors group-hover:text-white">
            OPEN
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </button>
    </FadeContent>
  );
}
