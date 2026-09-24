"use client";

/**
 * LOCATE — Verify: receipts from the live API, plus optional browser re-check.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, ChevronDown, Coins } from "lucide-react";
import { verifyReceiptInBrowser } from "@locate/sdk";
import { DecryptionText, FadeContent } from "@/components/bits";
import type { Receipt } from "@/lib/locate/types";
import { locateApi, SOLANA_RPC_URL, LOCATE_PROGRAM_ID_TEXT } from "@/lib/locate/env";
import { Segmented, ViewHead } from "../parts";
import { cn } from "@/lib/utils";

export function VerifyView() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [notice, setNotice] = useState("Loading receipts");
  const [filter, setFilter] = useState("ALL");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [stored, evidence] = await Promise.all([
          locateApi.receipts({ limit: 50 }),
          locateApi.evidence().catch(() => ({ receipts: [] as Array<Record<string, unknown>> })),
        ]);
        if (!alive) return;
        const evidenceSigs = new Set((evidence.receipts ?? []).map((row) => String(row.signature)));
        setReceipts(
          (stored.receipts ?? []).map((row) => {
            const signature = String(row.signature);
            const kind = String(row.kind);
            const commitment = String(row.commitment ?? "");
            const verified = commitment === "finalized" || evidenceSigs.has(signature);
            return {
              id: signature + ":" + kind,
              loanId: row.loan ? String(row.loan) : "",
              assetId: "OPENAI",
              status: kind === "loan_claimed" ? "CLAIMED" : verified ? "VERIFIED" : "PENDING",
              code: kind,
              lines: [
                { label: "SIGNATURE", value: signature },
                { label: "KIND", value: kind },
                { label: "SLOT", value: String(row.slot ?? "") },
                { label: "COMMITMENT", value: commitment || "unknown" },
              ],
              sig: signature,
              at: 0,
              yours: false,
            };
          }),
        );
        setNotice("");
      } catch {
        if (alive) setNotice("API waking up — retrying.");
      }
    };
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const list = receipts.filter((r) => filter === "ALL" || r.status === filter);

  return (
    <div>
      <div className="lc-card mb-6 p-5">
        <p className="lc-label">SEPARATE EXECUTION LAYERS</p>
        <ul className="mt-3 space-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2">
          <li>Devnet — real LOCATE transactions</li>
          <li>Mainnet fork — real Mainnet state + local LOCATE execution</li>
          <li>Mainnet DEX — real external DEX transactions. Not LOCATE protocol.</li>
        </ul>
      </div>
      <ViewHead
        label="EVERY LOAN ENDS IN A RECEIPT"
        title="The proof room."
        serif="Verified or refused."
        actions={
          <span className="lc-chip-lime">
            <DecryptionText text="PROOF ROOM" speed={55} revealDelay={250} />
          </span>
        }
      />

      <FadeContent distance={16}>
        <div className="mb-6">
          <Segmented
            options={["ALL", "VERIFIED", "PENDING", "CLAIMED"]}
            value={filter}
            onChange={setFilter}
            ariaLabel="Filter receipts"
          />
        </div>
      </FadeContent>

      {list.length === 0 ? (
        <div className="lc-card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-[#101012]">
            <Coins className="h-5 w-5 text-ink-3" aria-hidden />
          </span>
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-white">
            {notice || "NO RECEIPTS IN THIS STATE"}
          </p>
          <p className="max-w-sm text-[13.5px] leading-[1.6] text-ink-2">
            Settle a loan — return the net tokens or claim the collateral — and
            the receipt lands here after backend verification.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((r, i) => (
            <FadeContent key={r.id} delay={i * 0.07} distance={20} duration={0.55}>
              <ReceiptCard
                receipt={r}
                expanded={openId === r.id}
                onToggle={() => setOpenId(openId === r.id ? null : r.id)}
              />
            </FadeContent>
          ))}
        </div>
      )}
    </div>
  );
}

function ReceiptCard({
  receipt,
  expanded,
  onToggle,
}: {
  receipt: Receipt;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [browser, setBrowser] = useState<string | null>(null);
  const refused = receipt.status === "REFUSED";
  const claimed = receipt.status === "CLAIMED";
  const verified = receipt.status === "VERIFIED";
  const title = verified ? "Verified on-chain" : claimed ? "CLAIMED" : receipt.status;

  return (
    <article
      className={cn(
        "lc-card lc-card-hover overflow-hidden",
        refused && "border-refuse/25",
      )}
    >
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          {refused ? (
            <XCircle className="h-[18px] w-[18px] shrink-0 text-refuse" aria-hidden />
          ) : claimed ? (
            <Coins className="h-[18px] w-[18px] shrink-0 text-ember" aria-hidden />
          ) : (
            <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-lime-deep" aria-hidden />
          )}
          <span>
            <span
              className={cn(
                "block font-mono text-[12px] font-bold uppercase tracking-[0.14em]",
                refused ? "text-refuse" : claimed ? "text-ember" : "text-lime-deep",
              )}
            >
              {title}
            </span>
            <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">
              {receipt.sig} · {receipt.code}
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-ink-3 transition-transform duration-300",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div className="border-t border-line/70 px-5 py-4">
        <p
          className={cn(
            "font-mono text-[11px] font-semibold tracking-[0.04em]",
            refused ? "text-refuse" : claimed ? "text-ember" : "text-lime-deep",
          )}
        >
          {receipt.code}
        </p>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-4">
                {receipt.lines.map((l) => (
                  <div
                    key={l.label}
                    className="flex items-baseline justify-between gap-6 border-b border-line/60 py-2.5 last:border-b-0"
                  >
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">
                      {l.label}
                    </span>
                    <span className="break-all text-right font-mono text-[12.5px] tabular-nums text-white">
                      {l.value}
                    </span>
                  </div>
                ))}
                <a
                  href={`https://explorer.solana.com/tx/${receipt.sig}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block font-mono text-[9.5px] uppercase tracking-[0.12em] text-lime-deep"
                >
                  OPEN DEVNET EXPLORER
                </a>
                <button
                  className="mt-3 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2"
                  onClick={() => {
                    setBrowser("Checking Devnet…");
                    void verifyReceiptInBrowser(receipt.sig, SOLANA_RPC_URL, LOCATE_PROGRAM_ID_TEXT).then((result) => {
                      setBrowser(
                        result.ok && result.status === "verified"
                          ? "Verified on-chain"
                          : result.ok
                            ? "Confirmed — not yet finalized"
                            : `Browser check: ${result.reason}`,
                      );
                    });
                  }}
                >
                  {browser ?? "RE-CHECK IN BROWSER"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}
