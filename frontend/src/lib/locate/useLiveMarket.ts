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

function asText(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export function useLiveMarket(pollMs = 60_000): LiveMarket {
  const [state, setState] = useState<LiveMarket>(EMPTY);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await locateApi.opportunities();
        if (!alive) return;
        const rows: LiveRow[] = (data.opportunities ?? [])
          .map((raw) => {
            const symbol = asText(raw.symbol);
            const best = raw.bestOffer && typeof raw.bestOffer === "object" ? (raw.bestOffer as Record<string, unknown>) : null;
            const token = raw.tokenPrice == null ? null : Number(raw.tokenPrice) / 1_000_000;
            const mark = raw.markPrice == null ? null : Number(raw.markPrice) / 1_000_000;
            const premiumBps = raw.premiumBps == null ? null : Number(raw.premiumBps);
            return {
              symbol,
              mint: asText(raw.mint),
              state: asText(raw.state),
              tokenPrice: Number.isFinite(token) ? token : null,
              markPrice: Number.isFinite(mark) ? mark : null,
              premiumPct: premiumBps == null || !Number.isFinite(premiumBps) ? null : premiumBps / 100,
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
