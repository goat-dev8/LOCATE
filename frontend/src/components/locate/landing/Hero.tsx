"use client";

/**
 * LOCATE hero — editorial composition over a living ground.
 *
 * Centered typography on a WebGL silk field — slow ink-blue fabric
 * folds that breathe and lean toward the cursor — framed by distributed
 * geometry: small outlined squares, corner brackets, hairlines and quiet
 * technical labels floating around the headline, some partially entering
 * or leaving the viewport, drifting with gentle parallax. No giant frame.
 */

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import {
  ClickSpark,
  DecryptionText,
  FadeContent,
  Magnet,
  ShinyText,
  Silk,
} from "@/components/bits";
import { useLocate } from "@/lib/locate/store";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Geo — one floating technical fragment.
   Three nested motion layers:
     1. parallax  — travels as the hero scrolls (rate per fragment)
     2. reveal    — quiet fade-in after the headline lands
     3. drift     — slow endless float (mirrored), unique per fragment
   Under prefers-reduced-motion everything renders static.
------------------------------------------------------------------- */

function Geo({
  scroll,
  parallax = 0,
  driftY = 8,
  driftX = 0,
  duration = 16,
  phase = 0,
  reveal = 1.25,
  className,
  children,
}: {
  scroll: MotionValue<number>;
  parallax?: number;
  driftY?: number;
  driftX?: number;
  duration?: number;
  phase?: number;
  reveal?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const y = useTransform(scroll, [0, 1], [0, parallax]);
  return (
    <motion.div
      style={reduced ? undefined : { y }}
      className={cn("pointer-events-none absolute z-0", className)}
      aria-hidden
    >
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.3, ease: "easeOut", delay: reveal }}
      >
        <motion.div
          animate={
            reduced ? undefined : { y: [0, -driftY, 0], x: [0, driftX, 0] }
          }
          transition={{
            duration,
            delay: phase,
            repeat: Infinity,
            ease: "easeInOut",
            repeatType: "mirror",
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* quiet mono annotation — plain text, never a pill */
function TechNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "whitespace-nowrap font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-3",
        className,
      )}
    >
      {children}
    </p>
  );
}

/* ---------- the hero ---------- */

