"use client";

/**
 * LOCATE — 07 · verifiable settlement: the proof room.
 * Timeline: BORROW → SELL → BUY BACK → RETURN → VERIFIED
 * plus the recorded Devnet return and the unsigned early-claim refusal.
 */

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, FileText } from "lucide-react";
import protocol from "@/app/proof/data/devnet/protocol.json";
import { FadeContent, SpotlightCard } from "@/components/bits";
import { EASE, Eyebrow, RevealHeadline, Section } from "./parts";

const TIMELINE = ["LIST", "TAKE", "RETURN", "CLAIM"];

function ReceiptCard({
  status,
  code,
  reason,
  lines,
  sig,
  id,
}: {
  status: "VERIFIED" | "REFUSED";
  code: string;
  reason?: string;
  lines: { label: string; value: string }[];
  sig: string;
  id: string;
}) {
  const refused = status === "REFUSED";
  return (
    <div className="lc-card lc-card-hover overflow-hidden">
      <div
        className={`flex items-center justify-between border-b px-5 py-3.5 ${
          refused ? "border-refuse/25 bg-refuse-soft/50" : "border-lime/40 bg-lime-soft/50"
        }`}
      >
        <span className="flex items-center gap-2">
          {refused ? (
            <XCircle className="h-4 w-4 text-refuse" aria-hidden />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-lime-deep" aria-hidden />
          )}
          <span
            className={`font-mono text-[11px] font-bold uppercase tracking-[0.16em] ${
              refused ? "text-refuse" : "text-lime-deep"
            }`}
          >
            {status}
          </span>
        </span>
        <span className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            {id}
          </span>
          <span className="rounded-full border border-line bg-[#161619] px-2 py-0.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.12em] text-ink-3">
            DEVNET REPLICA
          </span>
        </span>
      </div>
      <div className="px-5 py-4">
        <p
          className={`font-mono text-[11px] font-semibold tracking-[0.04em] ${
            refused ? "text-refuse" : "text-lime-deep"
          }`}
        >
          {code}
        </p>
        {reason && (
          <p className="mt-2 border-l-2 border-refuse/50 pl-3 text-[13px] italic leading-[1.55] text-ink-2">
            “{reason}”
          </p>
        )}
        <div className="mt-4">
          {lines.map((l) => (
            <div
              key={l.label}
              className="flex items-baseline justify-between gap-6 border-b border-line/70 py-2.5 last:border-b-0"
            >
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">
                {l.label}
              </span>
              <span className="font-mono text-[12px] tabular-nums text-ink">{l.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 break-all font-mono text-[10px] normal-case tracking-normal text-ink-3">
          {sig}
        </p>
      </div>
    </div>
  );
}

export function Proof() {
  return (
    <Section id="proof" className="bg-paper-2/60">
      <div className="mx-auto max-w-3xl text-center">
        <FadeContent>
          <Eyebrow index="07" label="Proof, not promises" className="justify-center" />
        </FadeContent>
        <RevealHeadline
          className="lc-display mt-6 text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.06]"
          segments={[
            { text: "Every return is verified —" },
            { text: "or refused,", break: true },
            { text: "with a reason.", serif: true },
          ]}
        />
        <FadeContent delay={0.25}>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.7] text-ink-2">
            Verification checks the delivered amount against the original net
            requirement. Short deliveries are refused with a machine-generated,
            human-readable code — no support ticket required.
          </p>
        </FadeContent>
      </div>

      {/* settlement timeline */}
      <FadeContent delay={0.15} className="mt-12">
        <div className="lc-card px-6 py-7 sm:px-10">
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
            {TIMELINE.map((t, i) => {
              const last = i === TIMELINE.length - 1;
              return (
                <div key={t} className="flex flex-1 items-center gap-1.5 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true, margin: "-10%" }}
                      transition={{ duration: 0.5, ease: EASE, delay: 0.2 + i * 0.16 }}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-line-2 bg-cream font-mono text-[10px] font-bold text-ink-2"
                    >
                      {`0${i + 1}`}
                    </motion.span>
                    <span
                      className={`whitespace-nowrap font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] ${
                        last ? "text-lime-deep" : "text-ink-3"
                      }`}
                    >
                      {t}
                    </span>
                  </div>
                  {!last && (
                    <div className="relative mx-1 h-[2px] flex-1 overflow-hidden rounded-full bg-line">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true, margin: "-10%" }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.35 + i * 0.16 }}
                        className="absolute inset-y-0 left-0 bg-lime"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </FadeContent>

      {/* receipt pair */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <FadeContent delay={0.1} distance={32}>
          <ReceiptCard
            status="VERIFIED"
            code="RETURN"
            id={"slot " + protocol.returnCycle.returnSlot}
            lines={[
              { label: "GROSS RAW", value: protocol.returnCycle.grossRaw },
              { label: "SLOT", value: String(protocol.returnCycle.returnSlot) },
              { label: "ASSET", value: "dOPENAI replica" },
            ]}
            sig={protocol.returnCycle.return}
          />
        </FadeContent>
        <FadeContent delay={0.2} distance={32}>
          <ReceiptCard
            status="REFUSED"
            code="NOT_CLAIMABLE_YET"
            reason="ClaimRefusedNotMatured. The claim button stayed disabled."
            id="4U3UU…DqnF"
            lines={[
              { label: "LOAN", value: "4U3UUMfK9QdJt2tm2S2NtTvFrBxX15L9JVvVgb2JDqnF" },
              { label: "RESULT", value: "simulation" },
              { label: "SIGNATURE", value: "none" },
            ]}
            sig="No signature. Early claim was not sent."
          />
        </FadeContent>
      </div>

      <FadeContent delay={0.25} className="mt-6">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <SpotlightCard
            className="lc-card-flat flex items-center gap-3 px-5 py-3.5"
            spotlightColor="rgba(201,241,88,0.18)"
          >
            <FileText className="h-4 w-4 text-lime-deep" aria-hidden />
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2">
            The return signature is a Devnet replica receipt. The refusal has no signature. dOPENAI is not a PreStock.
            </p>
          </SpotlightCard>
        </div>
      </FadeContent>
    </Section>
  );
}
