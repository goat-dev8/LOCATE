import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6");
export const EVENT_IX_TAG = Buffer.from("e445a52e51cb9a1d", "hex");
export const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

export function disc(name: string): Buffer {
  return createHash("sha256").update(name).digest().subarray(0, 8);
}

export const OFFER_DISC = disc("account:Offer");
export const LOAN_DISC = disc("account:Loan");

export const EVENT_DISCS = {
  offer_created: disc("event:OfferCreated"),
  offer_cancelled: disc("event:OfferCancelled"),
  loan_taken: disc("event:LoanTaken"),
  loan_returned: disc("event:LoanReturned"),
  loan_claimed: disc("event:LoanClaimed"),
} as const;

export function eventAuthority(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], PROGRAM_ID)[0];
}

export function readPubkey(buf: Buffer, offset: number): { key: PublicKey; offset: number } {
  return { key: new PublicKey(buf.subarray(offset, offset + 32)), offset: offset + 32 };
}

export function readU64(buf: Buffer, offset: number): { n: bigint; offset: number } {
  return { n: buf.readBigUInt64LE(offset), offset: offset + 8 };
}

export function readI64(buf: Buffer, offset: number): { n: bigint; offset: number } {
  return { n: buf.readBigInt64LE(offset), offset: offset + 8 };
}

export function readU16(buf: Buffer, offset: number): { n: number; offset: number } {
  return { n: buf.readUInt16LE(offset), offset: offset + 2 };
}

export function readU8(buf: Buffer, offset: number): { n: number; offset: number } {
  return { n: buf.readUInt8(offset), offset: offset + 1 };
}

export type OfferAccount = {
  pubkey: string;
  lender: string;
  lenderAta: string;
  mint: string;
  nonce: string;
  amountRaw: string;
  collateralUsdc: string;
  feeUsdc: string;
  termSecs: string;
  graceSecs: string;
  expiresAt: string;
  createdAt: string;
};

export function decodeOffer(pubkey: PublicKey, data: Buffer): OfferAccount | null {
  if (data.length < 202 || !data.subarray(0, 8).equals(OFFER_DISC)) return null;
  let o = 10;
  const lender = readPubkey(data, o); o = lender.offset;
  const lenderAta = readPubkey(data, o); o = lenderAta.offset;
  const mint = readPubkey(data, o); o = mint.offset;
  const nonce = readU64(data, o); o = nonce.offset;
  const amount = readU64(data, o); o = amount.offset;
  const collateral = readU64(data, o); o = collateral.offset;
  const fee = readU64(data, o); o = fee.offset;
  const term = readI64(data, o); o = term.offset;
  const grace = readI64(data, o); o = grace.offset;
  const expires = readI64(data, o); o = expires.offset;
  const created = readI64(data, o);
  return {
    pubkey: pubkey.toBase58(),
    lender: lender.key.toBase58(),
    lenderAta: lenderAta.key.toBase58(),
    mint: mint.key.toBase58(),
    nonce: nonce.n.toString(),
    amountRaw: amount.n.toString(),
    collateralUsdc: collateral.n.toString(),
    feeUsdc: fee.n.toString(),
    termSecs: term.n.toString(),
    graceSecs: grace.n.toString(),
    expiresAt: expires.n.toString(),
    createdAt: created.n.toString(),
  };
}

export type LoanAccount = {
  pubkey: string;
  offer: string;
  lender: string;
  lenderAta: string;
  borrower: string;
  mint: string;
  amountRaw: string;
  collateralUsdc: string;
  feeUsdc: string;
  startTs: string;
  maturityTs: string;
  claimAfterTs: string;
  feeBpsAtTake: number;
};

export function decodeLoan(pubkey: PublicKey, data: Buffer): LoanAccount | null {
  if (data.length < 253 || !data.subarray(0, 8).equals(LOAN_DISC)) return null;
  let o = 11;
  const offer = readPubkey(data, o); o = offer.offset;
  const lender = readPubkey(data, o); o = lender.offset;
  const lenderAta = readPubkey(data, o); o = lenderAta.offset;
  const borrower = readPubkey(data, o); o = borrower.offset;
  const mint = readPubkey(data, o); o = mint.offset;
  const amount = readU64(data, o); o = amount.offset;
  const collateral = readU64(data, o); o = collateral.offset;
  const fee = readU64(data, o); o = fee.offset;
  const start = readI64(data, o); o = start.offset;
  const maturity = readI64(data, o); o = maturity.offset;
  const claimAfter = readI64(data, o); o = claimAfter.offset;
  const feeBps = readU16(data, o);
  return {
    pubkey: pubkey.toBase58(),
    offer: offer.key.toBase58(),
    lender: lender.key.toBase58(),
    lenderAta: lenderAta.key.toBase58(),
    borrower: borrower.key.toBase58(),
    mint: mint.key.toBase58(),
    amountRaw: amount.n.toString(),
    collateralUsdc: collateral.n.toString(),
    feeUsdc: fee.n.toString(),
    startTs: start.n.toString(),
    maturityTs: maturity.n.toString(),
    claimAfterTs: claimAfter.n.toString(),
    feeBpsAtTake: feeBps.n,
  };
}
