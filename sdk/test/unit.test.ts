import { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { DEVNET_USDC, JUPITER_V6, LOCATE_PROGRAM_ID, TOKEN_2022 } from "../src/constants.js";
import { ata, offerPda, loanPda } from "../src/pdas.js";
import { epochFee, grossForNet, rawToUi, uiToRaw } from "../src/fees.js";
import { quoteEconomics } from "../src/economics.js";
import { createLocateApi } from "../src/api.js";
import { buildCancelTx, buildClaimTx, buildListTx, buildReturnTx, buildTakeTx, type OfferTerms } from "../src/builders.js";
import { guardSwap, jupiterQuote } from "../src/jupiter.js";
import { decodeProgramError } from "../src/simulate.js";

const lender = new PublicKey("TL3iubbaXvTg8gNwHnWN7AVrspUfy1Qq1K9yDAZFGvf");
const borrower = new PublicKey("FmZGfioFdPn7iJch3FXW3W4iDdhyXXBPhn6MJPGMU4iN");
const mint = new PublicKey("9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P");

const terms: OfferTerms = {
  lender,
  mint,
  usdcMint: DEVNET_USDC,
  nonce: 1n,
  amountRaw: 2_018_660n,
  collateralUsdc: 1_000_000n,
  feeUsdc: 50_000n,
  termSecs: 3600n,
  graceSecs: 30n,
  expiresAt: 2_000_000_000n,
  decimals: 9,
};

describe("sdk", () => {
  it("U-01 fee and inverse fee match the devnet 100 bps cycle", () => {
    expect(epochFee(100, 2n ** 64n - 1n, 2_018_660n)).toBe(20_187n);
    expect(2_018_660n - 20_187n).toBe(1_998_473n);
    const gross = grossForNet(100, 2n ** 64n - 1n, 2_018_660n);
    expect(gross - epochFee(100, 2n ** 64n - 1n, gross)).toBeGreaterThanOrEqual(2_018_660n);
  });

  it("U-03 rawToUi matches the recorded scaled balance", () => {
    expect(rawToUi(10_000_000_000n, 9, "1.4861347")).toBe("14.861347");
    expect(uiToRaw("1.5", 6)).toBe(1_500_000n);
  });

  it("U-04 PDAs are stable", () => {
    const offer = offerPda(lender, mint, 1n);
    expect(loanPda(offer).toBase58()).toHaveLength(44);
    expect(ata(lender, mint, TOKEN_2022).equals(PublicKey.findProgramAddressSync(
      [lender.toBuffer(), TOKEN_2022.toBuffer(), mint.toBuffer()],
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
    )[0])).toBe(true);
  });

  it("U-05 through U-09 instruction order matches the wallet flow", () => {
    expect(buildListTx(terms).map((ix) => ix.programId.toBase58())).toEqual([
      "ComputeBudget111111111111111111111111111111",
      TOKEN_2022.toBase58(),
      LOCATE_PROGRAM_ID.toBase58(),
    ]);
    const cancel = buildCancelTx(terms);
    expect(cancel[0]?.programId.equals(LOCATE_PROGRAM_ID)).toBe(true);
    expect(cancel[1]?.data[0]).toBe(5);
    expect(buildTakeTx(borrower, terms)[1]?.data.subarray(0, 8).length).toBe(8);
    const ret = buildReturnTx(borrower, terms, 2_039_051n);
    expect(ret.map((ix) => ix.programId.toBase58())[1]).toBe(TOKEN_2022.toBase58());
    expect(ret[2]?.programId.equals(LOCATE_PROGRAM_ID)).toBe(true);
    expect(ret[3]?.data[0]).toBe(5);
    expect(buildClaimTx(lender, borrower, terms)[1]?.keys[0]?.pubkey.equals(lender)).toBe(true);
  });

  it("U-10 quoteEconomics does not invent a break-even for a stale quote", () => {
    expect(quoteEconomics({ receivedRaw: 10n, returnGrossRaw: 11n, feeUsdc: 1n, proceedsMin: 5n, buyOut: 11n, quoteAgeMs: 21_000 }).reason).toBe("quote_missing_or_stale");
  });

  it("I-05 rejects a swap that is not Jupiter or that touches the vault", () => {
    const wrong = new TransactionInstruction({ programId: Keypair.generate().publicKey, keys: [], data: Buffer.alloc(0) });
    expect(() => guardSwap([wrong], [])).toThrow(/JUPITER_PROGRAM_MISMATCH/);
    const offer = offerPda(lender, mint, 1n);
    const vault = ata(loanPda(offer), DEVNET_USDC, new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"));
    const bad = new TransactionInstruction({
      programId: JUPITER_V6,
      keys: [{ pubkey: vault, isSigner: false, isWritable: true }],
      data: Buffer.alloc(0),
    });
    expect(() => guardSwap([bad], [vault])).toThrow(/PROTECTED_ACCOUNT_IN_SWAP/);
  });

  it("U-12 refetches a quote older than 20 seconds", async () => {
    let calls = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ outAmount: "1", inAmount: "2" }), { status: 200 });
    }) as typeof fetch;
    const first = await jupiterQuote("https://api.jup.ag", new URLSearchParams({ inputMint: "a" }), 0);
    await jupiterQuote("https://api.jup.ag", new URLSearchParams({ inputMint: "a" }), 10_000, first);
    await jupiterQuote("https://api.jup.ag", new URLSearchParams({ inputMint: "a" }), 30_000, first);
    globalThis.fetch = original;
    expect(calls).toBe(2);
  });

  it("decodes ClaimRefusedNotMatured", () => {
    expect(decodeProgramError({ InstructionError: [0, { Custom: 6015 }] }).name).toBe("ClaimRefusedNotMatured");
  });

  it("createLocateApi exposes the live LOCATE routes", () => {
    const api = createLocateApi("https://example.test");
    expect(typeof api.config).toBe("function");
    expect(typeof api.markets).toBe("function");
    expect(typeof api.opportunities).toBe("function");
    expect(typeof api.offers).toBe("function");
    expect(typeof api.offer).toBe("function");
    expect(typeof api.offerEconomics).toBe("function");
    expect(typeof api.loans).toBe("function");
    expect(typeof api.loan).toBe("function");
    expect(typeof api.receipts).toBe("function");
    expect(typeof api.evidence).toBe("function");
    expect(typeof api.activity).toBe("function");
    expect(typeof api.theses).toBe("function");
    expect(typeof api.postThesis).toBe("function");
    expect(typeof api.postReceipt).toBe("function");
  });
});
