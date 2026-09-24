import { NextResponse } from "next/server";

/**
 * LOCATE — live PreStock market data proxy.
 *
 * Real product data source: https://prestocks.com
 *   GET /api/metrics                     → per-symbol token price + on-chain metrics
 *   GET /api/mark-price/batch?symbols=…  → per-symbol mark (reference) price
 *
 * The upstream has no CORS headers, so the client consumes this server-side
 * proxy instead. Cached in local memory for 60s — no external middleware.
 */

const SYMBOLS = [
  "ANDURIL",
  "ANTHROPIC",
  "FIGUREAI",
  "KALSHI",
  "NEURALINK",
  "OPENAI",
  "POLYMARKET",
  "OPENAI",
  "XAI",
] as const;

const BASE = "https://prestocks.com";
const TTL_MS = 60_000;

export interface PreStockRow {
  symbol: string;
  /** Trading price of the PreStock token (market). */
  tokenPrice: number;
  /** Mark price — the reference value. */
  markPrice: number;
  /** (tokenPrice − markPrice) / markPrice, percent. */
  premiumPct: number;
  thirtyDayChange: number | null;
  holderCount: number | null;
}

interface CacheEntry {
  at: number;
  body: string;
}

let cache: CacheEntry | null = null;

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
    const [metricsRes, markRes] = await Promise.all([
      fetch(`${BASE}/api/metrics`, {
        signal: AbortSignal.timeout(8000),
        headers: { accept: "application/json" },
      }),
      fetch(
        `${BASE}/api/mark-price/batch?symbols=${SYMBOLS.join(",")}`,
        {
          signal: AbortSignal.timeout(8000),
          headers: { accept: "application/json" },
        },
      ),
    ]);

    if (!metricsRes.ok || !markRes.ok) throw new Error("upstream status");

    const metricsJson = (await metricsRes.json()) as {
      metrics?: Array<{
        symbol: string;
        tokenPrice: number;
        holderCount?: number;
        thirtyDayChange?: number | null;
      }>;
    };
    const marks = (await markRes.json()) as Record<string, number>;

    const rows: PreStockRow[] = [];
    for (const symbol of SYMBOLS) {
      const m = metricsJson.metrics?.find((x) => x.symbol === symbol);
      const mark = marks[symbol];
      if (!m || typeof mark !== "number") continue;
      rows.push({
        symbol,
        tokenPrice: m.tokenPrice,
        markPrice: mark,
        premiumPct: ((m.tokenPrice - mark) / mark) * 100,
        thirtyDayChange:
          typeof m.thirtyDayChange === "number" ? m.thirtyDayChange : null,
        holderCount: typeof m.holderCount === "number" ? m.holderCount : null,
      });
    }

    if (rows.length === 0) throw new Error("empty upstream");

    const body = JSON.stringify({
      at: now,
      source: "prestocks.com",
      rows,
    });
    cache = { at: now, body };

    return new NextResponse(body, {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=30, stale-while-revalidate=30",
      },
    });
  } catch {
    // Serve stale data if we have it; otherwise an honest unavailable state.
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
      { at: null, source: "prestocks.com", rows: [] },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
