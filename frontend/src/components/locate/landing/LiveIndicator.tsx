"use client";

/**
 * LOCATE — live-data status pill.
 */

import { cn } from "@/lib/utils";
import type { LiveStatus } from "@/lib/locate/useLiveMarket";

function fmtTime(at: number): string {
  const d = new Date(at);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes(),
  ).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")} UTC`;
}

export function LiveIndicator({
  status,
  at,
  className,
}: {
  status: LiveStatus;
  at: number | null;
  className?: string;
}) {
  const label =
    status === "live"
      ? "LIVE"
      : status === "stale"
        ? "STALE DATA"
        : status === "waking"
          ? "API WAKING UP — RETRYING"
          : status === "loading"
            ? "RESOLVING LIVE DATA…"
            : "LIVE DATA UNAVAILABLE";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[9.5px] font-medium uppercase tracking-[0.16em]",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-[6px] w-[6px] rounded-[2px]",
          status === "live" && "bg-lime animate-pulse-dot",
          (status === "loading" || status === "waking") && "bg-ink-3 animate-pulse-dot",
          (status === "unavailable" || status === "stale") && "bg-ink-3",
        )}
      />
      <span className={status === "live" ? "text-lime-deep" : "text-ink-3"}>{label}</span>
      {status === "live" && at != null && (
        <span className="text-ink-3">· LIVE MARKET · {fmtTime(at)}</span>
      )}
    </span>
  );
}
