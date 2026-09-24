import { PublicKey, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import { type Cluster, type OfferTerms } from "./builders.js";
export type Quote = {
    outAmount: string;
    inAmount: string;
    fetchedAt: number;
    raw: unknown;
};
export declare function jupiterQuote(base: string, query: URLSearchParams, now?: number, previous?: Quote): Promise<Quote>;
export declare function guardSwap(instructions: TransactionInstruction[], protectedAccounts: PublicKey[]): void;
export declare function messageBytes(tx: VersionedTransaction): number;
export declare const SIZE_LIMIT = 1112;
export declare function buildTakeAndSellTx(cluster: Cluster, borrower: PublicKey, terms: OfferTerms, swap: TransactionInstruction[], programId?: PublicKey): {
    atomic: TransactionInstruction[];
    fallback: TransactionInstruction[][];
};
export declare function buildBuyAndReturnTx(borrower: PublicKey, terms: OfferTerms, maxGrossRaw: bigint, swap: TransactionInstruction[], programId?: PublicKey): {
    atomic: TransactionInstruction[];
    fallback: TransactionInstruction[][];
};
