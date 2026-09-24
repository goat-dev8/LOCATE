import { Connection, PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type EvidenceRecord = {
  cluster: "devnet";
  label: "devnet test mint mirroring OPENAI's extensions; not a PreStocks token";
  kind: string;
  signature: string | null;
  slot: number | null;
  blockTime: number | null;
  err: unknown;
  logs: string[] | null;
  preTokenBalances: unknown;
  postTokenBalances: unknown;
  programId: string;
  fetchedAt: string;
};

export async function fetchEvidence(
  connection: Connection,
  signature: string | null,
  kind: string,
  programId: string,
): Promise<EvidenceRecord> {
  let tx: ParsedTransactionWithMeta | null = null;
  if (signature) {
    tx = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
  }
  return {
    cluster: "devnet",
    label: "devnet test mint mirroring OPENAI's extensions; not a PreStocks token",
    kind,
    signature,
    slot: tx?.slot ?? null,
    blockTime: tx?.blockTime ?? null,
    err: tx?.meta?.err ?? null,
    logs: tx?.meta?.logMessages ?? null,
    preTokenBalances: tx?.meta?.preTokenBalances ?? null,
    postTokenBalances: tx?.meta?.postTokenBalances ?? null,
    programId,
    fetchedAt: new Date().toISOString(),
  };
}

export function writeEvidence(path: string, record: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(record, null, 2) + "\n");
}

export function programIdOf(id: string) {
  return new PublicKey(id);
}
