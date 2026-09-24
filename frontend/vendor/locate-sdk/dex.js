import { MAINNET_USDC, TOKEN, TOKEN_2022 } from "./constants.js";
export const OPENAI_MAINNET_MINT = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
export const NEURALINK_MAINNET_MINT = "PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S";
export const DEX_QUOTE_TTL_MS = 30_000;
export const DEX_MAX_SLIPPAGE_BPS = 100;
export const DEX_MIN_SOL_LAMPORTS = 5000000n;
export const LOCATE_PROGRAM_ID_TEXT = "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6";
const TOKEN_2022_TEXT = TOKEN_2022.toBase58();
const TOKEN_TEXT = TOKEN.toBase58();
const USDC_TEXT = MAINNET_USDC.toBase58();
export function dexLayer(network) {
    return network;
}
export function forbidLocateOnMainnetDex(programIds) {
    if (programIds.includes(LOCATE_PROGRAM_ID_TEXT)) {
        return { ok: false, code: "LOCATE_PROGRAM_FORBIDDEN_ON_MAINNET" };
    }
    return { ok: true };
}
export function evaluateDexQuote(input) {
    if (input.wallet !== input.expectedWallet)
        return { ok: false, code: "WRONG_WALLET" };
    const age = input.now - input.quote.fetchedAt;
    if (age > DEX_QUOTE_TTL_MS)
        return { ok: false, code: "QUOTE_EXPIRED" };
    if (age > 20_000)
        return { ok: false, code: "STALE_QUOTE" };
    const expectedIn = input.side === "sell" ? OPENAI_MAINNET_MINT : USDC_TEXT;
    const expectedOut = input.side === "sell" ? USDC_TEXT : OPENAI_MAINNET_MINT;
    if (input.quote.inputMint !== expectedIn || input.quote.outputMint !== expectedOut || input.mint !== OPENAI_MAINNET_MINT) {
        return { ok: false, code: "WRONG_MINT" };
    }
    if (input.tokenProgram !== TOKEN_2022_TEXT)
        return { ok: false, code: "WRONG_TOKEN_PROGRAM" };
    if (input.decimals !== 9)
        return { ok: false, code: "INCORRECT_DECIMALS" };
    if (input.feeBps !== input.expectedFeeBps)
        return { ok: false, code: "TRANSFER_FEE_MISMATCH" };
    const maxSlip = input.maxSlippageBps ?? DEX_MAX_SLIPPAGE_BPS;
    if (input.quote.slippageBps > maxSlip)
        return { ok: false, code: "SLIPPAGE_TOO_HIGH" };
    if (input.quote.outAmount < input.minOut || input.quote.otherAmountThreshold < input.minOut) {
        return { ok: false, code: input.side === "buyback" ? "BUYBACK_INSUFFICIENT_OUTPUT" : "OUTPUT_BELOW_REQUIREMENT" };
    }
    if (input.priorRouteLabels && input.priorRouteLabels.join(">") !== input.quote.routeLabels.join(">")) {
        return { ok: false, code: "ROUTE_CHANGED" };
    }
    if (input.balances.solLamports < DEX_MIN_SOL_LAMPORTS)
        return { ok: false, code: "INSUFFICIENT_SOL" };
    if (input.side === "sell" && input.balances.openaiRaw < input.quote.inAmount) {
        return { ok: false, code: "INSUFFICIENT_BALANCE" };
    }
    if (input.side === "buyback" && input.balances.usdcRaw < input.quote.inAmount) {
        return { ok: false, code: "INSUFFICIENT_BALANCE" };
    }
    if (input.quote.inAmount === 0n)
        return { ok: false, code: "MINIMUM_EXECUTABLE_AMOUNT" };
    return { ok: true };
}
export function evaluateDexConfirmation(input) {
    if (input.err)
        return { ok: false, code: "RECEIPT_VERIFICATION_FAILED" };
    const timeout = input.timeoutMs ?? 90_000;
    if (!input.confirmationStatus &&
        (input.now - input.submittedAt >= timeout || input.currentHeight > input.lastValidBlockHeight)) {
        return { ok: false, code: "CONFIRMATION_TIMEOUT" };
    }
    if (input.confirmationStatus !== "finalized")
        return { ok: false, code: "CONFIRMATION_TIMEOUT" };
    return { ok: true };
}
export function evaluateDexReceipt(input) {
    if (input.network === "mainnet" && input.programIds.includes(LOCATE_PROGRAM_ID_TEXT)) {
        return { ok: false, code: "LOCATE_PROGRAM_FORBIDDEN_ON_MAINNET" };
    }
    if (input.seenSignatures.includes(input.signature))
        return { ok: false, code: "DUPLICATE_RECEIPT" };
    if (input.err)
        return { ok: false, code: "RECEIPT_VERIFICATION_FAILED" };
    const openaiDelta = input.after.openaiRaw - input.before.openaiRaw;
    const usdcDelta = input.after.usdcRaw - input.before.usdcRaw;
    if (input.side === "sell") {
        if (openaiDelta >= 0n || usdcDelta <= 0n)
            return { ok: false, code: "RECEIPT_VERIFICATION_FAILED" };
        if (usdcDelta < input.quote.otherAmountThreshold)
            return { ok: false, code: "OUTPUT_BELOW_REQUIREMENT" };
    }
    else {
        if (openaiDelta <= 0n || usdcDelta >= 0n)
            return { ok: false, code: "RECEIPT_VERIFICATION_FAILED" };
        if (openaiDelta < input.quote.otherAmountThreshold)
            return { ok: false, code: "BUYBACK_INSUFFICIENT_OUTPUT" };
    }
    return { ok: true };
}
export function reconcileDexBalances(input) {
    return {
        solDelta: input.after.solLamports - input.before.solLamports,
        openaiDelta: input.after.openaiRaw - input.before.openaiRaw,
        usdcDelta: input.after.usdcRaw - input.before.usdcRaw,
        slippageRaw: input.expectedOut > input.actualOut ? input.expectedOut - input.actualOut : 0n,
        txFeeLamports: input.txFeeLamports,
        transferFeeRaw: input.transferFeeRaw,
    };
}
export function shouldRefreshAfterVerify(verified) {
    return verified;
}
export function usdcProgram() {
    return TOKEN_TEXT;
}
export function openaiProgram() {
    return TOKEN_2022_TEXT;
}
