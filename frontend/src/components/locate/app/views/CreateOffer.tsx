"use client";

/**
 * LOCATE — CreateOffer: one focused panel + confirm drawer.
 */

import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_2022, ata } from "@locate/sdk";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { listInstructions } from "@/lib/locate/tx";
import { phaseCopy, usePreparedTx } from "@/lib/locate/usePreparedTx";
import { TxSteps } from "../TxSteps";
import { useLocate } from "@/lib/locate/store";
import { ASSETS, fmtUsd, fmtToken, formatDuration, uiFromRaw } from "@/lib/locate/seed";
import type { CreateOfferInput } from "@/lib/locate/types";
import { AssetLogo } from "../../landing/parts";
import { DataRow, DoneState, Payline, Segmented, StagedProgress, ViewHead } from "../parts";
import { cn } from "@/lib/utils";

const TERMS = ["1 MIN", "7 DAYS", "14 DAYS", "30 DAYS"];
const TERM_SPEC: Record<string, { termSecs: number; graceSecs: number; termDays: number }> = {
  "1 MIN": { termSecs: 60, graceSecs: 30, termDays: 0 },
  "7 DAYS": { termSecs: 7 * 86_400, graceSecs: 48 * 3600, termDays: 7 },
  "14 DAYS": { termSecs: 14 * 86_400, graceSecs: 48 * 3600, termDays: 14 },
  "30 DAYS": { termSecs: 30 * 86_400, graceSecs: 48 * 3600, termDays: 30 },
};
const EXPIRIES = ["24H", "48H", "72H"];

function NumberField({
  label,
  value,
  onChange,
  suffix,
  max,
  error,
  action,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  max?: number;
  error?: string | null;
  action?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="lc-label mb-2 flex items-center justify-between">
        {label}
        {action}
      </span>
      <span
        className={cn(
          "flex items-center gap-3 rounded-xl border bg-[#101012] px-4 py-3 transition-colors focus-within:border-lime/50",
          error ? "border-ember/50" : "border-line",
        )}
      >
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent font-mono text-[14px] font-semibold tabular-nums text-white outline-none placeholder:text-ink-3"
          placeholder="0.00"
          aria-label={label}
        />
        <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
          {suffix}
        </span>
      </span>
      {error && (
        <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-ember">
          {error}
        </span>
      )}
    </label>
  );
}