export function Hero() {
  const openApp = useLocate((s) => s.openApp);
  const navigate = useLocate((s) => s.navigate);
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  return (
    <section
      id="top"
      ref={heroRef}
      className="relative flex min-h-[78svh] flex-col overflow-hidden pt-24 sm:pt-28"
    >
      {/* living ground — ink-blue silk field, mouse-reactive WebGL.
          It arrives with the type: a slow fade-up so the ground and the
          headline land as one composition. */}
      <motion.div
        className="absolute inset-0"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.9, ease: "easeOut", delay: 0.1 }}
      >
        <Silk className="h-full w-full" />
      </motion.div>

      {/* soft radial wash — electric blue, barely there */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
        style={{
          background:
            "radial-gradient(52% 46% at 50% 2%, rgba(0,68,255,0.10) 0%, rgba(0,68,255,0) 70%)",
        }}
      />

      {/* corner vignette — pulls focus to the center axis */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 74% at 50% 44%, rgba(0,0,0,0) 54%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* ============ distributed geometry — fragments around the type ============ */}

      {/* left: outlined square with a blue corner dot, label beneath */}
      <Geo
        scroll={scrollYProgress}
        parallax={-46}
        driftY={11}
        duration={15}
        reveal={1.15}
        className="left-[5%] top-[22%] hidden lg:block"
      >
        <div className="relative h-[38px] w-[38px] rounded-[10px] border border-line-2">
          <span className="absolute -left-[3.5px] -top-[3.5px] h-[7px] w-[7px] rounded-[2px] bg-lime" />
        </div>
        <TechNote className="mt-3">SPL · TOKEN-2022</TechNote>
      </Geo>

      {/* right: tall rectangle leaving the viewport edge */}
      <Geo
        scroll={scrollYProgress}
        parallax={34}
        driftY={13}
        duration={19}
        phase={0.8}
        reveal={1.35}
        className="right-[-16px] top-[30%] hidden md:block"
      >
        <div className="h-[86px] w-[26px] rounded-[8px] border border-line-2" />
        <TechNote className="mt-3 -mr-6 text-right">SHORT SUPPLY</TechNote>
      </Geo>

      {/* upper-right: animated corner brackets framing nothing but air */}
      <Geo
        scroll={scrollYProgress}
        parallax={-24}
        driftY={7}
        duration={13}
        phase={1.4}
        reveal={1.5}
        className="left-[64%] top-[9%] hidden lg:block"
      >
        <motion.svg
          width="46"
          height="46"
          viewBox="0 0 46 46"
          fill="none"
          animate={
            reduced ? undefined : { scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }
          }
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M2 14V2h12"
            stroke="#3A3A40"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M44 32v12H32"
            stroke="#3A3A40"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M44 14V2h-6"
            stroke="#3A3A40"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.4"
          />
        </motion.svg>
      </Geo>

      {/* left: hairline entering from the viewport edge, ending in a tick + label */}
      <Geo
        scroll={scrollYProgress}
        parallax={-28}
        driftY={5}
        duration={17}
        phase={0.4}
        reveal={1.45}
        className="left-0 top-[38%] hidden lg:block"
      >
        <div className="flex items-center gap-3">
          <span
            className="h-px w-[13vw]"
            style={{
              background:
                "linear-gradient(to right, transparent, #303034 55%, #303034)",
            }}
          />
          <span className="h-[6px] w-[6px] rounded-[1.5px] border border-lime/60" />
          <TechNote>SOLANA MAINNET</TechNote>
        </div>
      </Geo>

      {/* right: vertical hairline dropping in from the top edge */}
      <Geo
        scroll={scrollYProgress}
        parallax={22}
        driftY={9}
        duration={14}
        phase={2}
        reveal={1.55}
        className="right-[17%] top-0 hidden lg:block"
      >
        <div className="flex flex-col items-center gap-3">
          <span
            className="w-px h-[11vh]"
            style={{
              background:
                "linear-gradient(to bottom, transparent, #303034 55%, #303034)",
            }}
          />
          <TechNote>USDC COLLATERAL</TechNote>
        </div>
      </Geo>

      {/* a small live accent: pulsing blue square */}
      <Geo
        scroll={scrollYProgress}
        parallax={-16}
        driftY={7}
        duration={12}
        phase={0.6}
        reveal={1.65}
        className="right-[35%] bottom-[23%] hidden lg:block"
      >
        <motion.span
          className="block h-[7px] w-[7px] rounded-[2px] bg-lime"
          animate={
            reduced ? undefined : { opacity: [0.45, 1, 0.45], scale: [0.85, 1, 0.85] }
          }
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </Geo>

      {/* right: settlement annotation with leading tick */}
      <Geo
        scroll={scrollYProgress}
        parallax={-20}
        driftY={6}
        duration={13}
        phase={1.1}
        reveal={1.7}
        className="right-[6%] bottom-[19%] hidden md:block"
      >
        <div className="flex items-center gap-2.5">
          <span className="h-px w-6 bg-line-2" />
          <TechNote>MATURITY + THE LOAN'S GRACE</TechNote>
        </div>
      </Geo>

      {/* left: blue crosshair */}
      <Geo
        scroll={scrollYProgress}
        parallax={-14}
        driftY={6}
        duration={11}
        phase={1.8}
        reveal={1.6}
        className="left-[27%] bottom-[28%] hidden md:block"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 1.5v13M1.5 8h13"
            stroke="#4D7CFF"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </Geo>

      {/* mobile keeps the language quiet: one square, one label */}
      <Geo
        scroll={scrollYProgress}
        parallax={-18}
        driftY={7}
        duration={14}
        reveal={1.3}
        className="left-[6%] top-[15%] lg:hidden"
      >
        <div className="h-[22px] w-[22px] rounded-[6px] border border-line-2" />
      </Geo>
      <Geo
        scroll={scrollYProgress}
        parallax={-12}
        driftY={5}
        duration={13}
        phase={0.9}
        reveal={1.45}
        className="right-[7%] top-[24%] md:hidden"
      >
        <TechNote>SPL · TOKEN-2022</TechNote>
      </Geo>

      {/* ============ the headline block — pure editorial ============ */}

      <div className="lc-container relative z-10 flex flex-1 flex-col">
        <div className="mx-auto my-auto flex w-full max-w-5xl flex-col items-center px-5 pb-10 pt-4 text-center sm:pb-12 sm:pt-6">
          <FadeContent delay={0.05} duration={0.7}>
            <div className="mb-6 inline-flex items-center justify-center">
              <span className="lc-chip-lime">
                <DecryptionText
                  text="PRESTOCK LENDING & SHORT-SUPPLY RAIL"
                  speed={42}
                  revealDelay={350}
                />
              </span>
            </div>
          </FadeContent>

          <h1 className="lc-display bg-[linear-gradient(180deg,#ffffff_0%,#f4f7ff_42%,#c9d6ff_160%)] bg-clip-text text-[clamp(1.85rem,4.8vw,3.85rem)] font-bold leading-[1.08] tracking-[-0.048em] text-transparent [text-shadow:none] drop-shadow-[0_18px_40px_rgba(12,24,72,0.35)]">
            <span className="block">Lend the PreStock.</span>
            <span className="mt-1 block">Let someone short them.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty font-sans text-[15.5px] leading-[1.55] text-ink-2 sm:text-[16.5px]">
            Turn idle PreStocks into borrowable short supply — secured by USDC, settled by delivery.
          </p>

          <div className="mt-7 grid w-full max-w-xl grid-cols-3 gap-3 text-center">
            {[
              ["LEND", "Borrowable supply"],
              ["BORROW", "USDC-secured access"],
              ["SETTLE", "Return or claim"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9BB6FF]">{k}</p>
                <p className="mt-1 font-sans text-[12.5px] leading-snug text-ink-2">{v}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.2em]">
            <span className="text-ink-2">SETTLED BY TIME</span>
            <span className="text-lime" aria-hidden>·</span>
            <span className="text-ink-2">DELIVERY</span>
            <span className="text-lime" aria-hidden>·</span>
            <span className="text-ink-2">USDC COLLATERAL</span>
          </p>

          <div className="relative z-20 mt-8 flex flex-wrap items-center justify-center gap-3">
            <Magnet padding={18} magnetStrength={0.28}>
              <ClickSpark sparkColor="#7D9BFF" sparkCount={9} sparkDuration={0.55}>
                <button
                  onClick={() => {
                    openApp();
                    navigate("create");
                  }}
                  className="lc-btn lc-btn-ink group h-12 px-7 text-[14.5px] shadow-[0_12px_40px_-12px_rgba(255,255,255,0.45)]"
                >
                  <ShinyText
                    text="LEND A PRESTOCK"
                    className="font-sans font-semibold tracking-[-0.01em]"
                    speed={3.6}
                  />
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </button>
              </ClickSpark>
            </Magnet>
            <a
              href="#proof"
              className="lc-btn lc-btn-ghost group h-12 px-7 text-[14.5px] backdrop-blur-sm"
            >
              VIEW PROOF
              <ArrowDown
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5"
                aria-hidden
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
