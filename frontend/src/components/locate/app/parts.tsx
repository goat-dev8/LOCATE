"use client";

/**
 * LOCATE app — shared app primitives + hooks.
 */

import { useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { EPOCH } from "@/lib/locate/seed";
import { cn } from "@/lib/utils";

/* ---------- live clock (hydration-safe: first paint = EPOCH) ---------- */

let clockTick = EPOCH;
const clockListeners = new Set<() => void>();
let clockStarted = false;

function startClock() {
  if (clockStarted || typeof window === "undefined") return;
  clockStarted = true;
  clockTick = Date.now();
  setInterval(() => {
    clockTick = Date.now();
    clockListeners.forEach((l) => l());
  }, 1000);
}

function subscribeClock(cb: () => void) {
  startClock();
  clockListeners.add(cb);
  return () => clockListeners.delete(cb);
}

export function useNow(): number {
  return useSyncExternalStore(
    subscribeClock,
    () => clockTick,
    () => EPOCH,
  );
}

export function useCountdown(target: number) {
  const now = useNow();
  const totalMs = target - now;
  const past = totalMs <= 0;
  const abs = Math.abs(totalMs);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  const label =
    d > 0
      ? `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`
      : h > 0
        ? `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
        : `${m}m ${String(s).padStart(2, "0")}s`;
  return { now, totalMs, past, label };
}

/* ---------- status chip ---------- */

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "lc-chip-lime",
  TAKEN: "lc-chip",
  CANCELLED: "lc-chip",
  SETTLED: "lc-chip",
  RETURNED: "lc-chip-lime",
  CLAIMABLE: "lc-chip-ember",
  CLAIMED: "lc-chip",
  VERIFIED: "lc-chip-lime",
  REFUSED: "lc-chip-refuse",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn(STATUS_TONE[status] ?? "lc-chip")}>
      <span
        className={cn(
          "inline-block h-[6px] w-[6px] rounded-full",
          status === "ACTIVE" || status === "VERIFIED" || status === "RETURNED"
            ? "bg-lime"
            : status === "CLAIMABLE"
              ? "bg-ember"
              : status === "REFUSED"
                ? "bg-refuse"
                : "bg-ink-3",
        )}
        aria-hidden
      />
      {status}
    </span>
  );
}

/* ---------- view header ---------- */

export function ViewHead({
  label,
  title,
  serif,
  actions,
}: {
  label: React.ReactNode;
  title: string;
  serif?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="lc-label">{label}</p>
        <h1 className="lc-display mt-2.5 text-[clamp(1.7rem,3vw,2.3rem)]">
          {title} {serif && <em className="lc-serif text-lime-deep">{serif}</em>}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/* ---------- data row ---------- */

export function DataRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "strong" | "accent" | "ember" | "refuse" | "lime" | "muted";
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line/70 py-3 last:border-b-0">
      <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-[13px] tabular-nums",
          tone === "strong"
            ? "font-bold text-white"
            : tone === "accent" || tone === "lime"
              ? "font-semibold text-lime-deep"
              : tone === "ember"
                ? "font-semibold text-ember"
                : tone === "refuse"
                  ? "font-semibold text-refuse"
                  : "text-ink-2",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ---------- payline total (drawer) ---------- */

export function Payline({
  label,
  value,
  variant = "dark",
}: {
  label: string;
  value: string;
  variant?: "dark" | "light" | "ember" | "total";
}) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center justify-between gap-4 rounded-xl px-4 py-3.5",
        variant === "light"
          ? "bg-lime text-white"
          : variant === "ember"
            ? "border border-ember/30 bg-ember-soft text-ember"
            : "border border-line bg-[#101012] text-white",
      )}
    >
      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>
      <span className="font-mono text-[15px] font-bold tabular-nums">{value}</span>
    </div>
  );
}

/* ---------- maturity ring ---------- */

export function MaturityRing({
  progress,
  size = 148,
  tone = "accent",
  children,
}: {
  progress: number;
  size?: number;
  tone?: "accent" | "ember" | "done";
  children?: React.ReactNode;
}) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  const stroke =
    tone === "ember" ? "#FF7849" : tone === "done" ? "#4D7CFF" : "#0044FF";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#232326" strokeWidth={7} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - p) }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

/* ---------- segmented control ---------- */

export function Segmented({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-[#101012] p-1"
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt)}
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-colors",
              active
                ? "bg-[#1E1E21] text-white shadow-[inset_0_0_0_1px_#303034]"
                : "text-ink-3 hover:text-ink-2",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- staged progress (drawers) ---------- */

export function StagedProgress({
  steps,
  activeIndex,
}: {
  steps: string[];
  activeIndex: number;
}) {
  return (
    <ol className="flex flex-col gap-0">
      {steps.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={s} className="flex items-center gap-3.5">
            <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
              {i < steps.length - 1 && (
                <span
                  className={cn(
                    "absolute left-1/2 top-full h-[26px] w-px -translate-x-1/2",
                    done ? "bg-lime/50" : "bg-line",
                  )}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[9px] font-bold",
                  done
                    ? "border-lime/50 bg-lime-soft text-lime-deep"
                    : active
                      ? "border-lime bg-lime text-white"
                      : "border-line bg-[#101012] text-ink-3",
                )}
              >
                {done ? <Check className="h-3 w-3" aria-hidden /> : `0${i + 1}`}
              </span>
              {active && (
                <motion.span
                  className="absolute inset-0 rounded-full border border-lime/60"
                  animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                  aria-hidden
                />
              )}
            </span>
            <span
              className={cn(
                "pb-6 font-mono text-[11px] font-medium uppercase tracking-[0.14em]",
                active ? "text-white" : done ? "text-lime-deep" : "text-ink-3",
              )}
            >
              {s}
              {active && <span className="ml-2 inline-block animate-pulse-dot">●</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- done state ---------- */

export function DoneState({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-4 py-6 text-center"
    >
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-lime/40 bg-lime-soft"
      >
        <Check className="h-6 w-6 text-lime-deep" aria-hidden />
      </motion.span>
      <p className="font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-white">
        {title}
      </p>
      {body && <p className="max-w-[300px] text-[13.5px] leading-[1.6] text-ink-2">{body}</p>}
      {children && <div className="mt-1 flex flex-wrap justify-center gap-2.5">{children}</div>}
    </motion.div>
  );
}

/* ---------- empty state ---------- */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="lc-card flex flex-col items-center gap-3.5 px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-[#101012]">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M2 5h14M2 9h10M2 13h6" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <p className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-white">
        {title}
      </p>
      <p className="max-w-sm text-[13.5px] leading-[1.6] text-ink-2">{body}</p>
      {action}
    </div>
  );
}

export function Note({
  tone = "ink",
  children,
}: {
  tone?: "ink" | "lime" | "ember" | "refuse";
  children: React.ReactNode;
}) {
  const cls =
    tone === "refuse"
      ? "border-refuse/30 bg-refuse-soft text-refuse"
      : tone === "ember"
        ? "border-ember/30 bg-ember-soft text-ember"
        : tone === "lime"
          ? "border-lime/25 bg-lime-soft text-lime-deep"
          : "border-line bg-[#101012] text-ink-2";
  return (
    <p className={`rounded-xl border px-4 py-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] ${cls}`}>
      {children}
    </p>
  );
}
