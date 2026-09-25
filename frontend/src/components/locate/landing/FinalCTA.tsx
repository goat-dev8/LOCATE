"use client";

/**
 * LOCATE — final call: MAKE THEM BORROWABLE.
 */

import { ArrowUpRight } from "lucide-react";
import { ClickSpark, FadeContent, Magnet, ShinyText, StarBorder } from "@/components/bits";
import { useLocate } from "@/lib/locate/store";
import { RevealHeadline } from "./parts";

export function FinalCTA() {
  const openApp = useLocate((s) => s.openApp);
  const navigate = useLocate((s) => s.navigate);

  return (
    <section className="relative py-24 sm:py-32">
      <div className="lc-container">
        <FadeContent distance={44} duration={0.9}>
          <StarBorder
            as="div"
            color="#4D7CFF"
            speed={7}
            thickness={1.5}
            className="w-full rounded-[32px]"
          >
            <div className="relative overflow-hidden rounded-[30px] bg-[#101012] px-6 py-16 text-center sm:px-12 sm:py-24">
              {/* electric blue radial */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(52% 60% at 50% 100%, rgba(0,68,255,0.22) 0%, rgba(0,68,255,0) 70%)",
                }}
              />
              <div className="relative">
                <p className="lc-label">READY WHEN YOU ARE</p>
                <RevealHeadline
                  className="lc-display mx-auto mt-5 max-w-3xl text-[clamp(2.4rem,5.6vw,4.2rem)] leading-[1.02]"
                  segments={[
                    { text: "MAKE THEM" },
                    { text: "BORROWABLE.", break: true },
                  ]}
                />
                <FadeContent delay={0.3}>
                  <p className="lc-serif mx-auto mt-5 max-w-md text-[clamp(1.15rem,2.2vw,1.5rem)] leading-[1.4] text-ink-2">
                    Your PreStocks. Someone&apos;s short. A clock that settles.
                  </p>
                </FadeContent>
                <FadeContent delay={0.4}>
                  <div className="mt-9 flex justify-center">
                    <Magnet padding={34} magnetStrength={0.35}>
                      <ClickSpark sparkColor="#7D9BFF" sparkCount={10} sparkDuration={0.6}>
                        <button
                          onClick={() => {
                            openApp();
                            navigate("verify");
                          }}
                          className="lc-btn lc-btn-ink group h-[54px] px-9 text-[15px]"
                        >
                          <ShinyText
                            text="OPEN PROOF"
                            className="font-sans font-semibold tracking-[-0.01em]"
                            speed={3.2}
                          />
                          <ArrowUpRight
                            className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            aria-hidden
                          />
                        </button>
                      </ClickSpark>
                    </Magnet>
                  </div>
                </FadeContent>
                <FadeContent delay={0.5}>
                  <p className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
                    Devnet protocol · live API · profit is not guaranteed
                  </p>
                </FadeContent>
              </div>
            </div>
          </StarBorder>
        </FadeContent>
      </div>
    </section>
  );
}
