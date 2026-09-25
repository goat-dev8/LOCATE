export type CatalogRow = {
  symbol: string;
  mint: string;
  decimals: number;
  tokenMicro: bigint | null;
  markMicro: bigint | null;
};

const TTL_MS = 600_000;
let cache: { fetchedAt: number; rows: CatalogRow[] } | null = null;

function micro(raw: string | undefined): bigint | null {
  if (!raw || !/^-?\d+(\.\d+)?$/.test(raw)) return null;
  const negative = raw.startsWith("-");
  const [whole, frac = ""] = raw.replace("-", "").split(".");
  const value = BigInt(whole) * 1_000_000n + BigInt((frac + "000000").slice(0, 6));
  return negative ? -value : value;
}

export function parseCatalog(text: string): CatalogRow[] {
  const blocks = text.split(/\{\s*"name"/).slice(1);
  return blocks.flatMap((block) => {
    const symbol = /"symbol"\s*:\s*"([^"]+)"/.exec(block)?.[1];
    const mint = /"contract_address"\s*:\s*"([^"]+)"/.exec(block)?.[1];
    if (!symbol || !mint) return [];
    return [{
      symbol,
      mint,
      decimals: 9,
      tokenMicro: micro(/"tokenPrice"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(block)?.[1]),
      markMicro: micro(/"markPrice"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(block)?.[1]),
    }];
  });
}

export async function loadCatalog(base: string): Promise<{ rows: CatalogRow[]; fetchedAt: string; ageMs: number }> {
  const now = Date.now();
  if (!cache || now - cache.fetchedAt > TTL_MS) {
    const response = await fetch(base.replace(/\/$/, "") + "/api/prestocks");
    if (!response.ok) throw new Error("catalog fetch failed");
    cache = { fetchedAt: now, rows: parseCatalog(await response.text()) };
  }
  return { rows: cache.rows, fetchedAt: new Date(cache.fetchedAt).toISOString(), ageMs: now - cache.fetchedAt };
}

export function premiumBps(tokenMicro: bigint | null, markMicro: bigint | null): bigint | null {
  if (tokenMicro === null || markMicro === null || markMicro === 0n) return null;
  return ((tokenMicro - markMicro) * 10000n) / markMicro;
}
