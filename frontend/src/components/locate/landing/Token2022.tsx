"use client";

/**
 * LOCATE — 05 · Token-2022 fee-aware delivery, accounted to the decimal.
 * Illustrated with a clean two-lane send/fee/net diagram — no imagery.
 */

import { motion } from "framer-motion";
import { FadeContent } from "@/components/bits";
import { Eyebrow, RevealHeadline, Section } from "./parts";

const GOLD = "#E8B84B";
const LIME = "#4D7CFF";
const CREAM = "#E4E4E8";
const MUTED = "#71717A";
const BASE = "#2A2A2D";

const MATH = [
  { label: "LENDER OFFERS", value: "0.005000 OPENAI", tone: "ink" },
  { label: "TRANSFER FEE", value: "1% · TOKEN-2022", tone: "muted" },
  { label: "BORROWER RECEIVES", value: "0.004950 NET", tone: "ink" },
  { label: "RETURN REQUIRES", value: "0.005000 NET", tone: "ink" },
  { label: "BORROWER SENDS", value: "0.005051 GROSS", tone: "ink" },
  { label: "DELIVERED NET", value: "0.005000 ✓ VERIFIED", tone: "lime" },
];

const STATES = ["PAUSED", "HOOK ACTIVE", "FEE CHANGE", "DELEGATION"];

/** Two-lane fee-aware delivery diagram. */
function FeeLanes() {
  return (
    <svg
      viewBox="0 0 340 210"
      className="h-auto w-full"
      role="img"
      aria-label="Diagram: on delivery, a 1 percent transfer fee reduces the received amount; on return, the gross send is computed so the lender receives the full net requirement."
    >
      {/* lane labels */}
      <text x={14} y={26} fill={GOLD} fontSize={10} fontWeight={700} letterSpacing={2} style={{ fontFamily: "var(--font-mono)" }}>
        TAKE · DELIVERY
      </text>
      <text x={14} y={126} fill={LIME} fontSize={10} fontWeight={700} letterSpacing={2} style={{ fontFamily: "var(--font-mono)" }}>
        RETURN · SETTLEMENT
      </text>

      {/* lane 1 — delivery */}
      <rect x={14} y={40} width={96} height={34} rx={9} fill="#1A1A1E" stroke="#3A3A40" strokeWidth={1.2} />
      <text x={62} y={61} textAnchor="middle" fill={CREAM} fontSize={10} fontWeight={700} letterSpacing={1.4} style={{ fontFamily: "var(--font-mono)" }}>
        0.005000
      </text>
      <path d="M 110 57 L 154 57" stroke={BASE} strokeWidth={1.3} />
      <path d="M 110 57 L 154 57" stroke={GOLD} strokeWidth={1.3} strokeDasharray="3 8" className="animate-dash-flow" opacity={0.6} />
      <rect x={154} y={40} width={72} height={34} rx={9} fill="#1A1A1E" stroke={GOLD} strokeWidth={1.2} />
      <text x={190} y={54} textAnchor="middle" fill={GOLD} fontSize={8.5} fontWeight={700} letterSpacing={1} style={{ fontFamily: "var(--font-mono)" }}>
        FEE 1%
      </text>
      <text x={190} y={66} textAnchor="middle" fill={MUTED} fontSize={7.5} letterSpacing={0.8} style={{ fontFamily: "var(--font-mono)" }}>
        −0.000050
      </text>
      <path d="M 226 57 L 270 57" stroke={BASE} strokeWidth={1.3} />
      <path d="M 226 57 L 270 57" stroke={GOLD} strokeWidth={1.3} strokeDasharray="3 8" className="animate-dash-flow" opacity={0.6} />
      <rect x={270} y={40} width={56} height={34} rx={9} fill="#1A1A1E" stroke="#3A3A40" strokeWidth={1.2} />
      <text x={298} y={61} textAnchor="middle" fill={CREAM} fontSize={10} fontWeight={700} letterSpacing={1.2} style={{ fontFamily: "var(--font-mono)" }}>
        NET
      </text>
      <text x={298} y={86} textAnchor="middle" fill={MUTED} fontSize={8} letterSpacing={1} style={{ fontFamily: "var(--font-mono)" }}>
        0.004950 RECEIVED
      </text>

      {/* divider */}
      <path d="M 14 105 L 326 105" stroke="#232326" strokeWidth={1} strokeDasharray="2 6" />

      {/* lane 2 — return */}
      <rect x={14} y={140} width={96} height={34} rx={9} fill="#1A1A1E" stroke="#3A3A40" strokeWidth={1.2} />
      <text x={62} y={161} textAnchor="middle" fill={CREAM} fontSize={10} fontWeight={700} letterSpacing={1.4} style={{ fontFamily: "var(--font-mono)" }}>
        0.005051
      </text>
      <path d="M 110 157 L 154 157" stroke={BASE} strokeWidth={1.3} />
      <path d="M 110 157 L 154 157" stroke={LIME} strokeWidth={1.3} strokeDasharray="3 8" className="animate-dash-flow" opacity={0.6} />
      <rect x={154} y={140} width={72} height={34} rx={9} fill="#1A1A1E" stroke={LIME} strokeWidth={1.2} />
      <text x={190} y={154} textAnchor="middle" fill={LIME} fontSize={8.5} fontWeight={700} letterSpacing={1} style={{ fontFamily: "var(--font-mono)" }}>
        FEE 1%
      </text>
      <text x={190} y={166} textAnchor="middle" fill={MUTED} fontSize={7.5} letterSpacing={0.8} style={{ fontFamily: "var(--font-mono)" }}>
        −0.000051
      </text>
      <path d="M 226 157 L 270 157" stroke={BASE} strokeWidth={1.3} />
      <path d="M 226 157 L 270 157" stroke={LIME} strokeWidth={1.3} strokeDasharray="3 8" className="animate-dash-flow" opacity={0.6} />
      <rect x={270} y={140} width={56} height={34} rx={9} fill={LIME} fillOpacity={0.14} stroke={LIME} strokeWidth={1.2} />
      <text x={298} y={161} textAnchor="middle" fill={LIME} fontSize={10} fontWeight={700} letterSpacing={1.2} style={{ fontFamily: "var(--font-mono)" }}>
        0.005000
      </text>
      <text x={298} y={186} textAnchor="middle" fill={LIME} fontSize={8} letterSpacing={1} style={{ fontFamily: "var(--font-mono)" }}>
        NET ✓ VERIFIED
      </text>

      {/* gross note */}
      <text x={62} y={186} textAnchor="middle" fill={MUTED} fontSize={8} letterSpacing={1} style={{ fontFamily: "var(--font-mono)" }}>
        GROSS SENT
      </text>
    </svg>
  );
}

