"use client";

import { Connection, PublicKey, TransactionMessage, VersionedTransaction, type TransactionInstruction } from "@solana/web3.js";
import { DEVNET_USDC, LOCATE_PROGRAM_ID, buildCancelTx, buildClaimTx, buildListTx, buildReturnTx, buildTakeTx, grossForNet, simulateAndDecode, type OfferTerms } from "@locate/sdk";
import type { Loan, Offer } from "./types";
import { DEVNET_MINT, locateApi } from "./env";
import { typedRefusal } from "./refusals";

export type TxResult =
  | { ok: true; signature: string; verified: boolean; deltas: BalanceDelta[] }
  | { ok: false; error: string; simulated: boolean };

export type BalanceDelta = { mint: string; owner: string; before: string; after: string };

export type PreparedTx = {
  tx: VersionedTransaction;
  instructions: TransactionInstruction[];
  payer: PublicKey;
  blockhash: string;
  lastValidBlockHeight: number;
  watched: PublicKey[];
  stamp: string;
};

export type SignTx = (tx: VersionedTransaction) => Promise<VersionedTransaction>;

type PhantomInjected = {
  signTransaction?: SignTx;
  signAndSendTransaction?: (
    tx: VersionedTransaction,
    opts?: { skipPreflight?: boolean; preflightCommitment?: string; maxRetries?: number },
  ) => Promise<{ signature: string }>;
};

function phantomInjected(): PhantomInjected | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { phantom?: { solana?: PhantomInjected } }).phantom?.solana;
}

function injectedSign(): SignTx | undefined {
  const phantom = phantomInjected();
  return phantom?.signTransaction ? (tx) => phantom.signTransaction!(tx) : undefined;
}

export function resolveSign(signTransaction?: SignTx): SignTx | undefined {
  return injectedSign() ?? signTransaction;
}

export function canApprove(signTransaction?: SignTx): boolean {
  const phantom = phantomInjected();
  return Boolean(phantom?.signAndSendTransaction || resolveSign(signTransaction));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started >= ms) {
        clearInterval(timer);
        resolve();
      }
    }, 250);
  });
}

async function confirmByPolling(
  connection: Connection,
  signature: string,
  lastValidBlockHeight: number,
): Promise<{ confirmed: boolean; error: string | null }> {
  for (let i = 0; i < 45; i++) {
    const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
    const value = status.value;
    if (value?.err) return { confirmed: false, error: "The transaction was sent but failed on-chain." };
    if (value?.confirmationStatus === "confirmed" || value?.confirmationStatus === "finalized") {
      return { confirmed: true, error: null };
    }
    let height = 0;
    try {
      height = await connection.getBlockHeight("confirmed");
    } catch {
      height = 0;
    }
    if (height > lastValidBlockHeight && !value) {
      continue;
    }
    await sleep(2000);
  }
  return { confirmed: false, error: `Devnet has not confirmed yet. Signature ${signature}` };
}

const SKIP_ACCOUNTS = new Set([
  "11111111111111111111111111111111",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  "ComputeBudget111111111111111111111111111111",
]);

export { typedRefusal } from "./refusals";

function watchedAccounts(instructions: TransactionInstruction[]): PublicKey[] {
  const seen = new Set<string>();
  const keys: PublicKey[] = [];
  for (const ix of instructions) {
    for (const key of [ix.programId, ...ix.keys.map((meta) => meta.pubkey)]) {
      const text = key.toBase58();
      if (seen.has(text) || SKIP_ACCOUNTS.has(text)) continue;
      seen.add(text);
      keys.push(key);
    }
  }
  return keys.slice(0, 12);
}

async function accountStamp(connection: Connection, keys: PublicKey[]): Promise<string> {
  if (keys.length === 0) return "";
  const infos = await connection.getMultipleAccountsInfo(keys, "confirmed");
  return infos.map((info) => (info ? Buffer.from(info.data).toString("base64") : "missing")).join("|");
}

function compile(payer: PublicKey, instructions: TransactionInstruction[], blockhash: string): VersionedTransaction {
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message(),
  );
}

