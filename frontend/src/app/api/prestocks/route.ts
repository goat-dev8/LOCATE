import { NextResponse } from "next/server";

/**
 * Live PreStocks catalog proxy.
 *
 * The allowlist is the upstream catalog. A symbol that is not in that
 * response is not shown. Prices are market context, not a settlement oracle.
 */

const BASE = "https://prestocks.com";
const TTL_MS = 60_000;

export interface PreStockRow {
  symbol: string;
  name: string;
  mint: string;
  tokenPrice: number;
  markPrice: number;
  premiumPct: number;
  supply: number | null;
}

interface CatalogItem {
  symbol?: string;
  name?: string;
  contract_address?: string;
  tokenPrice?: number;
  markPrice?: number;
  supply?: number;
}

interface CacheEntry {
  at: number;
  body: string;
}

let cache: CacheEntry | null = null;

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return new NextResponse(cache.body, {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=30, stale-while-revalidate=30",
      },
    });
  }

  try {
    const response = await fetch(`${BASE}/api/prestocks`, {
      signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("upstream status");
    const catalog = (await response.json()) as CatalogItem[];
    const rows: PreStockRow[] = [];
    for (const item of catalog) {
      const tokenPrice = finite(item.tokenPrice);
      const markPrice = finite(item.markPrice);
      if (!item.symbol || !item.contract_address || tokenPrice == null || markPrice == null || markPrice === 0) continue;
      rows.push({
        symbol: item.symbol,
        name: item.name || item.symbol,
        mint: item.contract_address,
        tokenPrice,
        markPrice,
        premiumPct: ((tokenPrice - markPrice) / markPrice) * 100,
        supply: finite(item.supply),
      });
    }
    if (rows.length === 0) throw new Error("empty upstream");

    const body = JSON.stringify({ at: now, source: "prestocks-catalog", rows });
    cache = { at: now, body };
    return new NextResponse(body, {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=30, stale-while-revalidate=30",
      },
    });
  } catch {
    if (cache) {
      return new NextResponse(cache.body, {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-stale": "1",
          "cache-control": "no-store",
        },
      });
    }
    return NextResponse.json(
      { at: null, source: "prestocks-catalog", rows: [] },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
