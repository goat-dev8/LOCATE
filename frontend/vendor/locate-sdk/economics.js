import { epochFee, grossForNet } from "./fees.js";
export const ILLUSTRATIVE = "Illustrative. Scales today's buy quote. Ignores liquidity, slippage changes, and a fee change. Not a forecast and not advice.";
export function protocolEconomics(input) {
    if (input.feePending)
        return { unavailable: "fee_pending" };
    const feeOnAmount = epochFee(input.feeBps, input.maxFee, input.amountRaw);
    const receivedRaw = input.amountRaw - feeOnAmount;
    const returnGrossRaw = grossForNet(input.feeBps, input.maxFee, input.amountRaw);
    const extraRaw = returnGrossRaw - receivedRaw;
    const extraBps = receivedRaw === 0n ? 0n : (extraRaw * 10000n + receivedRaw - 1n) / receivedRaw;
    return {
        receivedRaw,
        returnGrossRaw,
        extraRaw,
        extraBps,
        feeRaw: feeOnAmount,
        collateralUsdc: input.collateralUsdc,
        feeUsdc: input.feeUsdc,
        maxLossUsdc: input.collateralUsdc + input.feeUsdc,
        collateralNote: "returned if you deliver",
        feeNote: "cost on both return and claim",
        advisory: true,
        settlementIndependent: true,
    };
}
export function quoteEconomics(input) {
    if (input.proceedsMin === null || input.buyOut === null || input.quoteAgeMs > 20_000) {
        return { breakeven: null, reason: "quote_missing_or_stale" };
    }
    if (input.buyOut < input.returnGrossRaw)
        return { breakeven: null, reason: "buy_cannot_prove_gross" };
    if (input.proceedsMin <= input.feeUsdc)
        return { breakeven: null, reason: "fee_exceeds_proceeds" };
    const breakevenPerRaw = (input.proceedsMin - input.feeUsdc) / input.returnGrossRaw;
    const sellPerRaw = input.proceedsMin / input.receivedRaw;
    const dropBps = sellPerRaw === 0n ? 0n : ((sellPerRaw - breakevenPerRaw) * 10000n) / sellPerRaw;
    return { breakeven: { dropBps, breakevenPerRaw, sellPerRaw }, reason: null };
}