export async function prepareInstructions(
  connection: Connection,
  payer: PublicKey,
  instructions: TransactionInstruction[],
): Promise<{ ok: true; prepared: PreparedTx } | TxResult> {
  const preview = await simulateAndDecode(connection, payer, instructions);
  if (preview.err) {
    const named = preview.name ?? (preview.code != null ? `Custom ${preview.code}` : JSON.stringify(preview.err));
    const log = preview.logs?.find((line) => /insufficient|error|failed/i.test(line));
    const fallback = log ? `${named} — ${log}` : named;
    return { ok: false, simulated: true, error: typedRefusal(preview.name ?? null, preview.code ?? null, fallback) };
  }
  const watched = watchedAccounts(instructions);
  const latest = await connection.getLatestBlockhash("confirmed");
  return {
    ok: true,
    prepared: {
      tx: compile(payer, instructions, latest.blockhash),
      instructions,
      payer,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
      watched,
      stamp: await accountStamp(connection, watched),
    },
  };
}

export async function approvePrepared(
  connection: Connection,
  signTransaction: SignTx,
  prepared: PreparedTx,
  onSent?: (signature: string) => void,
): Promise<TxResult> {
  const stamp = await accountStamp(connection, prepared.watched);
  if (stamp !== prepared.stamp) {
    return { ok: false, simulated: true, error: "TERMS_CHANGED" };
  }
  const again = await simulateAndDecode(connection, prepared.payer, prepared.instructions);
  if (again.err) {
    const named = again.name ?? (again.code != null ? `Custom ${again.code}` : "Simulation failed");
    return { ok: false, simulated: true, error: typedRefusal(again.name ?? null, again.code ?? null, named) };
  }
  let latest = await connection.getLatestBlockhash("confirmed").catch(async (error: unknown) => {
    const messageText = error instanceof Error ? error.message : String(error);
    if (!messageText.includes("429")) throw error;
    await sleep(3000);
    return connection.getLatestBlockhash("confirmed");
  });
  const tx = compile(prepared.payer, prepared.instructions, latest.blockhash);
  let signature: string;
  try {
    const signed = await signTransaction(tx);
    signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 5,
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "";
    if (/reject/i.test(messageText)) return { ok: false, simulated: false, error: "Signing was rejected." };
    if (/blockhash|expired/i.test(messageText)) {
      return { ok: false, simulated: false, error: "The blockhash expired. Simulate again, then approve in Phantom." };
    }
    return { ok: false, simulated: false, error: messageText || "Phantom did not return a signature." };
  }
  onSent?.(signature);
  const landed = await confirmByPolling(connection, signature, latest.lastValidBlockHeight);
  if (!landed.confirmed) {
    return { ok: false, simulated: false, error: landed.error ?? `Signed. Signature ${signature}` };
  }
  let verified = false;
  try {
    const posted = await locateApi.postReceipt(signature);
    verified = posted.status === "verified";
  } catch {
    verified = false;
  }
  const deltas = await tokenDeltas(connection, signature);
  return { ok: true, signature, verified, deltas };
}

async function tokenDeltas(connection: Connection, signature: string): Promise<BalanceDelta[]> {
  const tx = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  const pre = tx?.meta?.preTokenBalances ?? [];
  const post = tx?.meta?.postTokenBalances ?? [];
  return pre.map((row) => {
    const after = post.find((item) => item.accountIndex === row.accountIndex);
    return {
      mint: row.mint,
      owner: row.owner ?? "",
      before: row.uiTokenAmount.amount,
      after: after?.uiTokenAmount.amount ?? "0",
    };
  });
}

function termsFromRow(row: {
  lender: string;
  mint: string;
  nonce: string;
  amountRaw: string;
  collateralUsdc: string;
  feeUsdc: string;
  termSecs: string;
  graceSecs: string;
  expiresAt: string;
}): OfferTerms {
  return {
    lender: new PublicKey(row.lender),
    mint: new PublicKey(row.mint),
    usdcMint: DEVNET_USDC,
    nonce: BigInt(row.nonce),
    amountRaw: BigInt(row.amountRaw),
    collateralUsdc: BigInt(row.collateralUsdc),
    feeUsdc: BigInt(row.feeUsdc),
    termSecs: BigInt(row.termSecs),
    graceSecs: BigInt(row.graceSecs),
    expiresAt: BigInt(row.expiresAt),
    decimals: 9,
  };
}

export function listInstructions(
  payer: PublicKey,
  input: { amount: number; collateralUsdc: number; feeUsdc: number; termDays: number; expiryHours: number; termSecs?: number; graceSecs?: number },
): TransactionInstruction[] {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const terms: OfferTerms = {
    lender: payer,
    mint: new PublicKey(DEVNET_MINT),
    usdcMint: DEVNET_USDC,
    nonce: BigInt(Date.now()),
    amountRaw: BigInt(Math.round(input.amount * 1e9)),
    collateralUsdc: BigInt(Math.round(input.collateralUsdc * 1e6)),
    feeUsdc: BigInt(Math.round(input.feeUsdc * 1e6)),
    termSecs: BigInt(input.termSecs ?? input.termDays * 86_400),
    graceSecs: BigInt(input.graceSecs ?? 48 * 3600),
    expiresAt: now + BigInt(input.expiryHours * 3600),
    decimals: 9,
  };
  return buildListTx(terms, LOCATE_PROGRAM_ID);
}

