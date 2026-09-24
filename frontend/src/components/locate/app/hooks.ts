"use client";

/**
 * LOCATE app workspace — shared hooks.
 *
 * CLOCK MODEL
 * -----------
 * Seed data is authored relative to a fixed `EPOCH` (hydration-safe first
 * paint), while the store stamps any entity created during the session with
 * the real wall clock. The workspace therefore runs a *simulated* clock:
 *
 *   now = EPOCH + (wall clock − session anchor)
 *
 * `simTime(ts)` maps any timestamp onto that clock — EPOCH-relative seeds pass
 * through untouched, session-created (wall-clock) timestamps are translated
 * back onto the EPOCH timeline. Every countdown/ring/date in the app reads
 * `useNow()` and `simTime()`, never raw `Date.now()`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  countdownParts,
  DAY,
  EPOCH,
  type Countdown,
} from "@/lib/locate/seed";

/** Wall-clock anchor captured once when the client bundle evaluates (0 during SSR). */
const ANCHOR =
  typeof window === "undefined" ? 0 : Date.now();

/**
 * Map a stored timestamp onto the simulated clock.
 * - Seed timestamps (EPOCH-relative, far in the past) pass through.
 * - Session timestamps (stamped with the real wall clock) are translated
 *   onto the EPOCH timeline so live countdowns stay coherent.
 */
export function simTime(ts: number): number {
  if (ANCHOR === 0) return ts; // SSR / no client clock yet
  if (ts > ANCHOR - DAY) return EPOCH + (ts - ANCHOR);
  return ts;
}

/** Simulated workspace clock. First paint is EPOCH on both server and client. */
export function useNow(): number {
  const [now, setNow] = useState<number>(EPOCH);
  useEffect(() => {
    const id = setInterval(
      () => setNow(EPOCH + Math.max(0, Date.now() - ANCHOR)),
      1000,
    );
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Live countdown to a stored target, on the simulated clock. */
export function useCountdown(target: number): Countdown {
  const now = useNow();
  return countdownParts(simTime(target), now);
}

/** Mono date label, e.g. "OCT 24" or "OCT 31 · 09:33". */
export function fmtDate(ts: number, withTime = false): string {
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
    : { month: "short", day: "numeric" };
  return new Date(simTime(ts))
    .toLocaleDateString("en-US", opts)
    .toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Drawer flow — shared review → busy (staged) → done state machine.  */
/* ------------------------------------------------------------------ */

export interface FlowResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export type DrawerStage = "review" | "busy" | "done";

/**
 * Runs the staged drawer sequence: each step advances ~`msPerStep`, then the
 * store action fires once at the end. Aborts cleanly if the drawer unmounts
 * (sheet closed mid-flight) so no store action ever fires half-way.
 */
export function useDrawerFlow(stepCount: number, msPerStep = 560) {
  const [stage, setStage] = useState<DrawerStage>("review");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FlowResult | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (action: () => FlowResult | Promise<FlowResult>): Promise<FlowResult | null> => {
      setError(null);
      setResult(null);
      setStage("busy");
      setStep(1);
      const res = await action();
      if (!aliveRef.current) return null;
      if (res.ok) {
        setResult(res);
        setStage("done");
      } else {
        setError(res.error ?? "This action could not complete.");
        setStage("review");
        setStep(0);
      }
      return res;
    },
    [],
  );

  return { stage, step, error, result, run };
}