export function CreateOfferView() {
  const navigate = useLocate((s) => s.navigate);
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(0);

  const [assetId, setAssetId] = useState("OPENAI");
  const asset = ASSETS.find((a) => a.id === assetId)!;
  useEffect(() => {
    if (!publicKey) {
      setBalance(0);
      return;
    }
    const mint = new PublicKey("9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P");
    const account = ata(publicKey, mint, TOKEN_2022);
    connection
      .getTokenAccountBalance(account, "confirmed")
      .then((result) => setBalance(uiFromRaw(result.value.amount, result.value.decimals)))
      .catch(() => setBalance(0));
  }, [connection, publicKey]);

  const [amount, setAmount] = useState("0.005");
  const [collateral, setCollateral] = useState("12.50");
  const [fee, setFee] = useState("0.35");
  const [term, setTerm] = useState("7 DAYS");
  const [expiry, setExpiry] = useState("48H");

  const [confirmOpen, setConfirmOpen] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const collateralNum = parseFloat(collateral) || 0;
  const feeNum = parseFloat(fee) || 0;

  const collateralization = useMemo(() => {
    if (amountNum <= 0 || !asset.marketPrice) return null;
    return (collateralNum / (amountNum * asset.marketPrice)) * 100;
  }, [amountNum, collateralNum, asset.marketPrice]);

  const amountError =
    amountNum > balance
      ? `EXCEEDS BALANCE (${fmtToken(balance, 6)})`
      : amountNum <= 0
        ? "ENTER AN AMOUNT"
        : null;
  const collateralError = collateralNum <= 0 ? "REQUIRED" : null;
  const valid = !amountError && !collateralError && feeNum >= 0;

  const spec = TERM_SPEC[term] ?? TERM_SPEC["7 DAYS"];
  const input: CreateOfferInput = {
    assetId,
    amount: amountNum,
    collateralUsdc: collateralNum,
    feeUsdc: feeNum,
    termDays: spec.termDays,
    expiryHours: parseInt(expiry),
    termSecs: spec.termSecs,
    graceSecs: spec.graceSecs,
  };

  return (
    <div>
      <ViewHead
        label="LIST YOUR PRESTOCKS"
        title="Create an offer."
        serif="On your terms."
        actions={
          <span className="lc-chip-lime">
            BALANCE {fmtToken(balance, 6)} {asset.symbol}
          </span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        {/* form */}
        <div className="lc-card flex flex-col gap-5 p-6">
          <div>
            <p className="lc-label mb-2.5">PRESTOCK</p>
            <div className="flex flex-wrap gap-2">
              {ASSETS.map((a) => {
                const selected = a.id === assetId;
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setAssetId(a.id);
                      setAmount(balance > 0 ? String(Math.min(balance, 0.005)) : "0");
                    }}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                      selected
                        ? "border-lime/50 bg-lime-soft"
                        : "border-line bg-[#101012] hover:border-line-2",
                    )}
                    aria-pressed={selected}
                  >
                    <AssetLogo asset={a} size={26} className="rounded-lg" />
                    <span className="text-left">
                      <span
                        className={cn(
                          "block font-mono text-[11px] font-bold",
                          selected ? "text-lime-deep" : "text-ink-2",
                        )}
                      >
                        {a.symbol}
                      </span>
                      <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                        {fmtToken(balance)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <NumberField
            label="AMOUNT TO LEND"
            value={amount}
            onChange={setAmount}
            suffix={asset.symbol}
            error={amountError}
            action={
              <button
                onClick={() => setAmount(String(balance))}
                className="font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-lime-deep transition-opacity hover:opacity-80"
              >
                MAX
              </button>
            }
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              label="USDC COLLATERAL"
              value={collateral}
              onChange={setCollateral}
              suffix="USDC"
              error={collateralError}
            />
            <NumberField
              label="UPFRONT FEE"
              value={fee}
              onChange={setFee}
              suffix="USDC"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="lc-label mb-2.5">TERM</p>
              <Segmented options={TERMS} value={term} onChange={setTerm} ariaLabel="Loan term" />
            </div>
            <div>
              <p className="lc-label mb-2.5">OFFER EXPIRY</p>
              <Segmented options={EXPIRIES} value={expiry} onChange={setExpiry} ariaLabel="Offer expiry" />
            </div>
          </div>

          <p className="mt-auto rounded-xl border border-lime/25 bg-lime-soft px-4 py-3.5 font-mono text-[10px] font-medium uppercase leading-relaxed tracking-[0.1em] text-lime-deep">
            YOU KEEP YOUR TOKENS UNTIL THE OFFER IS TAKEN.
          </p>
        </div>

        {/* summary */}
        <div className="lc-card h-fit p-6 lg:sticky lg:top-24">
          <p className="lc-label mb-4">OFFER SUMMARY</p>
          <DataRow label="ASSET" value={asset.symbol} tone="strong" />
          <DataRow label="AMOUNT" value={fmtToken(amountNum)} />
          <DataRow label="COLLATERAL" value={fmtUsd(collateralNum)} />
          <DataRow label="UPFRONT FEE" value={fmtUsd(feeNum)} tone="accent" />
          <DataRow label="TERM" value={term} />
          <DataRow label="EXPIRY" value={expiry} />
          <DataRow
            label="COLLATERALIZATION"
            value={collateralization !== null ? `${collateralization.toFixed(0)}%` : "not a settlement input"}
            tone={collateralization !== null && collateralization < 150 ? "ember" : "strong"}
          />

          {collateralization !== null && collateralization < 150 && (
            <p className="mt-3 rounded-xl border border-ember/30 bg-ember-soft px-4 py-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-ember">
              THIN COLLATERAL — DEFAULTS PROTECT YOU LESS
            </p>
          )}

          <Payline
            label="YOU EARN IF TAKEN"
            value={fmtUsd(feeNum)}
            variant="light"
          />

          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!valid}
            className="lc-btn lc-btn-lime mt-5 w-full disabled:pointer-events-none disabled:opacity-40"
          >
            REVIEW &amp; LIST OFFER
          </button>
          <p className="mt-3 text-center font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">
            NOTHING MOVES UNTIL CONFIRMATION
          </p>
        </div>
      </div>

      <ConfirmOfferDrawer
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        input={input}
        onListed={() => navigate("offers")}
      />
    </div>
  );
}

/* ================= confirm drawer ================= */

const LIST_STAGES = ["SIGN LISTING", "POST TO BOOK", "OFFER LIVE"];

