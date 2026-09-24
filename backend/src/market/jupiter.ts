const TTL_MS = 30_000;
const prices = new Map<string, { usd: string | null; fetchedAt: number }>();

export async function jupiterPrice(base: string, mint: string): Promise<{ usd: string | null; fetchedAt: string; stale: boolean }> {
  const now = Date.now();
  const hit = prices.get(mint);
  if (!hit || now - hit.fetchedAt > TTL_MS) {
    const response = await fetch(base.replace(/\/$/, "") + "/price/v3?ids=" + mint);
    let usd: string | null = null;
    if (response.ok) {
      const body = await response.json() as Record<string, { usdPrice?: number }>;
      const value = body[mint]?.usdPrice;
      usd = typeof value === "number" ? String(value) : null;
    }
    prices.set(mint, { usd, fetchedAt: now });
  }
  const row = prices.get(mint)!;
  const age = now - row.fetchedAt;
  return { usd: age > 120_000 ? null : row.usd, fetchedAt: new Date(row.fetchedAt).toISOString(), stale: age > 120_000 };
}
