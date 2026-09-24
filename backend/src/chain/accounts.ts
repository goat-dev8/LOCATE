import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { LOAN_DISC, OFFER_DISC, decodeLoan, decodeOffer, type LoanAccount, type OfferAccount } from "./codec.js";

function memcmp(offset: number, bytes: Buffer) {
  return { memcmp: { offset, bytes: bs58.encode(bytes) } };
}

export async function loadOffers(
  connection: Connection,
  programId: PublicKey,
  filter?: { lender?: string; mint?: string },
): Promise<OfferAccount[]> {
  const filters: unknown[] = [memcmp(0, OFFER_DISC)];
  if (filter?.lender) filters.push(memcmp(10, new PublicKey(filter.lender).toBuffer()));
  if (filter?.mint) filters.push(memcmp(74, new PublicKey(filter.mint).toBuffer()));
  const accounts = await connection.getProgramAccounts(programId, {
    commitment: "confirmed",
    filters: filters as never,
  });
  return accounts.flatMap((row) => {
    const decoded = decodeOffer(row.pubkey, Buffer.from(row.account.data));
    return decoded ? [decoded] : [];
  });
}

export async function loadLoans(connection: Connection, programId: PublicKey): Promise<LoanAccount[]> {
  const accounts = await connection.getProgramAccounts(programId, {
    commitment: "confirmed",
    filters: [memcmp(0, LOAN_DISC)] as never,
  });
  return accounts.flatMap((row) => {
    const decoded = decodeLoan(row.pubkey, Buffer.from(row.account.data));
    return decoded ? [decoded] : [];
  });
}

export async function loadOffer(connection: Connection, pubkey: PublicKey): Promise<OfferAccount | null> {
  const info = await connection.getAccountInfo(pubkey, "confirmed");
  if (!info) return null;
  return decodeOffer(pubkey, Buffer.from(info.data));
}

export async function loadLoan(connection: Connection, pubkey: PublicKey): Promise<LoanAccount | null> {
  const info = await connection.getAccountInfo(pubkey, "confirmed");
  if (!info) return null;
  return decodeLoan(pubkey, Buffer.from(info.data));
}
