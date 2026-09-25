import { describe, expect, it } from "vitest";
import { premiumBps, protocolEconomics, quoteEconomics, scenario } from "../src/market/economics.js";
import { buildOpportunities, type OfferInput, type OpportunityInput } from "../src/market/opportunities.js";

const symbols = ["ANDURIL", "ANTHROPIC", "FIGUREAI", "KALSHI", "NEURALINK", "OPENAI", "POLYMARKET", "SPACEX"];
function catalog(mark = 1_000_000n, token = 1_100_000n): OpportunityInput[] {
  return symbols.map((symbol) => ({ symbol, mint: symbol + "-mint", tokenMicro: token, markMicro: mark }));
}
function offer(mint: string, amountRaw = 100n, feeUsdc = 5n, termSecs = 3600n): OfferInput {
  return { pubkey: mint + "-offer", mint, amountRaw, collateralUsdc: 10n, feeUsdc, termSecs, funded: true };
}

describe("economics", () => {
  it("O-01 premium rounds down", () => {
    expect(premiumBps(1_309_480_000n, 1_025_100_000n)).toBe(2774n);
  });
  it("O-03 missing mark is null", () => {
    expect(premiumBps(100n, null)).toBeNull();
  });
  it("O-06 O-08 O-09 O-10 protocol facts stay in raw units", () => {
    const facts = protocolEconomics({ amountRaw: 2_018_660n, feeBps: 100, maxFee: 2n ** 64n - 1n, collateralUsdc: 1_000_000n, feeUsdc: 50_000n });
    expect("unavailable" in facts).toBe(false);
    if ("unavailable" in facts) return;
    expect(facts.receivedRaw < 2_018_660n).toBe(true);
    expect(facts.returnGrossRaw > 2_018_660n).toBe(true);
    expect(facts.extraRaw).toBe(facts.returnGrossRaw - facts.receivedRaw);
    expect(facts.maxLossUsdc).toBe(1_050_000n);
    expect(facts.collateralNote).toBe("returned if you deliver");
    expect(facts.feeNote).toBe("cost on both return and claim");
  });
  it("O-07 and O-15 quote economics", () => {
    const priced = quoteEconomics({ receivedRaw: 100n, returnGrossRaw: 110n, feeUsdc: 5n, proceedsMin: 50n, buyOut: 110n, quoteAgeMs: 1_000 });
    expect(priced.breakeven?.dropBps).toBeTypeOf("bigint");
    const missing = quoteEconomics({ receivedRaw: 100n, returnGrossRaw: 110n, feeUsdc: 5n, proceedsMin: 50n, buyOut: 10n, quoteAgeMs: 1_000 });
    expect(missing.breakeven).toBeNull();
    expect(missing.reason).toBe("buy_cannot_prove_gross");
  });
  it("O-12 O-13 O-14 scenarios stay illustrative", () => {
    const up = scenario({ markMicro: 1000n, tokenMicro: 1000n, scenarioBps: 2000n, buyCostToday: 100n, proceedsMin: 80n, feeUsdc: 5n });
    const flat = scenario({ markMicro: 1000n, tokenMicro: 1000n, scenarioBps: 0n, buyCostToday: 100n, proceedsMin: 80n, feeUsdc: 5n });
    const down = scenario({ markMicro: 1000n, tokenMicro: 1000n, scenarioBps: -1000n, buyCostToday: 100n, proceedsMin: 200n, feeUsdc: 5n });
    expect(up.scaledBuy).toBe(120n);
    expect(flat.scaledBuy).toBe(100n);
    expect(down.outcome > 0n).toBe(true);
    expect(down.label).toMatch(/Illustrative/);
    const even = scenario({ markMicro: 1000n, tokenMicro: 1000n, scenarioBps: 0n, buyCostToday: 75n, proceedsMin: 80n, feeUsdc: 5n });
    expect(even.outcome).toBe(0n);
  });
  it("O-16 O-17 raw economics ignore UI decimals and pending fees", () => {
    const facts = protocolEconomics({ amountRaw: 1_000_000_000n, feeBps: 100, maxFee: 100n, collateralUsdc: 1n, feeUsdc: 1n });
    if ("unavailable" in facts) throw new Error("expected facts");
    expect(facts.receivedRaw).not.toBe(1n);
    expect(protocolEconomics({ amountRaw: 10n, feeBps: 100, maxFee: 10n, collateralUsdc: 1n, feeUsdc: 1n, feePending: true })).toEqual({ unavailable: "fee_pending" });
  });
});

describe("opportunities", () => {
  it("A-01 A-03 A-05 catalog rows stay on the supplied symbols", () => {
    const rows = buildOpportunities(catalog(), [], 0);
    expect(rows.map((row) => row.symbol).sort()).toEqual([...symbols].sort());
    expect(rows.every((row) => row.bestOffer === null)).toBe(true);
    expect(rows.every((row) => row.state === "NO_SUPPLY")).toBe(true);
  });
  it("A-02 a catalog offer creates its row", () => {
    const rows = buildOpportunities(catalog(), [offer("SPACEX-mint")], 0);
    expect(rows.find((row) => row.symbol === "SPACEX")?.state).toBe("BORROWABLE");
  });
  it("A-04 A-06 only the funded positive-premium row is borrowable", () => {
    const neural = buildOpportunities(catalog(), [offer("NEURALINK-mint")], 0);
    expect(neural.find((row) => row.symbol === "NEURALINK")?.action).toBe("TAKE_OFFER");
    expect(neural.find((row) => row.symbol === "OPENAI")?.action).toBe("LIST_YOURS");
    const anduril = buildOpportunities(catalog(), [offer("ANDURIL-mint")], 0);
    expect(anduril.find((row) => row.symbol === "ANDURIL")?.state).toBe("BORROWABLE");
    expect(anduril.filter((row) => row.bestOffer).map((row) => row.symbol)).toEqual(["ANDURIL"]);
  });
  it("A-07 O-02 O-04 stale, missing mark, and a new symbol", () => {
    const stale = buildOpportunities(catalog(), [offer("ANDURIL-mint")], 121_000);
    expect(stale.every((row) => row.state === "STALE_DATA" && row.premiumBps === null)).toBe(true);
    const missing = catalog();
    missing[0] = { ...missing[0]!, markMicro: null };
    const rows = buildOpportunities(missing, [], 0);
    expect(rows.find((row) => row.symbol === "ANDURIL")?.state).toBe("UNAVAILABLE");
    expect(rows.find((row) => row.symbol === "ANDURIL")?.premiumBps).toBeNull();
    const ninth = buildOpportunities([...catalog(), { symbol: "NINTH", mint: "ninth", tokenMicro: 2n, markMicro: 1n }], [], 0);
    expect(ninth.some((row) => row.symbol === "NINTH")).toBe(true);
    expect(ninth.some((row) => row.symbol === "XAI")).toBe(false);
  });
  it("O-05 O-11 shortfall and term tie break", () => {
    const short = buildOpportunities(catalog(), [offer("OPENAI-mint", 10n)], 0, 20n);
    expect(short.find((row) => row.symbol === "OPENAI")?.bestOffer).toBeNull();
    expect(short.find((row) => row.symbol === "OPENAI")?.shortfall).toBe(10n);
    const tied = buildOpportunities(catalog(), [offer("OPENAI-mint", 100n, 5n, 7200n), { ...offer("OPENAI-mint", 100n, 5n, 60n), pubkey: "short-term" }], 0);
    expect(tied.find((row) => row.symbol === "OPENAI")?.bestOffer?.pubkey).toBe("short-term");
  });
});
