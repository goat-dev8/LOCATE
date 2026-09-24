import { Connection, PublicKey } from "@solana/web3.js";
import { balanceOf, decodeTransactionEvents, type DecodedEvent } from "./events.js";

export type VerifyResult =
  | { status: "verified" | "pending"; commitment: "confirmed" | "finalized"; events: DecodedEvent[]; slot: number; blockTime: number | null }
  | { status: "rejected"; reason: string };

function delta(tx: { meta: unknown }, mint: string, owner: string): bigint | null {
  const pre = balanceOf(tx.meta as never, mint, owner, "pre");
  const post = balanceOf(tx.meta as never, mint, owner, "post");
  if (pre === null || post === null) return null;
  return post - pre;
}

export async function verifySignature(
  connection: Connection,
  programId: PublicKey,
  signature: string,
  usdcMint: PublicKey,
): Promise<VerifyResult> {
  const finalized = await connection.getTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
  const confirmed = finalized ?? await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!confirmed) return { status: "rejected", reason: "NOT_FOUND" };
  if (confirmed.meta?.err) return { status: "rejected", reason: "TRANSACTION_FAILED" };
  const events = decodeTransactionEvents(confirmed as never, programId);
  if (events.length === 0) return { status: "rejected", reason: "NO_LOCATE_EVENT" };
  for (const event of events) {
    const fields = event.fields;
    if (event.kind === "loan_returned") {
  const got = delta(confirmed, String(fields.mint), String(fields.lender));
      if (got === null || got !== BigInt(String(fields.netReceivedRaw))) return { status: "rejected", reason: "BALANCE_MISMATCH" };
    }
    if (event.kind === "loan_taken") {
      const got = delta(confirmed, String(fields.mint), String(fields.borrower));
      const vaultOwner = fields.loan ? String(fields.loan) : "";
      const vault = balanceOf(confirmed.meta as never, usdcMint.toBase58(), vaultOwner, "post");
      if (got === null || got !== BigInt(String(fields.borrowerReceivedRaw))) return { status: "rejected", reason: "BALANCE_MISMATCH" };
      if (vault === null || vault !== BigInt(String(fields.collateralUsdc))) return { status: "rejected", reason: "BALANCE_MISMATCH" };
    }
    if (event.kind === "loan_claimed") {
      const got = delta(confirmed, usdcMint.toBase58(), String(fields.lender));
      if (got === null || got !== BigInt(String(fields.collateralUsdc))) return { status: "rejected", reason: "BALANCE_MISMATCH" };
    }
  }
  const commitment = finalized ? "finalized" : "confirmed";
  return {
    status: commitment === "finalized" ? "verified" : "pending",
    commitment,
    events,
    slot: confirmed.slot,
    blockTime: confirmed.blockTime ?? null,
  };
}