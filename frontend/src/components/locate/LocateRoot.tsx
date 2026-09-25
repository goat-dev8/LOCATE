"use client";

/**
 * LOCATE root — switches between the landing experience and the app
 * workspace, hosts the toast layer for both modes.
 */

import { useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X } from "lucide-react";
import { locateApi, DEVNET_MINT } from "@/lib/locate/env";
import { loansFromChain, settledLoansFromReceipts } from "@/lib/locate/chainLoans";
import { useLocate } from "@/lib/locate/store";
import { Landing } from "./landing/Landing";
import { AppShell } from "./app/AppShell";
import { cn } from "@/lib/utils";

function ToastHost() {
  const toast = useLocate((s) => s.toast);
  const dismiss = useLocate((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = setInterval(() => {
      clearInterval(t);
      dismiss();
    }, 5200);
    return () => clearInterval(t);
  }, [toast, dismiss]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-5 left-1/2 z-[90] w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 sm:bottom-7"
        >
          <div
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-4 pr-3 shadow-[0_2px_4px_rgba(26,24,21,0.08),0_24px_56px_-20px_rgba(26,24,21,0.4)] backdrop-blur-xl",
              toast.tone === "lime"
                ? "border-lime/50 bg-cream/95"
                : toast.tone === "ember"
                  ? "border-ember/40 bg-cream/95"
                  : toast.tone === "refuse"
                    ? "border-refuse/40 bg-cream/95"
                    : "border-line bg-cream/95",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                toast.tone === "lime"
                  ? "bg-lime-soft text-lime-deep"
                  : toast.tone === "ember"
                    ? "bg-ember-soft text-ember"
                    : toast.tone === "refuse"
                      ? "bg-refuse-soft text-refuse"
                      : "bg-paper-2 text-ink",
              )}
            >
              {toast.tone === "lime" ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              ) : (
                <Info className="h-4 w-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
                {toast.title}
              </p>
              {toast.body && (
                <p className="mt-1 text-[13px] leading-[1.5] text-ink-2">{toast.body}</p>
              )}
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss notification"
              className="rounded-full p-1.5 text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function LocateRoot() {
  const mode = useLocate((s) => s.mode);
  const setOffers = useLocate((s) => s.setOffers);
  const setLoans = useLocate((s) => s.setLoans);
  const { publicKey } = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await locateApi.offers();
        if (!alive) return;
        setOffers(
          (data.offers ?? [])
            .filter((row) => Boolean(row.funded) && String(row.mint) === DEVNET_MINT)
            .map((row) => ({
              id: String(row.pubkey),
              assetId: "OPENAI",
              amount: Number(row.amountRaw) / 1e9,
              collateralUsdc: Number(row.collateralUsdc) / 1e6,
              feeUsdc: Number(row.feeUsdc) / 1e6,
              termDays: Math.round(Number(row.termSecs) / 86_400),
              expiryAt: Number(row.expiresAt) * 1000,
              lender: String(row.lender),
              mint: String(row.mint),
              nonce: String(row.nonce),
              amountRaw: String(row.amountRaw),
              collateralRaw: String(row.collateralUsdc),
              feeRaw: String(row.feeUsdc),
              termSecs: String(row.termSecs),
              graceSecs: String(row.graceSecs),
              expiresAtSec: String(row.expiresAt),
              isYours: publicKey ? String(row.lender) === publicKey.toBase58() : false,
              status: "ACTIVE" as const,
              createdAt: Number(row.createdAt) * 1000,
            })),
        );
      } catch {
        /* leave the last live book; do not replace it with invented rows */
      }
    };
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [setOffers, publicKey]);

  useEffect(() => {
    if (!publicKey) {
      setLoans([]);
      return;
    }
    let alive = true;
    const wallet = publicKey.toBase58();
    const load = async () => {
      const rows: Array<Record<string, string | number | boolean>> = [];
      for (const role of ["borrower", "lender"] as const) {
        try {
          const body = await locateApi.loans({ wallet, role });
          for (const loan of body.loans ?? []) rows.push({ ...loan, role });
        } catch {
          /* keep other role results; do not invent loans */
        }
      }
      if (rows.length === 0) {
        try {
          rows.push(...await loansFromChain(connection, wallet));
        } catch {
          /* a failed chain read stays empty rather than inventing loans */
        }
      }
      try {
        const stored = await locateApi.receipts({ wallet, limit: 50 });
        const open = new Set(rows.map((loan) => String(loan.pubkey)));
        rows.push(...settledLoansFromReceipts(stored.receipts ?? [], wallet, open));
      } catch {
        /* settled history stays blank when the receipt API is down */
      }
      if (!alive) return;
      setLoans(rows.map((loan) => ({
        id: String(loan.pubkey),
        offerId: String(loan.offer),
        offerPubkey: String(loan.offer),
        assetId: "OPENAI" as const,
        direction: loan.role === "lender" ? "LENT" as const : "BORROWED" as const,
        amount: Number(loan.amountRaw) / 1e9,
        netRequired: Number(loan.amountRaw) / 1e9,
        collateralUsdc: Number(loan.collateralUsdc) / 1e6,
        feeUsdc: Number(loan.feeUsdc) / 1e6,
        startedAt: Number(loan.startTs) * 1000,
        maturityAt: Number(loan.maturityTs) * 1000,
        graceHours: loan.termsKnown === false ? 0 : Math.max(0, (Number(loan.claimAfterTs) - Number(loan.maturityTs)) / 3600),
        status: (loan.status === "RETURNED" || loan.status === "CLAIMED"
          ? loan.status
          : loan.claimableNow ? "CLAIMABLE" : "ACTIVE") as "ACTIVE" | "RETURNED" | "CLAIMABLE" | "CLAIMED",
        termsKnown: loan.termsKnown !== false,
        feeKnown: loan.feeKnown !== false,
        mint: String(loan.mint),
        amountRaw: String(loan.amountRaw),
        collateralRaw: String(loan.collateralUsdc),
        feeRaw: String(loan.feeUsdc),
        lenderPubkey: String(loan.lender),
        borrowerPubkey: String(loan.borrower),
        feeBps: Number(loan.feeBpsAtTake),
      })));
    };
    load().catch(() => undefined);
    const timer = setInterval(() => { load().catch(() => undefined); }, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [connection, publicKey, setLoans]);

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {mode === "landing" ? <Landing /> : <AppShell />}
        </motion.div>
      </AnimatePresence>
      <ToastHost />
    </>
  );
}
