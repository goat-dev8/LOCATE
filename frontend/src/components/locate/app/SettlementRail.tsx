"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type RailState = "done" | "current" | "waiting" | "blocked";

export type RailStep = {
  id: string;
  label: string;
  state: RailState;
  detail: string;
  href: string | null;
};

export function SettlementRail({ steps }: { steps: RailStep[] }) {
  const reduce = useReducedMotion();
  const done = steps.filter((step) => step.state === "done").length;
  return (
    <div className="lc-card p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <p className="font-sans text-lg font-semibold tracking-tight text-white">Settlement</p>
        <p className="font-mono text-[13px] tabular-nums text-ink-2">
          {done}/{steps.length}
        </p>
      </div>
      <ol className="flex flex-col gap-0">
        {steps.map((step, index) => (
          <li key={step.id} className="grid grid-cols-[28px_1fr] gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "mt-1 h-3 w-3 rounded-full border",
                  step.state === "done" && "border-[#3DDC97] bg-[#3DDC97]",
                  step.state === "current" && "border-[#0044FF] bg-[#0044FF]",
                  step.state === "waiting" && "border-line-2 bg-transparent",
                  step.state === "blocked" && "border-[#E6B325] bg-transparent",
                )}
              />
              {index < steps.length - 1 && (
                <span className="relative my-1 w-px flex-1 bg-line">
                  {step.state === "done" && (
                    <motion.span
                      className="absolute inset-x-0 top-0 bg-[#3DDC97]"
                      initial={reduce ? false : { scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      style={{ originY: 0, height: "100%" }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </span>
              )}
            </div>
            <div className={cn("pb-6", index === steps.length - 1 && "pb-0")}>
              <p className="font-sans text-[15px] font-medium text-white">{step.label}</p>
              <p className="mt-1 text-[13px] text-ink-2">{step.detail}</p>
              {step.href && (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block font-mono text-[12px] text-[#7D9BFF]"
                >
                  View transaction
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