export function takeInstructions(payer: PublicKey, offer: Offer): TransactionInstruction[] | string {
  if (!offer.mint || !offer.nonce || !offer.amountRaw || !offer.collateralRaw || !offer.feeRaw || !offer.termSecs || !offer.graceSecs || !offer.expiresAtSec) {
    return "This offer has no on-chain terms.";
  }
  return buildTakeTx(payer, {
    lender: new PublicKey(offer.lender),
    mint: new PublicKey(offer.mint),
    usdcMint: DEVNET_USDC,
    nonce: BigInt(offer.nonce),
    amountRaw: BigInt(offer.amountRaw),
    collateralUsdc: BigInt(offer.collateralRaw),
    feeUsdc: BigInt(offer.feeRaw),
    termSecs: BigInt(offer.termSecs),
    graceSecs: BigInt(offer.graceSecs),
    expiresAt: BigInt(offer.expiresAtSec),
    decimals: 9,
  }, LOCATE_PROGRAM_ID);
}

export function cancelInstructions(offer: Offer): TransactionInstruction[] | null {
  if (!offer.mint || !offer.nonce) return null;
  return buildCancelTx({ lender: new PublicKey(offer.lender), mint: new PublicKey(offer.mint), nonce: BigInt(offer.nonce) }, LOCATE_PROGRAM_ID);
}

async function offerTerms(pubkey: string): Promise<OfferTerms | null> {
  try {
    const body = await locateApi.offer(pubkey);
    const row = body.offer as Record<string, unknown> | undefined;
    if (!row) return null;
    return termsFromRow({
      lender: String(row.lender),
      mint: String(row.mint),
      nonce: String(row.nonce),
      amountRaw: String(row.amountRaw),
      collateralUsdc: String(row.collateralUsdc),
      feeUsdc: String(row.feeUsdc),
      termSecs: String(row.termSecs),
      graceSecs: String(row.graceSecs),
      expiresAt: String(row.expiresAt),
    });
  } catch {
    return null;
  }
}

function termsFromLoan(loan: Loan): OfferTerms | null {
  if (!loan.offerPubkey || !loan.lenderPubkey || !loan.mint || !loan.amountRaw) return null;
  return {
    lender: new PublicKey(loan.lenderPubkey),
    mint: new PublicKey(loan.mint),
    usdcMint: DEVNET_USDC,
    nonce: 0n,
    offer: new PublicKey(loan.offerPubkey),
    amountRaw: BigInt(loan.amountRaw),
    collateralUsdc: BigInt(loan.collateralRaw ?? "0"),
    feeUsdc: BigInt(loan.feeRaw ?? "0"),
    termSecs: 0n,
    graceSecs: 0n,
    expiresAt: 0n,
    decimals: 9,
  };
}

export async function returnInstructions(payer: PublicKey, loan: Loan): Promise<TransactionInstruction[] | string> {
  if (!loan.offerPubkey || !loan.amountRaw) return "This loan has no on-chain terms.";
  const terms = (await offerTerms(loan.offerPubkey)) ?? termsFromLoan(loan);
  if (!terms) return "Offer terms are unavailable.";
  const maxGross = grossForNet(loan.feeBps ?? 100, (1n << 64n) - 1n, BigInt(loan.amountRaw));
  return buildReturnTx(payer, terms, maxGross, LOCATE_PROGRAM_ID);
}

export async function claimInstructions(payer: PublicKey, loan: Loan): Promise<TransactionInstruction[] | string> {
  if (!loan.offerPubkey || !loan.borrowerPubkey) return "This loan has no on-chain terms.";
  const terms = (await offerTerms(loan.offerPubkey)) ?? termsFromLoan(loan);
  if (!terms) return "Offer terms are unavailable.";
  return buildClaimTx(payer, new PublicKey(loan.borrowerPubkey), terms, LOCATE_PROGRAM_ID);
}

export async function simulateEarlyClaim(connection: Connection, payer: PublicKey, loan: Loan) {
  const built = await claimInstructions(payer, loan);
  if (typeof built === "string") return built;
  const preview = await simulateAndDecode(connection, payer, built);
  return preview.name ?? "Simulation — not a transaction.";
}
