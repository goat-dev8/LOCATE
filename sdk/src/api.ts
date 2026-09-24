import { z } from "zod";

const meta = z.object({ fetchedAt: z.string(), slot: z.number().optional() });

export function createLocateApi(baseUrl: string, onWaking?: () => void) {
  const base = baseUrl.replace(/\/$/, "");
  async function get<T>(path: string, schema: z.ZodType<T>, timeoutMs = 90_000): Promise<T> {
    onWaking?.();
    const response = await fetch(base + path, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(response.status + " " + path);
    return schema.parse(await response.json());
  }
  return {
    health: () => get("/health", z.object({ ok: z.boolean() })),
    ready: () => get("/ready", z.object({ ok: z.boolean(), migration: z.string().optional(), slot: z.number().optional() })),
    config: () => get("/v1/config", z.object({ programId: z.string(), cluster: z.string(), allowlist: z.array(z.string()) }).passthrough()),
    markets: () => get("/v1/markets", z.object({ markets: z.array(z.object({ symbol: z.string(), mint: z.string(), stale: z.boolean() }).passthrough()) }).merge(meta.partial())),
    opportunities: () => get("/v1/opportunities", z.object({ opportunities: z.array(z.record(z.string(), z.unknown())) }).passthrough()),
    offers: () => get("/v1/offers", z.object({ offers: z.array(z.record(z.string(), z.unknown())), slot: z.number(), commitment: z.string() }).passthrough()),
    async postReceipt(signature: string) {
      const response = await fetch(base + "/v1/receipts/" + signature, { method: "POST", signal: AbortSignal.timeout(90_000) });
      if (!response.ok && response.status !== 400) throw new Error(response.status + " receipt");
      return response.json() as Promise<{ status?: string }>;
    },
  };
}
