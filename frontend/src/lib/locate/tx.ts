"use client";

import { Connection, PublicKey, TransactionMessage, VersionedTransaction, type TransactionInstruction } from "@solana/web3.js";
import { DEVNET_USDC, LOCATE_PROGRAM_ID, buildCancelTx, buildClaimTx, buildListTx, buildReturnTx, grossForNet, simulateAndDecode, type OfferTerms } from "@locate/sdk";
import type { Loan, Offer } from "./types";

const api = process.env.VITE_API_BASE_URL ?? "https://locate-api-znz1.onrender.com";

export type TxResult =
  | { ok: true; signature: string; verified: boolean }
  | { ok: false; error: string; simulated: boolean };

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
  const latest = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: latest.blockhash,
    instructions,
  }).compileToV0Message();
  let signature: string;
  try {
    signature = await send(new VersionedTransaction(message), connection);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "";
    if (/reject/i.test(messageText)) return { ok: false, simulated: false, error: "Signing was rejected." };
    return { ok: false, simulated: false, error: messageText || "The wallet did not send the transaction." };
  }
  const confirmed = await connection.confirmTransaction(
    { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
    "confirmed",
  );
  if (confirmed.value.err) return { ok: false, simulated: false, error: "The transaction was sent but not confirmed." };
  let verified = false;
  try {
    const posted = await fetch(api + "/v1/receipts/" + signature, { method: "POST" });
    verified = posted.ok;
  } catch {
    verified = false;
  }
  return { ok: true, signature, verified };
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
  const mint = new PublicKey("9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P");
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
  const res = await fetch(api + "/v1/offers/" + pubkey, { cache: "no-store" });
  if (!res.ok) return null;
  const body = (await res.json()) as { offer?: Parameters<typeof termsFromRow>[0] };
  return body.offer ? termsFromRow(body.offer) : null;
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

