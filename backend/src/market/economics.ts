import { epochFee, grossForNet } from "../chain/mint.js";

export const ILLUSTRATIVE =
  "Illustrative. Scales today's buy quote. Ignores liquidity, slippage changes, and a fee change. Not a forecast and not advice.";

export function presentMarket(input: { ageMs: number; tokenMicro: bigint | null; markMicro: bigint | null; dexUsd: string | null; dexAgeMs: number }) {
  const stale = input.ageMs > 120_000 || input.dexAgeMs > 120_000 || input.markMicro === null || input.markMicro === 0n;
  const hide = input.ageMs > 120_000 || input.markMicro === null || input.markMicro === 0n;
  const premium = hide ? null : premiumBps(input.tokenMicro, input.markMicro);
  return {
    tokenPrice: hide || input.tokenMicro === null ? null : input.tokenMicro.toString(),
    markPrice: hide ? null : input.markMicro!.toString(),
    premiumBps: premium === null ? null : premium.toString(),
    dexUsd: input.dexAgeMs > 120_000 ? null : input.dexUsd,
    stale,
  };
}

export function premiumBps(tokenMicro: bigint | null, markMicro: bigint | null): bigint | null {
  if (tokenMicro === null || markMicro === null || markMicro === 0n) return null;
  return ((tokenMicro - markMicro) * 10000n) / markMicro;
}

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
    collateralNote: "returned if you deliver",
    feeNote: "cost on both return and claim",
    advisory: true,
    settlementIndependent: true,
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
    return { breakeven: null as null, reason: "quote_missing_or_stale" };
  }
  if (input.buyOut < input.returnGrossRaw) return { breakeven: null, reason: "buy_cannot_prove_gross" };
  if (input.proceedsMin <= input.feeUsdc) return { breakeven: null, reason: "fee_exceeds_proceeds" };
  const breakevenPerRaw = (input.proceedsMin - input.feeUsdc) / input.returnGrossRaw;
  const sellPerRaw = input.proceedsMin / input.receivedRaw;
  const dropBps = sellPerRaw === 0n ? 0n : ((sellPerRaw - breakevenPerRaw) * 10000n) / sellPerRaw;
  return { breakeven: { dropBps, breakevenPerRaw, sellPerRaw }, reason: null };
}

export function scenario(input: { markMicro: bigint; tokenMicro: bigint; scenarioBps: bigint; buyCostToday: bigint; proceedsMin: bigint; feeUsdc: bigint }) {
  const terminalMicro = (input.markMicro * (10000n + input.scenarioBps)) / 10000n;
  const scaledBuy = (input.buyCostToday * terminalMicro) / input.tokenMicro;
  return { scaledBuy, outcome: input.proceedsMin - input.feeUsdc - scaledBuy, label: ILLUSTRATIVE };
}
