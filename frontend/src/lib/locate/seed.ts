import type { Asset, Loan, Offer, Receipt } from "./types";

export const EPOCH = 0;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;
export const GRACE_HOURS = 0.5;

export function fmtUsd(n: number): string {
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function fmtToken(n: number, decimals = 4): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function fmtPct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

export function premium(ref: number, market: number): number {
  if (!ref) return 0;
  return ((market - ref) / ref) * 100;
}

export function grossForNet(net: number, feeBps: number): number {
  const fee = feeBps / 10_000;
  if (fee >= 1) return net;
  return Math.ceil((net / (1 - fee)) * 1e9) / 1e9;
}

export function netFromGross(gross: number, feeBps: number): number {
  const fee = feeBps / 10_000;
  return Math.floor(gross * (1 - fee) * 1e9) / 1e9;
}

export interface Countdown {
  d: number;
  h: number;
  m: number;
  s: number;
  past: boolean;
  totalMs: number;
}

export function countdownParts(target: number, now: number): Countdown {
  const totalMs = target - now;
  const past = totalMs <= 0;
  const abs = Math.abs(totalMs);
  const d = Math.floor(abs / DAY);
  const h = Math.floor((abs % DAY) / HOUR);
  const m = Math.floor((abs % HOUR) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  return { d, h, m, s, past, totalMs };
}

export function fmtCountdown(target: number, now: number): string {
  const c = countdownParts(target, now);
  const body =
    c.d > 0
      ? `${c.d}d ${String(c.h).padStart(2, "0")}h`
      : c.h > 0
        ? `${c.h}h ${String(c.m).padStart(2, "0")}m`
        : `${c.m}m ${String(c.s).padStart(2, "0")}s`;
  return c.past ? `PAST DUE ${body}` : body;
}

export function shortAddr(a: string): string {
  return a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export const OPENAI_MARK: Asset = {
  id: "OPENAI",
  symbol: "OPENAI",
  name: "OpenAI PreStock",
  logo: "/logos/openai.webp",
  refPrice: 0,
  marketPrice: 0,
  transferFeeBps: 100,
  standard: "TOKEN-2022",
  blurb: "",
};

export const ASSETS: Asset[] = [OPENAI_MARK];
export function seedOffers(): Offer[] {
  return [];
}
export function seedLoans(): Loan[] {
  return [];
}
export function seedReceipts(): Receipt[] {
  return [];
}
