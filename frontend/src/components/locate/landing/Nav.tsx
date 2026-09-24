"use client";

/**
 * LOCATE landing nav — floating pill that condenses on scroll.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ClickSpark, Magnet } from "@/components/bits";
import { useLocate } from "@/lib/locate/store";
import { Wordmark } from "./parts";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "HOW IT WORKS", href: "#how" },
  { label: "OPPORTUNITY", href: "#opportunity" },
  { label: "PROOF", href: "#proof" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const openApp = useLocate((s) => s.openApp);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        className={cn(
          "mx-auto flex items-center justify-between transition-all duration-500",
          scrolled
            ? "mt-3 max-w-[920px] rounded-full border border-line bg-[#0A0A0ACC] px-4 py-2.5 backdrop-blur-xl sm:px-5"
            : "mt-0 max-w-full border-b border-transparent bg-transparent px-5 py-4 sm:px-8",
        )}
      >
        <a
          href="#top"
          aria-label="LOCATE — back to top"
          className="rounded-full focus-visible:outline-offset-4"
        >
          <Wordmark />
        </a>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 md:flex"
        >
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-2 transition-colors hover:bg-cream hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <Magnet padding={26} magnetStrength={0.35}>
          <ClickSpark sparkColor="#7D9BFF" sparkCount={7}>
            <button
              onClick={openApp}
              className="lc-btn lc-btn-ink lc-btn-sm group"
            >
              OPEN APP
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </button>
          </ClickSpark>
        </Magnet>
      </div>

      <AnimatePresence>
        {scrolled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 top-full h-8 bg-gradient-to-b from-paper/80 to-transparent"
            aria-hidden
          />
        )}
      </AnimatePresence>
    </motion.header>
  );
}
