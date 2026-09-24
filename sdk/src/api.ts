import { z } from "zod";

const meta = z.object({ fetchedAt: z.string(), slot: z.number().optional() });
const row = z.record(z.string(), z.unknown());

export function createLocateApi(baseUrl: string, onWaking?: () => void) {
  const base = baseUrl.replace(/\/$/, "");
  async function get<T>(path: string, schema: z.ZodType<T>, timeoutMs = 90_000): Promise<T> {
    onWaking?.();
    const response = await fetch(base + path, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(response.status + " " + path);
    return schema.parse(await response.json());
  }
  async function postJson<T>(path: string, body: unknown, schema: z.ZodType<T>, timeoutMs = 90_000): Promise<T> {
    onWaking?.();
    const response = await fetch(base + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(response.status + " " + path);
    return schema.parse(await response.json());
  }
  return {
    health: () => get("/health", z.object({ ok: z.boolean() })),
    ready: () => get("/ready", z.object({ ok: z.boolean(), migration: z.string().optional(), slot: z.number().optional() })),
    config: () => get("/v1/config", z.object({ programId: z.string(), cluster: z.string(), allowlist: z.array(z.unknown()) }).passthrough()),
    markets: () => get("/v1/markets", z.object({ markets: z.array(z.object({ symbol: z.string(), mint: z.string() }).passthrough()) }).merge(meta.partial())),
    opportunities: () => get("/v1/opportunities", z.object({ opportunities: z.array(row) }).passthrough()),
    offers: () => get("/v1/offers", z.object({ offers: z.array(row), slot: z.number(), commitment: z.string() }).passthrough()),
    offer: (pubkey: string) => get("/v1/offers/" + pubkey, z.object({ offer: row }).passthrough()),
    offerEconomics: (pubkey: string) => get("/v1/offers/" + pubkey + "/economics", row),
    loans: (query: { wallet: string; role: "lender" | "borrower" }) =>
      get("/v1/loans?wallet=" + query.wallet + "&role=" + query.role, z.object({ loans: z.array(row) }).passthrough()),
    loan: (pubkey: string) => get("/v1/loans/" + pubkey, z.object({ loan: row }).passthrough()),
    receipts: (query?: { wallet?: string; loan?: string; offer?: string; limit?: number }) => {
      const params = new URLSearchParams();
      if (query?.wallet) params.set("wallet", query.wallet);
      if (query?.loan) params.set("loan", query.loan);
      if (query?.offer) params.set("offer", query.offer);
      if (query?.limit) params.set("limit", String(query.limit));
      const qs = params.toString();
      return get("/v1/receipts" + (qs ? "?" + qs : ""), z.object({ receipts: z.array(row) }).passthrough());
    },
    evidence: () => get("/v1/evidence", z.object({ receipts: z.array(row) }).passthrough()),
    activity: (wallet: string) => get("/v1/activity?wallet=" + wallet, z.object({ receipts: z.array(row), loans: z.array(row) }).passthrough()),
    theses: (wallet: string) => get("/v1/theses?wallet=" + wallet, z.object({ theses: z.array(row) }).passthrough()),
    postThesis: (body: {
      wallet: string;
      mint: string;
      offer?: string;
      kind: "premium_compression" | "relative_valuation" | "mean_reversion" | "event_driven" | "other";
      note: string;
      currentPremiumBps?: number;
      targetPremiumBps?: number;
      acknowledgedNonBinding: true;
    }) => postJson("/v1/theses", body, z.object({ id: z.string().optional() }).passthrough()),
    async postReceipt(signature: string) {
      const response = await fetch(base + "/v1/receipts/" + signature, { method: "POST", signal: AbortSignal.timeout(90_000) });
      if (!response.ok && response.status !== 400) throw new Error(response.status + " receipt");
      return response.json() as Promise<{ status?: string }>;
    },
  };
}
