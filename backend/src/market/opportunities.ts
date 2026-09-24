import { premiumBps } from "./economics.js";

export type OpportunityInput = {
  symbol: string;
  mint: string;
  tokenMicro: bigint | null;
  markMicro: bigint | null;
};

export type OfferInput = {
  pubkey: string;
  mint: string;
  amountRaw: bigint;
  collateralUsdc: bigint;
  feeUsdc: bigint;
  termSecs: bigint;
  funded: boolean;
};

const ORDER = ["BORROWABLE", "NO_SUPPLY", "LOW_NEGATIVE_PREMIUM", "UNAVAILABLE", "STALE_DATA"];

export function buildOpportunities(catalog: OpportunityInput[], offers: OfferInput[], ageMs: number, requestedRaw?: bigint) {
  const stale = ageMs > 120_000;
  const rows = catalog.filter((row) => row.symbol !== "SPACEX").map((row) => {
    const funded = offers.filter((offer) => offer.mint === row.mint && offer.funded && (requestedRaw === undefined || offer.amountRaw >= requestedRaw));
    const short = offers.filter((offer) => offer.mint === row.mint && offer.funded && requestedRaw !== undefined && offer.amountRaw < requestedRaw);
    const supply = funded.reduce((sum, offer) => sum + offer.amountRaw, 0n);
    const best = [...funded].sort((a, b) => {
      const left = a.feeUsdc * 1_000_000n / a.amountRaw;
      const right = b.feeUsdc * 1_000_000n / b.amountRaw;
      if (left !== right) return left < right ? -1 : 1;
      if (a.termSecs !== b.termSecs) return a.termSecs < b.termSecs ? -1 : 1;
      return 0;
    })[0] ?? null;
    const premium = premiumBps(row.tokenMicro, row.markMicro);
    const missing = row.tokenMicro === null || row.markMicro === null || row.markMicro === 0n;
    const state = stale ? "STALE_DATA" : missing ? "UNAVAILABLE" : premium! > 0n && supply > 0n ? "BORROWABLE" : premium! > 0n ? "NO_SUPPLY" : "LOW_NEGATIVE_PREMIUM";
    const action = best && state !== "NO_SUPPLY" ? "TAKE_OFFER" : "LIST_YOURS";
    return {
      symbol: row.symbol,
      mint: row.mint,
      state,
      premiumBps: stale || missing ? null : premium,
      fundedRaw: supply,
      bestOffer: best,
      action,
      shortfall: short.length && !best ? requestedRaw! - short[0]!.amountRaw : null,
      contextOnly: true,
    };
  });
  rows.sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state) || a.symbol.localeCompare(b.symbol));
  return rows;
}
