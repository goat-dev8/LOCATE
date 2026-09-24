import { describe, expect, it } from "vitest";
import {
  DEX_MIN_SOL_LAMPORTS,
  LOCATE_PROGRAM_ID_TEXT,
  OPENAI_MAINNET_MINT,
  evaluateDexConfirmation,
  evaluateDexQuote,
  evaluateDexReceipt,
  forbidLocateOnMainnetDex,
  reconcileDexBalances,
  shouldRefreshAfterVerify,
  type DexQuoteView,
} from "../src/dex.js";
import { MAINNET_USDC, TOKEN_2022 } from "../src/constants.js";

const wallet = "Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC";
const quote = (over: Partial<DexQuoteView> = {}): DexQuoteView => ({
  inputMint: OPENAI_MAINNET_MINT,
  outputMint: MAINNET_USDC.toBase58(),
  inAmount: 1_000n,
  outAmount: 2_000n,
  otherAmountThreshold: 1_980n,
  slippageBps: 100,
  fetchedAt: 1_000,
  routeLabels: ["Meteora DLMM"],
  swapMode: "ExactIn",
  ...over,
});

const funded = { solLamports: DEX_MIN_SOL_LAMPORTS, openaiRaw: 5_000n, usdcRaw: 10_000n };

function sell(over: Parameters<typeof evaluateDexQuote>[0] extends infer T ? Partial<T> : never) {
  return evaluateDexQuote({
    now: 1_000,
    wallet,
    expectedWallet: wallet,
    side: "sell",
    quote: quote(),
    mint: OPENAI_MAINNET_MINT,
    tokenProgram: TOKEN_2022.toBase58(),
    decimals: 9,
    feeBps: 100,
    expectedFeeBps: 100,
    balances: funded,
    minOut: 1_000n,
    ...over,
  });
}