export function Token2022() {
  return (
    <Section id="token2022" className="py-0 sm:py-0">
      <div className="relative overflow-hidden rounded-[32px] bg-shell">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,68,255,0.14) 0%, transparent 65%)" }}
        />

        <div className="relative grid gap-12 p-8 sm:p-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:p-16">
          <div>
            <FadeContent>
              <Eyebrow index="05" label="Token-2022 delivery" dark />
            </FadeContent>
            <RevealHeadline
              className="lc-display mt-6 text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.08] text-shell-ink"
              segments={[
                { text: "Fees, accounted to" },
                { text: "the last", break: true },
                { text: "decimal.", serif: true },
              ]}
            />
            <FadeContent delay={0.25}>
              <p className="mt-6 max-w-lg text-[16px] leading-[1.7] text-shell-ink-2">
                PreStocks live on Token-2022, where transfers can carry fees
                and hooks. LOCATE treats that as a first-class input: net
                delivery is computed before you sign, and return requirements
                re-check live fee config — so a return is never silently
                short.
              </p>
            </FadeContent>

            {/* the math */}
            <div className="mt-9 overflow-hidden rounded-[20px] border border-shell-line">
              {MATH.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-8%" }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
                  className={`flex items-center justify-between gap-6 px-5 py-3.5 font-mono text-[12.5px] tracking-[0.04em] ${
                    m.tone === "lime"
                      ? "bg-lime/10 text-lime"
                      : "border-b border-shell-line text-shell-ink"
                  }`}
                >
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-shell-ink-2">
                    {m.label}
                  </span>
                  <span
                    className={`tabular-nums font-semibold ${
                      m.tone === "lime" ? "text-lime" : "text-white"
                    }`}
                  >
                    {m.value}
                  </span>
                </motion.div>
              ))}
            </div>

            <FadeContent delay={0.3}>
              <div className="mt-7 flex flex-wrap items-center gap-2">
                {STATES.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-shell-line px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-shell-ink-2"
                  >
                    {s} <span className="text-lime">· HANDLED</span>
                  </span>
                ))}
              </div>
            </FadeContent>
          </div>

          <div className="relative flex items-center">
            <FadeContent delay={0.2} distance={40} duration={0.9}>
              <div className="w-full rounded-[20px] border border-shell-line bg-[#0A0A0A] p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-shell-ink-2">
                    Net delivery · both directions
                  </span>
                  <span className="rounded-full border border-lime/40 bg-lime/10 px-2.5 py-0.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.12em] text-lime">
                    FEE-AWARE
                  </span>
                </div>
                <div className="mt-6">
                  <FeeLanes />
                </div>
                <p className="mt-6 border-t border-shell-line pt-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-shell-ink-2">
                  Offer terms adapt to live fee config — delivery requirements
                  recompute before you sign.
                </p>
              </div>
            </FadeContent>
          </div>
        </div>
      </div>
    </Section>
  );
}
