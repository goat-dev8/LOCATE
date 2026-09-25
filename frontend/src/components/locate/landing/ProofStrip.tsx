"use client";

import { useLocate } from "@/lib/locate/store";

const METRICS = [
  { n: "24/24", label: "CLONED MAINNET" },
  { n: "42/42", label: "LOCAL VALIDATOR" },
  { n: "45,000", label: "CROSS-RUNTIME" },
  { n: "SELL · BUYBACK", label: "MAINNET EXTERNAL DEX" },
];

export function ProofStrip() {
  const openApp = useLocate((s) => s.openApp);
  const navigate = useLocate((s) => s.navigate);

  return (
    <section aria-label="Verified evidence" className="border-y border-line/70 bg-[#0C0C0E]">
      <div className="lc-container py-10 sm:py-12">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {METRICS.map((row) => (
            <button
              key={row.label}
              type="button"
              onClick={() => {
                openApp();
                navigate("verify");
              }}
              className="text-left"
            >
              <p className="font-sans text-[28px] font-semibold tracking-[-0.04em] text-white sm:text-[32px]">
                {row.n}
              </p>
              <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
                {row.label}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
