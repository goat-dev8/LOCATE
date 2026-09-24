import { readFileSync } from "node:fs";
import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { presentMarket } from "../src/market/economics.js";
import { readTokenAccount } from "../src/chain/funding.js";
import { buildServer, loadLocalEnv } from "../src/server.js";
import { createSql } from "../src/db/sql.js";
import { upsertReceipt } from "../src/db/receipts.js";
import { catchUp, resetCatchUpForTests } from "../src/ingest/catchup.js";

loadLocalEnv();

describe("markets and funding", () => {
  it("B-11 hides prices once the snapshot is stale", () => {
    const fresh = presentMarket({ ageMs: 1_000, tokenMicro: 110n, markMicro: 100n, dexUsd: "1.1", dexAgeMs: 1_000 });
    const stale = presentMarket({ ageMs: 121_000, tokenMicro: 110n, markMicro: 100n, dexUsd: "1.1", dexAgeMs: 121_000 });
    expect(fresh.stale).toBe(false);
    expect(fresh.tokenPrice).toBe("110");
    expect(stale).toMatchObject({ stale: true, tokenPrice: null, markPrice: null, premiumBps: null, dexUsd: null });
  });

  it("B-12 funded flag follows delegate, amount, and freeze", () => {
    const delegate = new PublicKey("F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6");
    const data = Buffer.alloc(165);
    data.writeBigUInt64LE(100n, 64);
    data.writeUInt32LE(1, 72);
    delegate.toBuffer().copy(data, 76);
    data.writeUInt8(1, 108);
    data.writeBigUInt64LE(100n, 121);
    expect(readTokenAccount(data, delegate.toBase58(), 100n).funded).toBe(true);
    data.writeUInt8(2, 108);
    expect(readTokenAccount(data, delegate.toBase58(), 100n).fundedReason).toBe("frozen");
    data.writeUInt8(1, 108);
    data.writeBigUInt64LE(1n, 121);
    expect(readTokenAccount(data, delegate.toBase58(), 100n).fundedReason).toBe("balance");
    data.writeUInt32LE(0, 72);
    expect(readTokenAccount(data, delegate.toBase58(), 100n).fundedReason).toBe("delegate");
  });
});

describe("http validation", () => {
  it("B-10 rejects a bad pubkey and rate limits receipt posts", async () => {
    const app = await buildServer({ config: {
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://postgres:locate@127.0.0.1:5432/locate",
      SOLANA_CLUSTER: "devnet",
      SOLANA_RPC_URL: "http://127.0.0.1:1",
      LOCATE_PROGRAM_ID: "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6",
      JUPITER_API_BASE: "https://api.jup.ag",
      PRESTOCKS_API_BASE: "https://prestocks.com",
      CORS_ALLOWED_ORIGINS: "http://localhost:5173",
      PORT: 10000,
      GIT_SHA: "test",
    }});
    const bad = await app.inject({ method: "GET", url: "/v1/offers?lender=not-a-key" });
    expect(bad.statusCode).toBe(400);
    let limited = 0;
    for (let i = 0; i < 12; i++) {
      const response = await app.inject({ method: "POST", url: "/v1/receipts/not-a-signature" });
      if (response.statusCode === 429) limited += 1;
    }
    expect(limited).toBeGreaterThan(0);
    await app.close();
  });
});

describe("database", () => {
  const url = process.env.DATABASE_URL;
  it("B-08 B-09 upsert once and only one catch-up runs", async () => {
    if (!url) throw new Error("DATABASE_URL is required");
    const sql = createSql(url);
    const signature = "B08" + "1".repeat(84);
    const event = { kind: "offer_cancelled" as const, eventIndex: 0, fields: { offer: "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6", lender: "Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC", mint: "9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P" } };
    const input = { signature, event, cluster: "localnet", programId: "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6", slot: 1, blockTime: null, commitment: "confirmed" as const, source: "script" as const, label: null };
    await upsertReceipt(sql, input);
    await upsertReceipt(sql, input);
    const rows = await sql<{ count: string }[]>`select count(*)::text as count from locate.receipts where signature = ${signature}`;
    expect(rows[0]?.count).toBe("1");
    await sql`delete from locate.receipts where signature = ${signature}`;

    resetCatchUpForTests();
    let calls = 0;
    const connection = { getSignaturesForAddress: async () => { calls += 1; return []; } };
    const program = new PublicKey("F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6");
    const usdc = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
    await Promise.all([
      catchUp(sql, connection as never, program, "localnet", usdc),
      catchUp(sql, connection as never, program, "localnet", usdc),
    ]);
    expect(calls).toBe(1);
    await sql`select pg_advisory_unlock(hashtext('locate-catchup'))`;
    await sql.end({ timeout: 5 });
  });
});
