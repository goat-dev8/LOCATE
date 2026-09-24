import { epochFee, grossForNet } from "./fees.js";

export const ILLUSTRATIVE =
  "Illustrative. Scales today's buy quote. Ignores liquidity, slippage changes, and a fee change. Not a forecast and not advice.";

export function protocolEconomics(input: { amountRaw: bigint; feeBps: number; maxFee: bigint; collateralUsdc: bigint; feeUsdc: bigint; feePending?: boolean }) {
  if (input.feePending) return { unavailable: "fee_pending" as const };
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
    collateralNote: "returned if you deliver" as const,
    feeNote: "cost on both return and claim" as const,
    advisory: true as const,
    settlementIndependent: true as const,
  };
}

export function quoteEconomics(input: {
  receivedRaw: bigint;
  returnGrossRaw: bigint;
  feeUsdc: bigint;
  proceedsMin: bigint | null;
  buyOut: bigint | null;
  quoteAgeMs: number;
}) {
  if (input.proceedsMin === null || input.buyOut === null || input.quoteAgeMs > 20_000) {
    return { breakeven: null as null, reason: "quote_missing_or_stale" as const };
  }
  if (input.buyOut < input.returnGrossRaw) return { breakeven: null, reason: "buy_cannot_prove_gross" as const };
  if (input.proceedsMin <= input.feeUsdc) return { breakeven: null, reason: "fee_exceeds_proceeds" as const };
  const breakevenPerRaw = (input.proceedsMin - input.feeUsdc) / input.returnGrossRaw;
  const sellPerRaw = input.proceedsMin / input.receivedRaw;
  const dropBps = sellPerRaw === 0n ? 0n : ((sellPerRaw - breakevenPerRaw) * 10000n) / sellPerRaw;
  return { breakeven: { dropBps, breakevenPerRaw, sellPerRaw }, reason: null };
}
