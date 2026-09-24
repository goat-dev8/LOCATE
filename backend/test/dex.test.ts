import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

const config = {
  DATABASE_URL: "postgres://locate:locate@127.0.0.1:1/locate",
  SOLANA_CLUSTER: "devnet" as const,
  SOLANA_RPC_URL: "http://127.0.0.1:1",
  LOCATE_PROGRAM_ID: "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6",
  JUPITER_API_BASE: "https://api.jup.ag",
  PRESTOCKS_API_BASE: "https://prestocks.com",
  CORS_ALLOWED_ORIGINS: "http://localhost:5173",
  PORT: 10000,
  GIT_SHA: "test",
};

describe("external mainnet dex routes", () => {
  it("rejects a bad wallet and a zero sell amount before any chain call", async () => {
    const app = await buildServer({ config });
    const wallet = await app.inject({ method: "GET", url: "/v1/dex/balances?wallet=not-a-key" });
    expect(wallet.statusCode).toBe(400);
    expect(wallet.json().network).toBe("mainnet");
    expect(wallet.json().locateProtocol).toBe(false);
    const quote = await app.inject({
      method: "POST",
      url: "/v1/dex/quote",
      payload: { wallet: "Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC", side: "sell", amountRaw: "0" },
    });
    expect(quote.statusCode).toBe(400);
    expect(quote.json().error.code).toBe("MINIMUM_EXECUTABLE_AMOUNT");
    await app.close();
  });
});
