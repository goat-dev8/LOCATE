"use client";

/**
 * LOCATE — the PreStock universe logo rail.
 *
 * React-Bits "Logo Loop" pattern: a rAF-driven track translated with
 * modulo wrapping for a seamless infinite right→left loop, exponential
 * velocity smoothing so the rail slows gently on hover, and CSS edge
 * fades. The real PreStocks issuer marks travel in their natural
 * original colors — no monochrome conversion, no replacements.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ASSETS } from "@/lib/locate/seed";
import type { Asset } from "@/lib/locate/types";
import { cn } from "@/lib/utils";

const BASE_SPEED = 42; // px/s — premium-slow drift
const HOVER_SPEED = 12; // px/s — gentle slow-down on hover
const SMOOTH_TAU = 0.25; // velocity easing time constant (s)
const COPY_HEADROOM = 2;

function MarqueeItem({ asset }: { asset: Asset }) {
  return (
    <div className="flex select-none items-center gap-3.5 pr-16 sm:pr-20">
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-cream ring-1 ring-line/80"
        style={{ width: 44, height: 44 }}
        aria-hidden
      >
        <Image
          src={asset.logo}
          alt=""
          width={88}
          height={88}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </span>
      <span className="whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-2">
        {asset.symbol}
      </span>
    </div>
  );
}

export function LogoMarquee({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef<HTMLDivElement>(null);

  const [copyCount, setCopyCount] = useState(2);
  const [reduced, setReduced] = useState(false);
  const [hovered, setHovered] = useState(false);

  /* reduced-motion is a client concern — resolve after mount so SSR
     markup stays identical (no hydration mismatch) */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /* measure one sequence, keep enough copies to cover + wrap */
  const measure = useCallback(() => {
    const containerW = containerRef.current?.clientWidth ?? 0;
    const seqW = seqRef.current?.getBoundingClientRect().width ?? 0;
    if (seqW > 0 && containerW > 0) {
      const needed = Math.ceil(containerW / seqW) + COPY_HEADROOM;
      setCopyCount(Math.max(2, needed));
    }
  }, []);

  useEffect(() => {
    if (reduced) return;
    /* measure after first paint — layout settled, no sync setState */
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    if (seqRef.current) ro.observe(seqRef.current);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [measure, reduced]);

  /* the loop — modulo-wrapped translation with eased velocity */
  useEffect(() => {
    if (reduced) return;
    const track = trackRef.current;
    if (!track) return;

    let raf = 0;
    let last: number | null = null;
    let offset = 0;
    let velocity = BASE_SPEED;

    const frame = (t: number) => {
      if (last === null) last = t;
      const dt = Math.max(0, (t - last) / 1000);
      last = t;

      const target = hovered ? HOVER_SPEED : BASE_SPEED;
      velocity += (target - velocity) * (1 - Math.exp(-dt / SMOOTH_TAU));

      const seqW = seqRef.current?.getBoundingClientRect().width ?? 0;
      if (seqW > 0) {
        offset = ((offset + velocity * dt) % seqW + seqW) % seqW;
        track.style.transform = `translate3d(${-offset}px, 0, 0)`;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced, hovered]);

  const items = useMemo(() => ASSETS, []);

  return (
    <section
      aria-label="PreStock listings"
      className={cn(
        "relative border-y border-line/70 bg-paper-2/40",
        className,
      )}
    >
      <div className="py-12 sm:py-14">
        <p className="lc-label px-5 text-center">
          THE PRESTOCK UNIVERSE · LIVE CATALOG · ONE BORROWABLE RAIL
        </p>

        {reduced ? (
          /* static, honest fallback — logos wrap centered, no motion */
          <ul className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-5 px-5">
            {items.map((a) => (
              <li key={a.id} className="flex items-center gap-3.5">
                <MarqueeItem asset={a} />
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="mt-8 overflow-hidden"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 9%, black 91%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 9%, black 91%, transparent)",
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <div ref={containerRef} className="relative w-full">
              <div
                ref={trackRef}
                className="flex w-max will-change-transform"
                aria-hidden
              >
                {Array.from({ length: copyCount }, (_, copy) => (
                  <div
                    key={copy}
                    ref={copy === 0 ? seqRef : undefined}
                    className="flex items-center py-1"
                  >
                    {items.map((a) => (
                      <MarqueeItem key={`${copy}-${a.id}`} asset={a} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* screen-reader list — the marquee track is decorative */}
        <ul className="sr-only">
          {items.map((a) => (
            <li key={a.id}>{a.name}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