function ConfirmOfferDrawer({
  open,
  onClose,
  input,
  onListed,
}: {
  open: boolean;
  onClose: () => void;
  input: CreateOfferInput;
  onListed: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-line bg-background p-0 sm:max-w-md"
      >
        {open && (
          <ConfirmOfferInner
            key={`${input.assetId}-${input.amount}-${input.collateralUsdc}-${input.feeUsdc}`}
            input={input}
            onClose={onClose}
            onListed={onListed}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ConfirmOfferInner({
  input,
  onClose,
  onListed,
}: {
  input: CreateOfferInput;
  onClose: () => void;
  onListed: () => void;
}) {
  const tx = usePreparedTx();
  const asset = ASSETS.find((a) => a.id === input.assetId)!;

  return (
    <>
        <SheetHeader className="space-y-1 border-b border-line px-6 pb-4 pt-6">
          <SheetTitle className="flex items-center gap-2.5 font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-white">
            <span className="inline-block h-[7px] w-[7px] rounded-[2px] bg-lime" aria-hidden />
            CONFIRM — LIST OFFER
          </SheetTitle>
          <SheetDescription className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            {asset.symbol} · FINAL SUMMARY
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-5">
          {(tx.phase === "review" || tx.phase === "ready") && (
            <>
              <DataRow label="ASSET" value={asset.symbol} tone="strong" />
              <DataRow label="AMOUNT" value={fmtToken(input.amount)} />
              <DataRow label="COLLATERAL REQUIRED" value={fmtUsd(input.collateralUsdc)} />
              <DataRow label="UPFRONT FEE" value={fmtUsd(input.feeUsdc)} tone="accent" />
              <DataRow label="TERM" value={`${formatDuration(input.termSecs ?? input.termDays * 86_400)} + ${formatDuration(input.graceSecs ?? 48 * 3600)} GRACE`} />
              <DataRow label="LISTING EXPIRES" value={`IN ${input.expiryHours}H`} />

              <Payline
                label="YOUR TOKENS AT RISK"
                value={`${fmtToken(input.amount)} ${asset.symbol}`}
                variant="dark"
              />

              <p className="mt-4 text-[12.5px] leading-[1.6] text-ink-2">
                If the borrower defaults after maturity and grace, you claim{" "}
                {fmtUsd(input.collateralUsdc)} and the tokens are forfeit. Until
                taken, this listing moves nothing.
              </p>

              {tx.phase === "ready" && (
                <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-2">
                  Simulation passed. No transaction was sent. Approve in Phantom to list.
                </p>
              )}

              {tx.error && (
                <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-refuse">
                  {tx.error}
                </p>
              )}

              {tx.phase === "review" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!tx.publicKey) return;
                    try {
                      void tx.simulate(listInstructions(tx.publicKey, input));
                    } catch (thrown) {
                      void tx.simulate(thrown instanceof Error ? thrown.message : "Could not build the listing.");
                    }
                  }}
                  className="lc-btn lc-btn-lime mt-5 w-full"
                >
                  SIMULATE LISTING
                </button>
              ) : (
                <button type="button" onClick={() => void tx.approve()} className="lc-btn lc-btn-lime mt-5 w-full">
                  APPROVE IN PHANTOM
                </button>
              )}
            </>
          )}

          {(tx.phase === "simulating" || tx.phase === "signing" || tx.phase === "confirming") && (
            <div className="py-6">
              <TxSteps phase={tx.phase} />
              <p className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                {phaseCopy(tx.phase)}
                {tx.phase === "confirming" && tx.signature ? ` ${tx.signature}` : ""}
              </p>
              <StagedProgress steps={LIST_STAGES} activeIndex={tx.phase === "simulating" ? 0 : tx.phase === "signing" ? 1 : 2} />
            </div>
          )}

          {tx.phase === "done" && (
            <DoneState
              title={tx.verified ? "Verified on-chain" : "Confirmed"}
              body={tx.signature ? `Devnet signature ${tx.signature}. ${tx.deltas.length} token balance changes read from the transaction.` : "The listing transaction was confirmed."}
            >
              <button onClick={onListed} className="lc-btn lc-btn-ink lc-btn-sm">
                VIEW MY OFFERS
              </button>
              <button onClick={onClose} className="lc-btn lc-btn-ghost lc-btn-sm">
                KEEP EDITING
              </button>
            </DoneState>
          )}
        </div>
    </>
  );
}
