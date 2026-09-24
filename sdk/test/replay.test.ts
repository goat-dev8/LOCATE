import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { LOCATE_PROGRAM_ID } from "../src/constants.js";
import { checkedAdd, epochFee, grossForNet, schedule } from "../src/fees.js";
import { loanPda, offerPda } from "../src/pdas.js";

const file = join(dirname(fileURLToPath(import.meta.url)), "../../proof/replay/vectors.jsonl");

describe("cross-runtime replay", () => {
  it("matches every Rust vector exactly", () => {
    const lines = readFileSync(file, "utf8").trim().split(/\n/);
    expect(lines.length).toBeGreaterThanOrEqual(20_000);
    const counts: Record<string, number> = {};
    for (const line of lines) {
      const row = JSON.parse(line) as Record<string, string | number | null>;
      const family = String(row.family);
      counts[family] = (counts[family] ?? 0) + 1;
      if (family === "epoch_fee") {
        const fee = epochFee(Number(row.bps), BigInt(String(row.maxFee)), BigInt(String(row.amount)));
        expect(fee.toString(), line).toBe(row.fee);
      } else if (family === "gross_for_net") {
        let gross: string | null = null;
        try {
          gross = grossForNet(Number(row.bps), BigInt(String(row.maxFee)), BigInt(String(row.net))).toString();
        } catch {
          gross = null;
        }
        expect(gross, line).toBe(row.gross);
      } else if (family === "schedule") {
        let maturity: string | null = null;
        let claimAfter: string | null = null;
        try {
          const out = schedule(BigInt(String(row.start)), BigInt(String(row.term)), BigInt(String(row.grace)));
          maturity = out.maturity.toString();
          claimAfter = out.claimAfter.toString();
        } catch {
          maturity = null;
          claimAfter = null;
        }
        expect(maturity, line).toBe(row.maturity);
        expect(claimAfter, line).toBe(row.claimAfter);
      } else if (family === "collateral") {
        let sum: string | null = null;
        try {
          sum = checkedAdd(BigInt(String(row.collateral)), BigInt(String(row.fee))).toString();
        } catch {
          sum = null;
        }
        expect(sum, line).toBe(row.sum);
      } else if (family === "pda") {
        const offer = offerPda(new PublicKey(String(row.lender)), new PublicKey(String(row.mint)), BigInt(String(row.nonce)), LOCATE_PROGRAM_ID);
        expect(offer.toBase58(), line).toBe(row.offer);
        expect(loanPda(offer, LOCATE_PROGRAM_ID).toBase58(), line).toBe(row.loan);
      } else {
        throw new Error("unknown family " + family);
      }
    }
    expect(counts.epoch_fee).toBe(10_000);
    expect(counts.gross_for_net).toBe(10_000);
    expect(counts.schedule).toBe(10_000);
    expect(counts.collateral).toBe(10_000);
    expect(counts.pda).toBe(5_000);
  });
});
