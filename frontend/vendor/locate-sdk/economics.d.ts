export declare const ILLUSTRATIVE = "Illustrative. Scales today's buy quote. Ignores liquidity, slippage changes, and a fee change. Not a forecast and not advice.";
export declare function protocolEconomics(input: {
    amountRaw: bigint;
    feeBps: number;
    maxFee: bigint;
    collateralUsdc: bigint;
    feeUsdc: bigint;
    feePending?: boolean;
}): {
    unavailable: "fee_pending";
    receivedRaw?: undefined;
    returnGrossRaw?: undefined;
    extraRaw?: undefined;
    extraBps?: undefined;
    feeRaw?: undefined;
    collateralUsdc?: undefined;
    feeUsdc?: undefined;
    maxLossUsdc?: undefined;
    collateralNote?: undefined;
    feeNote?: undefined;
    advisory?: undefined;
    settlementIndependent?: undefined;
} | {
    unavailable?: undefined;
    receivedRaw: bigint;
    returnGrossRaw: bigint;
    extraRaw: bigint;
    extraBps: bigint;
    feeRaw: bigint;
    collateralUsdc: bigint;
    feeUsdc: bigint;
    maxLossUsdc: bigint;
    collateralNote: "returned if you deliver";
    feeNote: "cost on both return and claim";
    advisory: true;
    settlementIndependent: true;
};
export declare function quoteEconomics(input: {
    receivedRaw: bigint;
    returnGrossRaw: bigint;
    feeUsdc: bigint;
    proceedsMin: bigint | null;
    buyOut: bigint | null;
    quoteAgeMs: number;
}): {
    breakeven: null;
    reason: "quote_missing_or_stale";
} | {
    breakeven: null;
    reason: "buy_cannot_prove_gross";
} | {
    breakeven: null;
    reason: "fee_exceeds_proceeds";
} | {
    breakeven: {
        dropBps: bigint;
        breakevenPerRaw: bigint;
        sellPerRaw: bigint;
    };
    reason: null;
};
