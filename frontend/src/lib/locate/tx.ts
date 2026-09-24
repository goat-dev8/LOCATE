"use client";

import { Connection, PublicKey, TransactionMessage, VersionedTransaction, type TransactionInstruction } from "@solana/web3.js";
import { DEVNET_USDC, LOCATE_PROGRAM_ID, buildCancelTx, buildClaimTx, buildListTx, buildReturnTx, grossForNet, simulateAndDecode, type OfferTerms } from "@locate/sdk";
import type { Loan, Offer } from "./types";
import { DEVNET_MINT, locateApi } from "./env";

export type TxResult =
  | { ok: true; signature: string; verified: boolean }
  | { ok: false; error: string; simulated: boolean };

async function sendOnce(
  connection: Connection,
  payer: PublicKey,
  send: (tx: VersionedTransaction, connection: Connection) => Promise<string>,
  instructions: TransactionInstruction[],
): Promise<{ signature: string; blockhash: string; lastValidBlockHeight: number }> {
  const latest = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: latest.blockhash,
    instructions,
  }).compileToV0Message();
  const signature = await send(new VersionedTransaction(message), connection);
  return { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight };
}

export async function submitInstructions(
  connection: Connection,
  payer: PublicKey,
  send: (tx: VersionedTransaction, connection: Connection) => Promise<string>,
  instructions: TransactionInstruction[],
): Promise<TxResult> {
  const preview = await simulateAndDecode(connection, payer, instructions);
  if (preview.err) {
    return { ok: false, simulated: true, error: preview.name ?? "Simulation failed. No transaction was sent." };
  }
  let sent: { signature: string; blockhash: string; lastValidBlockHeight: number };
  try {
    sent = await sendOnce(connection, payer, send, instructions);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "";
    if (/reject/i.test(messageText)) return { ok: false, simulated: false, error: "Signing was rejected." };
    if (/blockhash|expired/i.test(messageText)) {
      const again = await simulateAndDecode(connection, payer, instructions);
      if (again.err) return { ok: false, simulated: true, error: again.name ?? "Simulation failed. No transaction was sent." };
      try {
        sent = await sendOnce(connection, payer, send, instructions);
      } catch (retryError) {
        const retryText = retryError instanceof Error ? retryError.message : "";
        if (/reject/i.test(retryText)) return { ok: false, simulated: false, error: "Signing was rejected." };
        return { ok: false, simulated: false, error: retryText || "The wallet did not send the transaction." };
      }
    } else {
      return { ok: false, simulated: false, error: messageText || "The wallet did not send the transaction." };
    }
  }
  const confirmed = await connection.confirmTransaction(
    { signature: sent.signature, blockhash: sent.blockhash, lastValidBlockHeight: sent.lastValidBlockHeight },
    "confirmed",
  );
  if (confirmed.value.err) return { ok: false, simulated: false, error: "The transaction was sent but not confirmed." };
  let verified = false;
  try {
    const posted = await locateApi.postReceipt(sent.signature);
    verified = posted.status === "verified";
  } catch {
    verified = false;
  }
  return { ok: true, signature: sent.signature, verified };
}

type Sender = (tx: VersionedTransaction, connection: Connection) => Promise<string>;

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

function asFlow(result: TxResult): { ok: boolean; error?: string; id?: string } {
  if (result.ok) return { ok: true, id: result.signature, error: result.verified ? undefined : "Confirmed. Receipt verification is still pending." };
  return { ok: false, error: result.simulated ? `Simulation — not a transaction. ${result.error}` : result.error };
}

export async function listOnChain(
  connection: Connection,
  payer: PublicKey,
  send: Sender,
  input: { amount: number; collateralUsdc: number; feeUsdc: number; termDays: number; expiryHours: number },
) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const mint = new PublicKey(DEVNET_MINT);
  const terms: OfferTerms = {
    lender: payer,
    mint,
    usdcMint: DEVNET_USDC,
    nonce: BigInt(Date.now()),
    amountRaw: BigInt(Math.round(input.amount * 1e9)),
    collateralUsdc: BigInt(Math.round(input.collateralUsdc * 1e6)),
    feeUsdc: BigInt(Math.round(input.feeUsdc * 1e6)),
    termSecs: BigInt(input.termDays * 86_400),
    graceSecs: 48n * 3600n,
    expiresAt: now + BigInt(input.expiryHours * 3600),
    decimals: 9,
  };
  return asFlow(await submitInstructions(connection, payer, send, buildListTx(terms, LOCATE_PROGRAM_ID)));
}

export async function cancelOnChain(connection: Connection, payer: PublicKey, send: Sender, offer: Offer) {
  if (!offer.mint || !offer.nonce) return { ok: false, error: "This offer has no on-chain terms." };
  const built = buildCancelTx({ lender: new PublicKey(offer.lender), mint: new PublicKey(offer.mint), nonce: BigInt(offer.nonce) }, LOCATE_PROGRAM_ID);
  return asFlow(await submitInstructions(connection, payer, send, built));
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

export async function returnOnChain(connection: Connection, payer: PublicKey, send: Sender, loan: Loan) {
  if (!loan.offerPubkey || !loan.amountRaw) return { ok: false, error: "This loan has no on-chain terms." };
  const terms = await offerTerms(loan.offerPubkey);
  if (!terms) return { ok: false, error: "Offer terms are unavailable." };
  const maxGross = grossForNet(loan.feeBps ?? 100, (1n << 64n) - 1n, BigInt(loan.amountRaw));
  return asFlow(await submitInstructions(connection, payer, send, buildReturnTx(payer, terms, maxGross, LOCATE_PROGRAM_ID)));
}

export async function claimOnChain(connection: Connection, payer: PublicKey, send: Sender, loan: Loan) {
  if (!loan.offerPubkey || !loan.borrowerPubkey) return { ok: false, error: "This loan has no on-chain terms." };
  const terms = await offerTerms(loan.offerPubkey);
  if (!terms) return { ok: false, error: "Offer terms are unavailable." };
  return asFlow(await submitInstructions(connection, payer, send, buildClaimTx(payer, new PublicKey(loan.borrowerPubkey), terms, LOCATE_PROGRAM_ID)));
}

export async function simulateEarlyClaim(connection: Connection, payer: PublicKey, loan: Loan) {
  if (!loan.offerPubkey || !loan.borrowerPubkey) return "This loan has no on-chain terms.";
  const terms = await offerTerms(loan.offerPubkey);
  if (!terms) return "Offer terms are unavailable.";
  const preview = await simulateAndDecode(connection, payer, buildClaimTx(payer, new PublicKey(loan.borrowerPubkey), terms, LOCATE_PROGRAM_ID));
  return preview.name ?? "Simulation — not a transaction.";
}

