"use client";

/**
 * LOCATE — live PreStock market hook from GET /v1/opportunities.
 */

import { useEffect, useState } from "react";
import { locateApi } from "./env";

export interface LiveBestOffer {
  pubkey: string;
  amountRaw: string;
  collateralUsdc: string;
  feeUsdc: string;
  termSecs: string;
}

export interface LiveRow {
  symbol: string;
  mint: string;
  state: string;
  tokenPrice: number | null;
  markPrice: number | null;
  premiumPct: number | null;
  fundedRaw: number;
  bestOffer: LiveBestOffer | null;
  action: "TAKE_OFFER" | "LIST_YOURS";
}

export type LiveStatus = "loading" | "waking" | "live" | "stale" | "unavailable";

export interface LiveMarket {
  status: LiveStatus;
  rows: LiveRow[];
  at: number | null;
  bySymbol: (symbol: string) => LiveRow | undefined;
  byPremium: LiveRow[];
}

const EMPTY: LiveMarket = {
  status: "loading",
  rows: [],
  at: null,
  bySymbol: () => undefined,
  byPremium: [],
};

function stateFromPrices(prices: Map<string, { tokenPrice: number; markPrice: number; premiumPct: number }>): LiveMarket {
  const rows: LiveRow[] = [...prices.entries()].map(([symbol, price]) => ({
    symbol,
    mint: "",
    state: "LIVE",
    tokenPrice: price.tokenPrice,
    markPrice: price.markPrice,
    premiumPct: price.premiumPct,
    fundedRaw: 0,
    bestOffer: null,
    action: "LIST_YOURS",
  }));
  const map = new Map(rows.map((row) => [row.symbol, row]));
  return {
    status: "live",
    rows,
    at: Date.now(),
    bySymbol: (symbol) => map.get(symbol),
    byPremium: [...rows].sort((a, b) => (b.premiumPct ?? -1) - (a.premiumPct ?? -1)),
  };
}

async function localPrices(): Promise<Map<string, { tokenPrice: number; markPrice: number; premiumPct: number }>> {
  const map = new Map<string, { tokenPrice: number; markPrice: number; premiumPct: number }>();
  try {
    const response = await fetch("/api/prestocks");
    if (!response.ok) return map;
    const body = (await response.json()) as { rows?: Array<{ symbol?: string; tokenPrice?: number; markPrice?: number; premiumPct?: number }> };
    for (const row of body.rows ?? []) {
      if (!row.symbol || row.tokenPrice == null || row.markPrice == null || !Number.isFinite(row.tokenPrice) || !Number.isFinite(row.markPrice)) continue;
      map.set(row.symbol, {
        tokenPrice: row.tokenPrice,
        markPrice: row.markPrice,
        premiumPct: Number.isFinite(row.premiumPct) ? row.premiumPct! : ((row.tokenPrice - row.markPrice) / row.markPrice) * 100,
      });
    }
  } catch {
    /* The offer API can be up while the market proxy is not. */
  }
  return map;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export function useLiveMarket(pollMs = 60_000): LiveMarket {
  const [state, setState] = useState<LiveMarket>(EMPTY);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const prices = await localPrices();
      if (!alive) return;
      if (prices.size > 0) setState(stateFromPrices(prices));
      try {
        const data = await locateApi.opportunities();
        if (!alive) return;
        const rows: LiveRow[] = (data.opportunities ?? [])
          .map((raw) => {
            const symbol = asText(raw.symbol);
            const best = raw.bestOffer && typeof raw.bestOffer === "object" ? (raw.bestOffer as Record<string, unknown>) : null;
            const local = prices.get(symbol);
            const tokenRemote = raw.tokenPrice == null ? null : Number(raw.tokenPrice) / 1_000_000;
            const markRemote = raw.markPrice == null ? null : Number(raw.markPrice) / 1_000_000;
            const token = tokenRemote ?? local?.tokenPrice ?? null;
            const mark = markRemote ?? local?.markPrice ?? null;
            const premiumBps = raw.premiumBps == null ? null : Number(raw.premiumBps);
            return {
              symbol,
              mint: asText(raw.mint),
              state: asText(raw.state),
              tokenPrice: Number.isFinite(token) ? token : null,
              markPrice: Number.isFinite(mark) ? mark : null,
              premiumPct: premiumBps != null && Number.isFinite(premiumBps)
                ? premiumBps / 100
                : local?.premiumPct ?? (token != null && mark != null && mark !== 0 ? ((token - mark) / mark) * 100 : null),
              fundedRaw: Number(raw.fundedRaw ?? 0) / 1e9,
              bestOffer: best
                ? {
                    pubkey: asText(best.pubkey),
                    amountRaw: asText(best.amountRaw),
                    collateralUsdc: asText(best.collateralUsdc),
                    feeUsdc: asText(best.feeUsdc),
                    termSecs: asText(best.termSecs),
                  }
                : null,
              action: (best ? "TAKE_OFFER" : "LIST_YOURS") as LiveRow["action"],
            };
          })
          .filter((row) => row.symbol && row.symbol !== "SPACEX");
        const map = new Map(rows.map((r) => [r.symbol, r]));
        const stale = rows.length > 0 && rows.every((row) => row.state === "STALE_DATA" || row.tokenPrice == null);
        const live = rows.some((row) => row.tokenPrice != null && row.markPrice != null);
        setState({
          status: live ? "live" : stale ? "stale" : "unavailable",
          rows,
          at: typeof data.fetchedAt === "string" ? Date.parse(data.fetchedAt) : Date.now(),
          bySymbol: (s) => map.get(s),
          byPremium: [...rows].sort((a, b) => (b.premiumPct ?? -1) - (a.premiumPct ?? -1)),
        });
      } catch {
        if (!alive) return;
        const prices = await localPrices();
        if (!alive) return;
        if (prices.size > 0) {
          setState(stateFromPrices(prices));
          return;
        }
        setState((s) =>
          s.rows.length > 0
            ? { ...s, status: s.status === "live" ? "live" : "waking" }
            : { ...EMPTY, status: "waking" },
        );
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
