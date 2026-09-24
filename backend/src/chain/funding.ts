import { Connection, PublicKey } from "@solana/web3.js";
import type { OfferAccount } from "./codec.js";

export type Funding = { funded: boolean; fundedReason: string; amount: string; delegated: string; frozen: boolean };

export function readTokenAccount(data: Buffer, expectedDelegate: string, required: bigint): Funding {
  if (data.length < 165) return { funded: false, fundedReason: "missing", amount: "0", delegated: "0", frozen: false };
  const amount = data.readBigUInt64LE(64);
  const delegateTag = data.readUInt32LE(72);
  const delegate = delegateTag === 1 ? new PublicKey(data.subarray(76, 108)).toBase58() : null;
  const frozen = data.readUInt8(108) === 2;
  const delegated = data.readBigUInt64LE(121);
  const funded = !frozen && delegate === expectedDelegate && delegated >= required && amount >= required;
  const fundedReason = funded ? "funded" : frozen ? "frozen" : delegate !== expectedDelegate ? "delegate" : "balance";
  return { funded, fundedReason, amount: amount.toString(), delegated: delegated.toString(), frozen };
}

export async function fundOffers(connection: Connection, offers: OfferAccount[]): Promise<Map<string, Funding>> {
  const keys = offers.map((offer) => new PublicKey(offer.lenderAta));
  const infos = keys.length ? await connection.getMultipleAccountsInfo(keys, "confirmed") : [];
  const out = new Map<string, Funding>();
  offers.forEach((offer, index) => {
    const info = infos[index];
    out.set(
      offer.pubkey,
      info ? readTokenAccount(Buffer.from(info.data), offer.pubkey, BigInt(offer.amountRaw)) : { funded: false, fundedReason: "missing", amount: "0", delegated: "0", frozen: false },
    );
  });
  return out;
}
