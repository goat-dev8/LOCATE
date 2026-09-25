import { readFileSync } from "node:fs";
import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { verifyLoaded } from "../src/chain/verify.js";

const programId = new PublicKey("F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6");
const usdc = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

function load(name: string) {
  return JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
}

describe("recorded devnet fixtures", () => {
  it("B-04 decodes the return, take, and claim fixtures", () => {
    const returned = verifyLoaded(load("./fixtures/devnet/loan-returned-2of8HQPV.json"), programId, usdc, "finalized");
    const taken = verifyLoaded(load("./fixtures/devnet/loan-taken-5dE2AyTW.json"), programId, usdc, "finalized");
    const claimed = verifyLoaded(load("./fixtures/devnet/loan-claimed-653KdWNM.json"), programId, usdc, "finalized");
    expect(returned.status).toBe("verified");
    expect(taken.status).toBe("verified");
    expect(claimed.status).toBe("verified");
    if (returned.status === "verified") expect(returned.events[0]?.kind).toBe("loan_returned");
    if (taken.status === "verified") expect(taken.events[0]?.kind).toBe("loan_taken");
    if (claimed.status === "verified") expect(claimed.events[0]?.kind).toBe("loan_claimed");
  });

  it("decodes a v0 message that only has staticAccountKeys", () => {
    const taken = load("./fixtures/devnet/loan-taken-5dE2AyTW.json");
    taken.transaction.message.staticAccountKeys = taken.transaction.message.accountKeys;
    delete taken.transaction.message.accountKeys;
    const result = verifyLoaded(taken, programId, usdc, "finalized");
    expect(result.status).toBe("verified");
  });

  it("B-05 B-06 B-07 reject failed, mismatched, and foreign events", () => {
    const failed = load("./fixtures/devnet/loan-returned-2of8HQPV.json");
    failed.meta.err = { InstructionError: [0, "Custom"] };
    expect(verifyLoaded(failed, programId, usdc, "finalized").status).toBe("rejected");
    const mismatch = load("./fixtures/devnet/loan-returned-2of8HQPV.json");
    mismatch.meta.postTokenBalances.forEach((row: { uiTokenAmount: { amount: string } }) => { row.uiTokenAmount.amount = "1"; });
    expect(verifyLoaded(mismatch, programId, usdc, "finalized")).toMatchObject({ status: "rejected", reason: "BALANCE_MISMATCH" });
    const foreign = load("./fixtures/devnet/loan-returned-2of8HQPV.json");
    foreign.transaction.message.accountKeys[11] = "11111111111111111111111111111111";
    expect(verifyLoaded(foreign, programId, usdc, "finalized")).toMatchObject({ status: "rejected", reason: "NO_LOCATE_EVENT" });
  });

  it("keeps a confirmed transaction pending until it is finalized", () => {
    const returned = verifyLoaded(load("./fixtures/devnet/loan-returned-2of8HQPV.json"), programId, usdc, "confirmed");
    expect(returned).toMatchObject({ status: "pending", commitment: "confirmed" });
  });

  it("rejects a claim whose collateral delta does not match the event", () => {
    const claimed = load("./fixtures/devnet/loan-claimed-653KdWNM.json");
    claimed.meta.postTokenBalances.forEach((row: { uiTokenAmount: { amount: string } }) => { row.uiTokenAmount.amount = "1"; });
    expect(verifyLoaded(claimed, programId, usdc, "finalized")).toMatchObject({ status: "rejected", reason: "BALANCE_MISMATCH" });
  });
});
