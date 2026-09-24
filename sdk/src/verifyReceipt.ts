import { Connection, PublicKey } from "@solana/web3.js";

export type BrowserVerifyResult =
  | { ok: true; status: "verified" | "pending"; slot: number; commitment: "finalized" | "confirmed" }
  | { ok: false; status: "rejected"; reason: string };

export async function verifyReceiptInBrowser(
  signature: string,
  rpc: string,
  programId: string,
): Promise<BrowserVerifyResult> {
  const connection = new Connection(rpc, "confirmed");
  const program = new PublicKey(programId);
  const finalized = await connection.getTransaction(signature, {
    commitment: "finalized",
    maxSupportedTransactionVersion: 0,
  });
  const confirmed =
    finalized ??
    (await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    }));
  if (!confirmed) return { ok: false, status: "rejected", reason: "NOT_FOUND" };
  if (confirmed.meta?.err) return { ok: false, status: "rejected", reason: "TRANSACTION_FAILED" };
  const serialized = JSON.stringify(confirmed);
  if (!serialized.includes(program.toBase58())) {
    return { ok: false, status: "rejected", reason: "NO_LOCATE_EVENT" };
  }
  return {
    ok: true,
    status: finalized ? "verified" : "pending",
    slot: confirmed.slot,
    commitment: finalized ? "finalized" : "confirmed",
  };
}
