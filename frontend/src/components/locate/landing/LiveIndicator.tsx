"use client";

/**
 * LOCATE — live-data status pill.
 * Honest state surface for the real PreStocks product data feed:
 * RESOLVING… / LIVE / UNAVAILABLE. Never fakes a live state.
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
          status === "loading" && "bg-ink-3 animate-pulse-dot",
          status === "unavailable" && "bg-ink-3",
        )}
      />
      {status === "live" && (
        <>
          <span className="text-lime-deep">LIVE</span>
          <span className="text-ink-3">
            · PRESTOCKS{at != null ? ` · ${fmtTime(at)}` : ""}
          </span>
        </>
      )}
      {status === "loading" && (
        <span className="text-ink-3">RESOLVING LIVE DATA…</span>
      )}
      {status === "unavailable" && (
        <span className="text-ink-3">LIVE DATA UNAVAILABLE</span>
      )}
    </span>
  );
}
