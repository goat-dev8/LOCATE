"use client";

/**
 * LOCATE — landing page assembly.
 *
 * One story, top to bottom:
 *   hero        — the missing borrow rail, stated plainly
 *   marquee     — the PreStock universe, nine real listings
 *   mechanism   — one loop, two flows, zero liquidations
 *   01 problem  — you can buy, you can sell, you can't borrow
 *   02 rail     — the full short lifecycle, end to end
 *   03 layer    — the Opportunity Layer (live discovery → economics)
 *   04 settle   — price moves do not liquidate the loan
 *   05 t2022    — fee-aware delivery to the last decimal
 *   06 workspace— both sides of the trade
 *   07 proof    — verified, or refused with a reason
 */

import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { ProofStrip } from "./ProofStrip";
import { LogoMarquee } from "./LogoMarquee";
import { Mechanism } from "./Mechanism";
import { Problem } from "./Problem";
import { Lifecycle } from "./Lifecycle";
import { Opportunity } from "./Opportunity";
import { Differentiators } from "./Differentiators";
import { Token2022 } from "./Token2022";
import { UIPreviews } from "./UIPreviews";
import { Proof } from "./Proof";
import { FinalCTA } from "./FinalCTA";
import { Footer } from "./Footer";

export function Landing() {
  return (
    <div className="relative min-h-screen bg-background text-ink lc-grain">
      <Nav />
      <main>
        <Hero />
        <ProofStrip />
        <LogoMarquee />
        <Mechanism />
        <Problem />
        <Lifecycle />
        <Opportunity />
        <div className="py-4 sm:py-8" />
        <Differentiators />
        <div className="py-20 sm:py-28">
          <Token2022 />
        </div>
        <UIPreviews />
        <Proof />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
