"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { DEVNET_USDC, TOKEN, TOKEN_2022, ata } from "@locate/sdk";
import { useLocate } from "@/lib/locate/store";
import { fmtToken, fmtUsd, uiFromRaw } from "@/lib/locate/seed";
import { useLiveMarket } from "@/lib/locate/useLiveMarket";
import { executionTrace } from "@/lib/locate/executionFacts";
import { loanPhase, nextLoanAction } from "@/lib/locate/loanPhase";
import { AssetLogo } from "../../landing/parts";
import { StatusChip, useCountdown, ViewHead } from "../parts";

const REPLICA = new PublicKey("9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P");

function missingAta(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /could not find|not found|does not exist|invalid param/i.test(message);
}

const FLOW = [
  { n: "01", title: "LEND", body: "Supply a PreStock", layer: "LOCATE PROTOCOL" },
  { n: "02", title: "BORROW", body: "Post USDC collateral", layer: "LOCATE PROTOCOL" },
  { n: "03", title: "SHORT", body: "Use the borrowed token externally", layer: "EXTERNAL MARKET" },
  { n: "04", title: "RETURN", body: "Deliver the required token amount", layer: "LOCATE PROTOCOL" },
  { n: "05", title: "SETTLE", body: "Collateral returns — or lender claims after default", layer: "LOCATE PROTOCOL" },
];

