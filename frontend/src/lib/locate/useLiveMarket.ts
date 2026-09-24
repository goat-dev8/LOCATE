"use client";

/**
 * LOCATE — live PreStock market hook.
 *
 * Consumes the server proxy (`/api/prestocks`) which reads the real
 * product data source (prestocks.com). Polls once per minute; surfaces
 * honest loading / live / unavailable states so the UI never fakes data.
 */

import { useEffect, useState } from "react";

export interface LiveRow {
  symbol: string;
  tokenPrice: number | null;
  markPrice: number | null;
  premiumPct: number | null;
  thirtyDayChange: number | null;
  holderCount: number | null;
}

export type LiveStatus = "loading" | "live" | "unavailable";

export interface LiveMarket {
  status: LiveStatus;
  rows: LiveRow[];
  at: number | null;
  /** Row lookup by symbol. */
  bySymbol: (symbol: string) => LiveRow | undefined;
  /** Rows sorted by premium, widest first. */
  byPremium: LiveRow[];
}

const EMPTY: LiveMarket = {
  status: "loading",
  rows: [],
  at: null,
  bySymbol: () => undefined,
  byPremium: [],
};

const publicEnv = {
  api: process.env.VITE_API_BASE_URL ?? "https://locate-api-znz1.onrender.com",
};

export function useLiveMarket(pollMs = 60_000): LiveMarket {
  const [state, setState] = useState<LiveMarket>(EMPTY);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(publicEnv.api + "/v1/opportunities", { cache: "no-store" });
        if (!res.ok) throw new Error("bad status");
        const data = (await res.json()) as {
          fetchedAt?: string;
          opportunities?: Array<{
            symbol: string;
            tokenPrice: string | null;
            markPrice: string | null;
            premiumBps: string | null;
            state: string;
          }>;
        };
        if (!alive) return;
        const rows: LiveRow[] = (data.opportunities ?? [])
          .filter((row) => row.symbol !== "SPACEX")
          .map((row) => ({
            symbol: row.symbol,
            tokenPrice: row.tokenPrice ? Number(row.tokenPrice) / 1_000_000 : null,
            markPrice: row.markPrice ? Number(row.markPrice) / 1_000_000 : null,
            premiumPct: row.premiumBps ? Number(row.premiumBps) / 100 : null,
            thirtyDayChange: null,
            holderCount: null,
          }));
        const map = new Map(rows.map((r) => [r.symbol, r]));
        setState({
          status: rows.some((row) => row.tokenPrice && row.markPrice) ? "live" : "unavailable",
          rows,
          at: data.fetchedAt ? Date.parse(data.fetchedAt) : Date.now(),
          bySymbol: (s) => map.get(s),
          byPremium: [...rows].sort((a, b) => (b.premiumPct ?? -1) - (a.premiumPct ?? -1)),
        });
      } catch {
        if (!alive) return;
        setState((s) => (s.rows.length > 0 ? s : { ...EMPTY, status: "unavailable" }));
      }
    };
    load();
    const timer = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [pollMs]);

  return state;
}
