import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { EVENT_DISCS, EVENT_IX_TAG, eventAuthority, readI64, readPubkey, readU16, readU64 } from "./codec.js";

export type DecodedEvent = {
  kind: "offer_created" | "offer_cancelled" | "loan_taken" | "loan_returned" | "loan_claimed";
  eventIndex: number;
  fields: Record<string, string | number>;
};

function kindOf(disc: Buffer): DecodedEvent["kind"] | null {
  for (const [kind, bytes] of Object.entries(EVENT_DISCS)) {
    if (disc.equals(bytes)) return kind as DecodedEvent["kind"];
  }
  return null;
}

export function decodeEventData(data: Buffer): Omit<DecodedEvent, "eventIndex"> | null {
  if (data.length < 16 || !data.subarray(0, 8).equals(EVENT_IX_TAG)) return null;
  const kind = kindOf(data.subarray(8, 16));
  if (!kind) return null;
  let o = 16;
  const pub = () => {
    const row = readPubkey(data, o);
    o = row.offset;
    return row.key.toBase58();
  };
  const u64 = () => {
    const row = readU64(data, o);
    o = row.offset;
    return row.n.toString();
  };
  const i64 = () => {
    const row = readI64(data, o);
    o = row.offset;
    return row.n.toString();
  };
  if (kind === "offer_created") {
    return { kind, fields: { offer: pub(), lender: pub(), lenderAta: pub(), mint: pub(), nonce: u64(), amountRaw: u64(), collateralUsdc: u64(), feeUsdc: u64(), termSecs: i64(), graceSecs: i64(), expiresAt: i64() } };
  }
  if (kind === "offer_cancelled") return { kind, fields: { offer: pub(), lender: pub(), mint: pub() } };
  if (kind === "loan_taken") {
    const fields = { offer: pub(), loan: pub(), lender: pub(), borrower: pub(), mint: pub(), amountRaw: u64(), borrowerReceivedRaw: u64(), collateralUsdc: u64(), feeUsdc: u64() };
    const bps = readU16(data, o); o = bps.offset;
    return { kind, fields: { ...fields, feeBps: bps.n, startTs: i64(), maturityTs: i64(), claimAfterTs: i64() } };
  }
  if (kind === "loan_returned") {
    const fields = { loan: pub(), offer: pub(), lender: pub(), borrower: pub(), mint: pub(), amountRaw: u64(), grossRaw: u64(), netReceivedRaw: u64() };
    const bps = readU16(data, o); o = bps.offset;
    return { kind, fields: { ...fields, feeBps: bps.n, collateralReleased: u64() } };
  }
  return { kind, fields: { loan: pub(), offer: pub(), lender: pub(), borrower: pub(), mint: pub(), amountRaw: u64(), collateralUsdc: u64(), claimedBy: pub() } };
}

type Ix = { programIdIndex: number; accounts: number[]; data: string };
type Tx = {
  transaction: { message: { accountKeys: Array<string | { pubkey: string }>; instructions: Ix[] } };
  meta: {
    err: unknown;
    innerInstructions?: Array<{ index: number; instructions: Ix[] }>;
    preTokenBalances?: Array<{ accountIndex: number; mint: string; owner?: string; uiTokenAmount: { amount: string } }>;
    postTokenBalances?: Array<{ accountIndex: number; mint: string; owner?: string; uiTokenAmount: { amount: string } }>;
    loadedAddresses?: { writable?: string[]; readonly?: string[] };
  } | null;
};

function asKey(key: unknown): string {
  if (typeof key === "string") return key;
  if (key && typeof key === "object" && "toBase58" in key && typeof key.toBase58 === "function") return key.toBase58();
  if (key && typeof key === "object" && "pubkey" in key) return asKey((key as { pubkey: unknown }).pubkey);
  return "";
}

function keyAt(tx: Tx, index: number): string {
  const keys = tx.transaction.message.accountKeys.map(asKey);
  const loaded = [...(tx.meta?.loadedAddresses?.writable ?? []), ...(tx.meta?.loadedAddresses?.readonly ?? [])].map(asKey);
  return keys.concat(loaded)[index] ?? "";
}

export function decodeTransactionEvents(tx: Tx, programId: PublicKey): DecodedEvent[] {
  const authority = eventAuthority().toBase58();
  const events: DecodedEvent[] = [];
  let eventIndex = 0;
  for (const group of tx.meta?.innerInstructions ?? []) {
    for (const ix of group.instructions) {
      if (keyAt(tx, ix.programIdIndex) !== programId.toBase58()) continue;
      const data = Buffer.from(bs58.decode(ix.data));
      const decoded = decodeEventData(data);
      if (!decoded) continue;
      if (keyAt(tx, ix.accounts[0] ?? -1) !== authority) continue;
      events.push({ ...decoded, eventIndex });
      eventIndex += 1;
    }
  }
  return events;
}

export function balanceOf(rows: Tx["meta"], mint: string, owner: string, which: "pre" | "post"): bigint | null {
  const list = which === "pre" ? rows?.preTokenBalances : rows?.postTokenBalances;
  const row = list?.find((item) => item.mint === mint && item.owner === owner);
  return row ? BigInt(row.uiTokenAmount.amount) : null;
}