describe("mainnet dex gates", () => {
  it("accepts a fresh sell quote with matching mint, program, decimals, and fee", () => {
    expect(sell({}).ok).toBe(true);
  });

  it("rejects a quote older than 30 seconds as expired", () => {
    expect(sell({ now: 1_000 + 30_001 }).ok).toBe(false);
    if (!sell({ now: 1_000 + 30_001 }).ok) expect(sell({ now: 1_000 + 30_001 }).code).toBe("QUOTE_EXPIRED");
  });

  it("rejects a quote older than 20 seconds as stale", () => {
    const result = sell({ now: 21_001 });
    expect(result).toEqual({ ok: false, code: "STALE_QUOTE" });
  });

  it("rejects the wrong mint", () => {
    expect(sell({ mint: MAINNET_USDC.toBase58() })).toEqual({ ok: false, code: "WRONG_MINT" });
    expect(sell({ quote: quote({ outputMint: OPENAI_MAINNET_MINT }) })).toEqual({ ok: false, code: "WRONG_MINT" });
  });

  it("rejects the classic token program for OpenAI", () => {
    expect(sell({ tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" })).toEqual({
      ok: false,
      code: "WRONG_TOKEN_PROGRAM",
    });
  });

  it("rejects incorrect decimals", () => {
    expect(sell({ decimals: 6 })).toEqual({ ok: false, code: "INCORRECT_DECIMALS" });
  });

  it("rejects a transfer-fee mismatch", () => {
    expect(sell({ feeBps: 50 })).toEqual({ ok: false, code: "TRANSFER_FEE_MISMATCH" });
  });

  it("rejects an OpenAI balance below the quoted input", () => {
    expect(sell({ balances: { ...funded, openaiRaw: 10n } })).toEqual({ ok: false, code: "INSUFFICIENT_BALANCE" });
  });

  it("rejects insufficient SOL", () => {
    expect(sell({ balances: { ...funded, solLamports: 1n } })).toEqual({ ok: false, code: "INSUFFICIENT_SOL" });
  });

  it("rejects the wrong wallet", () => {
    expect(sell({ wallet: "11111111111111111111111111111111" })).toEqual({ ok: false, code: "WRONG_WALLET" });
  });

  it("rejects slippage above the cap", () => {
    expect(sell({ quote: quote({ slippageBps: 250 }) })).toEqual({ ok: false, code: "SLIPPAGE_TOO_HIGH" });
  });

  it("rejects output below the required minimum", () => {
    expect(sell({ minOut: 10_000n })).toEqual({ ok: false, code: "OUTPUT_BELOW_REQUIREMENT" });
  });

  it("rejects a changed route", () => {
    expect(sell({ priorRouteLabels: ["Orca"] })).toEqual({ ok: false, code: "ROUTE_CHANGED" });
  });

  it("rejects a buyback that cannot reacquire the required tokens", () => {
    const result = evaluateDexQuote({
      now: 1_000,
      wallet,
      expectedWallet: wallet,
      side: "buyback",
      quote: quote({
        inputMint: MAINNET_USDC.toBase58(),
        outputMint: OPENAI_MAINNET_MINT,
        inAmount: 3_000n,
        outAmount: 900n,
        otherAmountThreshold: 890n,
      }),
      mint: OPENAI_MAINNET_MINT,
      tokenProgram: TOKEN_2022.toBase58(),
      decimals: 9,
      feeBps: 100,
      expectedFeeBps: 100,
      balances: funded,
      minOut: 1_000n,
    });
    expect(result).toEqual({ ok: false, code: "BUYBACK_INSUFFICIENT_OUTPUT" });
  });

  it("reports confirmation timeout when the blockhash expires", () => {
    expect(
      evaluateDexConfirmation({
        submittedAt: 0,
        now: 1_000,
        lastValidBlockHeight: 10,
        currentHeight: 11,
        err: null,
        confirmationStatus: null,
      }),
    ).toEqual({ ok: false, code: "CONFIRMATION_TIMEOUT" });
  });

  it("rejects a finalized transaction whose balances do not match the quote", () => {
    const result = evaluateDexReceipt({
      network: "mainnet",
      err: null,
      signature: "sig-a",
      seenSignatures: [],
      programIds: [],
      side: "sell",
      quote: quote(),
      before: funded,
      after: { ...funded, openaiRaw: funded.openaiRaw - 1_000n, usdcRaw: funded.usdcRaw + 10n },
    });
    expect(result).toEqual({ ok: false, code: "OUTPUT_BELOW_REQUIREMENT" });
  });

  it("rejects a duplicate receipt", () => {
    expect(
      evaluateDexReceipt({
        network: "mainnet",
        err: null,
        signature: "sig-a",
        seenSignatures: ["sig-a"],
        programIds: [],
        side: "sell",
        quote: quote(),
        before: funded,
        after: { ...funded, openaiRaw: funded.openaiRaw - 1_000n, usdcRaw: funded.usdcRaw + 2_000n },
      }),
    ).toEqual({ ok: false, code: "DUPLICATE_RECEIPT" });
  });

  it("refreshes balances only after verification", () => {
    expect(shouldRefreshAfterVerify(false)).toBe(false);
    expect(shouldRefreshAfterVerify(true)).toBe(true);
  });

  it("never treats a LOCATE program id as a Mainnet DEX leg", () => {
    expect(forbidLocateOnMainnetDex([LOCATE_PROGRAM_ID_TEXT])).toEqual({
      ok: false,
      code: "LOCATE_PROGRAM_FORBIDDEN_ON_MAINNET",
    });
  });

  it("reconciles raw deltas without rounding", () => {
    const row = reconcileDexBalances({
      before: funded,
      after: { solLamports: funded.solLamports - 5_000n, openaiRaw: funded.openaiRaw - 1_000n, usdcRaw: funded.usdcRaw + 1_973n },
      txFeeLamports: 5_000n,
      transferFeeRaw: 10n,
      actualOut: 1_973n,
      expectedOut: 2_000n,
    });
    expect(row.solDelta).toBe(-5_000n);
    expect(row.openaiDelta).toBe(-1_000n);
    expect(row.usdcDelta).toBe(1_973n);
    expect(row.slippageRaw).toBe(27n);
  });
});