export function OverviewView() {
  const { navigate, offers, loans } = useLocate();
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const live = useLiveMarket();
  const openai = live.bySymbol("OPENAI");
  const [replica, setReplica] = useState<number | null>(null);
  const [usdc, setUsdc] = useState<number | null>(null);

  useEffect(() => {
    setReplica(null);
    setUsdc(null);
    if (!publicKey) return;
    let alive = true;
    connection.getTokenAccountBalance(ata(publicKey, REPLICA, TOKEN_2022), "confirmed")
      .then((row) => { if (alive) setReplica(uiFromRaw(row.value.amount, row.value.decimals)); })
      .catch((error: unknown) => { if (alive && missingAta(error)) setReplica(0); });
    connection.getTokenAccountBalance(ata(publicKey, DEVNET_USDC, TOKEN), "confirmed")
      .then((row) => { if (alive) setUsdc(uiFromRaw(row.value.amount, row.value.decimals)); })
      .catch((error: unknown) => { if (alive && missingAta(error)) setUsdc(0); });
    return () => { alive = false; };
  }, [connection, publicKey]);

  const openOffers = offers.filter((o) => o.status === "ACTIVE");
  const borrowable = openOffers.reduce((sum, o) => sum + o.amount, 0);
  const liveLoans = loans.filter((l) => l.status === "ACTIVE" || l.status === "CLAIMABLE");
  const claimable = loans.find((l) => l.direction === "LENT" && loanPhase(l) === "CLAIMABLE");
  const borrowed = loans.find((l) => l.direction === "BORROWED" && l.status === "ACTIVE");

  let primary = { label: "CREATE OFFER", go: () => navigate("create"), why: "List a PreStock to make short supply available." };
  if (!connected) {
    primary = { label: "BROWSE BOOK", go: () => navigate("book"), why: "Connect the Devnet wallet in the sidebar to lend or borrow." };
  } else if (replica == null || usdc == null) {
    primary = { label: "BROWSE BOOK", go: () => navigate("book"), why: "Reading this wallet’s Devnet balances." };
  } else if (claimable) {
    primary = { label: "CLAIM COLLATERAL", go: () => navigate("loan", claimable.id), why: "A loan passed maturity and grace without a return." };
  } else if (borrowed) {
    primary = { label: "RETURN LOAN", go: () => navigate("loan", borrowed.id), why: "Deliver the required token amount and release your collateral." };
  } else if ((replica ?? 0) > 0) {
    primary = { label: "LEND THIS PRESTOCK", go: () => navigate("create"), why: "This wallet holds dOPENAI, the Devnet replica. Listing it creates borrowable short supply." };
  } else if ((usdc ?? 0) > 0) {
    primary = { label: "BORROW PRESTOCK", go: () => navigate("book"), why: "This wallet holds Devnet USDC. Take an open offer to borrow." };
  }

  return (
    <div>
      <ViewHead
        label="LOCATE"
        title="Lend the PreStock."
        serif="Let someone short it."
        actions={
          <button onClick={primary.go} className="lc-btn lc-btn-lime lc-btn-sm">
            {primary.label}
          </button>
        }
      />
      <p className="mb-6 max-w-2xl text-[15px] leading-[1.6] text-ink-2">
        LOCATE turns idle PreStocks into borrowable short supply, secured by USDC collateral and settled by delivery.
      </p>
      <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">{primary.why}</p>

      <section className="lc-card p-6">
        <p className="lc-label">LIVE MARKET CONTEXT · OPENAI</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Live Mainnet market data</p>
        <div className="mt-4 flex items-center gap-4">
          <AssetLogo asset={{ id: "OPENAI", symbol: "OPENAI", name: "OpenAI PreStock", logo: "", refPrice: openai?.markPrice ?? null, marketPrice: openai?.tokenPrice ?? null, transferFeeBps: 100, standard: "TOKEN-2022", blurb: "" }} size={44} className="rounded-xl" />
          <p className="font-sans text-[16px] font-semibold text-white">OpenAI PreStock</p>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-5">
          {[
            ["Reference", openai?.markPrice ? `$${Math.round(openai.markPrice).toLocaleString("en-US")}` : "unavailable"],
            ["Market", openai?.tokenPrice ? `$${Math.round(openai.tokenPrice).toLocaleString("en-US")}` : "unavailable"],
            ["Premium", openai?.premiumPct != null ? `${openai.premiumPct >= 0 ? "+" : ""}${openai.premiumPct.toFixed(1)}%` : "unavailable"],
            ["Transfer fee", "100 bps"],
            ["Token status", "Token-2022"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="lc-label">{k}</dt>
              <dd className="mt-1 font-mono text-[14px] text-white">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[13.5px] leading-[1.6] text-ink-2">
          This market data is live Mainnet information. It is not used as the settlement oracle.
        </p>
      </section>

      <section className="mt-5">
        <p className="lc-label mb-3">THE PROTOCOL FLOW</p>
        <div className="grid gap-3 md:grid-cols-5">
          {FLOW.map((step) => (
            <article key={step.n} className="lc-card p-4">
              <p className="font-mono text-[10px] text-ink-3">{step.n}</p>
              <p className="mt-2 font-sans text-[15px] font-semibold text-white">{step.title}</p>
              <p className="mt-1 text-[13px] text-ink-2">{step.body}</p>
              <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">{step.layer}</p>
            </article>
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
          LOCATE executes lend, borrow, return, and claim. The short and the buyback are external market execution.
        </p>
      </section>

      <section className="mt-5 lc-card p-6">
        <p className="lc-label">HOW IT WORKS</p>
        <ol className="mt-4 space-y-2 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-2">
          <li>Lender → PreStock → offer</li>
          <li>Offer → USDC collateral → borrower</li>
          <li>Borrower → borrowed PreStock → external market</li>
          <li>External market → sell → short</li>
          <li>Short → buy back → return</li>
          <li>Return → lender receives the required token</li>
          <li>Return → borrower receives the USDC collateral</li>
        </ol>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Default, if the token is not returned</p>
        <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-2">Offer → take → maturity → grace → claim → USDC collateral to the lender</p>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-3">
        <article className="lc-card flex flex-col p-6">
          <p className="lc-label">SHORT SUPPLY · OPENAI</p>
          {openOffers.length === 0 ? (
            <>
              <p className="mt-4 font-sans text-[22px] font-semibold text-white">NO OPEN OFFERS</p>
              <p className="mt-2 text-[13.5px] text-ink-2">List a PreStock to make short supply available.</p>
            </>
          ) : (
            <>
              <p className="mt-4 font-sans text-[28px] font-semibold tabular-nums text-white">{fmtToken(borrowable)}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Borrowable now · {openOffers.length} open offers</p>
            </>
          )}
          <button onClick={() => navigate("create")} className="lc-btn lc-btn-ink lc-btn-sm mt-5">CREATE OFFER</button>
        </article>

        <article className="lc-card p-6">
          <p className="lc-label">ACTIVE LOANS</p>
          {liveLoans.length === 0 ? (
            <p className="mt-4 text-[13.5px] text-ink-2">No active loans on this wallet.</p>
          ) : liveLoans.map((loan) => (
            <LoanLine key={loan.id} loanId={loan.id} />
          ))}
        </article>

        <article className="lc-card p-6">
          <p className="lc-label">SETTLEMENT</p>
          <p className="mt-4 text-[14px] text-white">No price oracle required.</p>
          <p className="mt-2 text-[14px] text-white">Settlement is deterministic.</p>
          <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-2">Return the required token amount.</p>
          <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-2">Miss maturity + grace → lender can claim USDC collateral.</p>
        </article>
      </section>

      <section className="mt-5 lc-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="lc-label">EXECUTION TRACE</p>
          <div className="flex gap-2">
            <button onClick={() => navigate("verify")} className="lc-btn lc-btn-ghost lc-btn-sm">PROOF</button>
            <button onClick={() => navigate("execute")} className="lc-btn lc-btn-ghost lc-btn-sm">MARKET EXECUTION</button>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {executionTrace.map((step) => (
            <li key={step.label} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line/70 py-2">
              <span className="font-mono text-[12px] text-white">{step.confirmed ? "✓" : "·"} {step.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">{step.layer}</span>
              {step.href ? (
                <a href={step.href} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-ink-2 underline">{step.confirmed ? "receipt" : "evidence"}</a>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12.5px] text-ink-3">Devnet protocol receipts and external Mainnet DEX receipts are separate. A DEX signature is not a LOCATE transaction.</p>
      </section>
    </div>
  );
}

function LoanLine({ loanId }: { loanId: string }) {
  const loan = useLocate((s) => s.loans.find((row) => row.id === loanId));
  const navigate = useLocate((s) => s.navigate);
  const cd = useCountdown(loan?.maturityAt ?? 0);
  if (!loan) return null;
  const phase = loanPhase(loan);
  return (
    <button onClick={() => navigate("loan", loan.id)} className="mt-4 block w-full border-t border-line/70 pt-3 text-left">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[12px] text-white">{loan.assetId} · {fmtToken(loan.amount)}</span>
        <StatusChip status={phase} />
      </div>
      <p className="mt-1 font-mono text-[11px] text-ink-3">{loan.direction} · collateral {fmtUsd(loan.collateralUsdc)} · {cd.past ? "past maturity" : cd.label}</p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2">{nextLoanAction(loan)}</p>
    </button>
  );
}
