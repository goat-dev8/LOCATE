import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { buildServer } from "../src/server.js";
import { createSql } from "../src/db/sql.js";

const base = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/locate",
  SOLANA_CLUSTER: "devnet",
  SOLANA_RPC_URL: "https://api.devnet.solana.com",
  LOCATE_PROGRAM_ID: "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6",
  JUPITER_API_BASE: "https://api.jup.ag",
  PRESTOCKS_API_BASE: "https://prestocks.com",
  CORS_ALLOWED_ORIGINS: "http://localhost:5173",
};

describe("config", () => {
  it("B-01 rejects a missing variable", () => {
    expect(() => loadConfig({ ...base, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });
});

describe("http", () => {
  it("B-03 health does not touch the database and ready fails closed", { timeout: 20_000 }, async () => {
    const config = loadConfig(base);
    const sql = createSql("postgres://locate:locate@127.0.0.1:1/locate");
    const app = await buildServer({ config, sql });
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ ok: true, version: "0.1.0" });
    const ready = await app.inject({ method: "GET", url: "/ready" });
    expect(ready.statusCode).toBe(503);
    await app.close();
  });
});
