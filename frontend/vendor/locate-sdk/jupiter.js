import { JUPITER_V6, TOKEN } from "./constants.js";
import { buildReturnTx, buildTakeTx } from "./builders.js";
import { ata, loanPda, offerPda } from "./pdas.js";
export async function jupiterQuote(base, query, now = Date.now(), previous) {
    if (previous && now - previous.fetchedAt <= 20_000)
        return previous;
    const response = await fetch(base.replace(/\/$/, "") + "/swap/v1/quote?" + query.toString());
    if (!response.ok)
        throw new Error("jupiter quote " + response.status);
    const raw = await response.json();
    return { outAmount: raw.outAmount, inAmount: raw.inAmount, fetchedAt: now, raw };
}
export function guardSwap(instructions, protectedAccounts) {
    const swaps = instructions.filter((ix) => ix.programId.equals(JUPITER_V6));
    if (swaps.length === 0)
        throw new Error("JUPITER_PROGRAM_MISMATCH");
    const banned = new Set(protectedAccounts.map((key) => key.toBase58()));
    for (const ix of swaps) {
        for (const key of ix.keys) {
            if (banned.has(key.pubkey.toBase58()))
                throw new Error("PROTECTED_ACCOUNT_IN_SWAP");
        }
    }
}
export function messageBytes(tx) {
    return tx.message.serialize().length;
}
export const SIZE_LIMIT = 1112;
function protectedAccounts(terms, programId) {
    const offer = offerPda(terms.lender, terms.mint, terms.nonce, programId);
    const loan = loanPda(offer, programId);
    return [offer, loan, ata(loan, terms.usdcMint, TOKEN)];
}
export function buildTakeAndSellTx(cluster, borrower, terms, swap, programId) {
    if (cluster === "devnet")
        throw new Error("TAKE_AND_SELL_MAINNET_ONLY");
    const locate = buildTakeTx(borrower, terms, programId);
    guardSwap(swap, protectedAccounts(terms, programId));
    return { atomic: [...locate, ...swap], fallback: [locate, swap] };
}
export function buildBuyAndReturnTx(borrower, terms, maxGrossRaw, swap, programId) {
    guardSwap(swap, protectedAccounts(terms, programId));
    const locate = buildReturnTx(borrower, terms, maxGrossRaw, programId);
    return { atomic: [...swap, ...locate], fallback: [swap, locate] };
}
