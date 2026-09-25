"use client";

/**
 * LOCATE — dark ink footer with the big logotype.
 */

import { useLocate } from "@/lib/locate/store";
import { Wordmark } from "./parts";

export function Footer() {
  const openApp = useLocate((s) => s.openApp);
  const navigate = useLocate((s) => s.navigate);
  const goLanding = useLocate((s) => s.goLanding);

  const go = (fn: () => void) => () => {
    fn();
  };

  const scrollTo = (id: string) => () => {
    goLanding();
    const timer = setInterval(() => {
      clearInterval(timer);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  return (
    <footer className="relative mt-4 rounded-t-[36px] bg-shell text-shell-ink">
      <div className="lc-container px-5 pb-10 pt-14 sm:px-8 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Wordmark dark size="lg" />
            <p className="lc-serif mt-5 max-w-sm text-[clamp(1.25rem,2vw,1.6rem)] leading-[1.35] text-shell-ink">
              Lend out your PreStocks.
              <br />
              Short the premium.
            </p>
            <p className="mt-5 max-w-sm font-mono text-[10.5px] uppercase leading-[1.9] tracking-[0.14em] text-shell-ink-2">
              Settled by time + delivery + USDC collateral.
              <br />
              No oracle. No liquidation engine. No keepers.
            </p>
          </div>

          <nav aria-label="Protocol">
            <p className="lc-label-dark">Protocol</p>
            <ul className="mt-5 space-y-3">
              {[
                { label: "The Book", fn: () => { openApp(); navigate("book"); } },
                { label: "Create Offer", fn: () => { openApp(); navigate("create"); } },
                { label: "My Loans", fn: () => { openApp(); navigate("loans"); } },
                { label: "Verify", fn: () => { openApp(); navigate("verify"); } },
              ].map((l) => (
                <li key={l.label}>
                  <button
                    onClick={go(l.fn)}
                    className="font-sans text-[14.5px] font-medium text-shell-ink/90 transition-colors hover:text-lime"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="More">
            <p className="lc-label-dark">More</p>
            <ul className="mt-5 space-y-3">
              {[
                { label: "The problem", fn: scrollTo("problem") },
                { label: "Settlement philosophy", fn: scrollTo("settlement") },
                { label: "Token-2022 delivery", fn: scrollTo("token2022") },
              ].map((l) => (
                <li key={l.label}>
                  <button
                    onClick={go(l.fn)}
                    className="font-sans text-[14.5px] font-medium text-shell-ink/90 transition-colors hover:text-lime"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* big logotype — quiet watermark */}
        <p
          aria-hidden
          className="mt-16 select-none text-center font-sans text-[clamp(4rem,14vw,11rem)] font-semibold leading-[0.85] tracking-[-0.045em] text-[#141416]"
        >
          LOCATE
        </p>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-shell-line pt-6 sm:flex-row">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-shell-ink-2">
            devnet test mint mirroring OPENAI&apos;s extensions; not a Mainnet PreStock
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-shell-ink-2">
            © 2025 LOCATE
          </p>
        </div>
      </div>
    </footer>
  );
}
