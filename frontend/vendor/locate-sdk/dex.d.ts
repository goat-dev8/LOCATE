export declare const OPENAI_MAINNET_MINT = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
export declare const NEURALINK_MAINNET_MINT = "PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S";
export declare const DEX_QUOTE_TTL_MS = 30000;
export declare const DEX_MAX_SLIPPAGE_BPS = 100;
export declare const DEX_MIN_SOL_LAMPORTS = 5000000n;
export declare const LOCATE_PROGRAM_ID_TEXT = "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6";
export type DexSide = "sell" | "buyback";
export type DexNetwork = "mainnet" | "devnet" | "mainnet-fork" | "simulation";
export type DexGateCode = "QUOTE_EXPIRED" | "STALE_QUOTE" | "WRONG_MINT" | "WRONG_TOKEN_PROGRAM" | "INCORRECT_DECIMALS" | "TRANSFER_FEE_MISMATCH" | "INSUFFICIENT_BALANCE" | "INSUFFICIENT_SOL" | "WRONG_WALLET" | "SLIPPAGE_TOO_HIGH" | "OUTPUT_BELOW_REQUIREMENT" | "ROUTE_CHANGED" | "BUYBACK_INSUFFICIENT_OUTPUT" | "CONFIRMATION_TIMEOUT" | "RECEIPT_VERIFICATION_FAILED" | "DUPLICATE_RECEIPT" | "MINIMUM_EXECUTABLE_AMOUNT" | "LOCATE_PROGRAM_FORBIDDEN_ON_MAINNET";
export type DexGate = {
    ok: true;
} | {
    ok: false;
    code: DexGateCode;
};
export type DexBalances = {
    solLamports: bigint;
    openaiRaw: bigint;
    usdcRaw: bigint;
};
export type DexQuoteView = {
    inputMint: string;
    outputMint: string;
    inAmount: bigint;
    outAmount: bigint;
    otherAmountThreshold: bigint;
    slippageBps: number;
    fetchedAt: number;
    routeLabels: string[];
    swapMode: "ExactIn" | "ExactOut";
};
export declare function dexLayer(network: DexNetwork): DexNetwork;
export declare function forbidLocateOnMainnetDex(programIds: readonly string[]): DexGate;
export declare function evaluateDexQuote(input: {
    now: number;
    wallet: string;
    expectedWallet: string;
    side: DexSide;
    quote: DexQuoteView;
    mint: string;
    tokenProgram: string;
    decimals: number;
    feeBps: number;
    expectedFeeBps: number;
    balances: DexBalances;
    minOut: bigint;
    maxSlippageBps?: number;
    priorRouteLabels?: string[];
}): DexGate;
export declare function evaluateDexConfirmation(input: {
    submittedAt: number;
    now: number;
    lastValidBlockHeight: number;
    currentHeight: number;
    err: unknown;
    confirmationStatus: string | null;
    timeoutMs?: number;
}): DexGate;
export declare function evaluateDexReceipt(input: {
    network: DexNetwork;
    err: unknown;
    signature: string;
    seenSignatures: readonly string[];
    programIds: readonly string[];
    side: DexSide;
    quote: DexQuoteView;
    before: DexBalances;
    after: DexBalances;
}): DexGate;
export declare function reconcileDexBalances(input: {
    before: DexBalances;
    after: DexBalances;
    txFeeLamports: bigint;
    transferFeeRaw: bigint;
    actualOut: bigint;
    expectedOut: bigint;
}): {
    solDelta: bigint;
    openaiDelta: bigint;
    usdcDelta: bigint;
    slippageRaw: bigint;
    txFeeLamports: bigint;
    transferFeeRaw: bigint;
};
export declare function shouldRefreshAfterVerify(verified: boolean): boolean;
export declare function usdcProgram(): string;
export declare function openaiProgram(): string;
