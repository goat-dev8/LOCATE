/**
 * LOCATE landing — explains the whole mechanism in one scroll:
 * problem → missing market → how it works → why different → Token-2022 →
 * lender / borrower previews → verifiable settlement → open the app.
 */
import { useState } from 'react'
import { useStore, selectShortSupply } from '../../state/StoreProvider'
import { useScrolled } from '../../hooks/usePerception'
import { Btn } from '../primitives'
import { Wordmark } from '../brand/Wordmark'
import { IconMenu, IconX } from '../primitives/icons'
import { HeroRail } from '../visuals/HeroRail'
import { fmtToken } from '../../lib/session'
import { seedMarket } from '../../data/seed'
import {
  ProblemSection,
  MissingMarketSection,
  HowItWorksSection,
  WhyDifferentSection,
  Token2022Section,
  LenderSection,
  BorrowerSection,
  ProofSection,
} from './Sections'

const OPENAI = seedMarket[0]

/* ------------------------------------------------------------------ */
/* nav                                                                 */
/* ------------------------------------------------------------------ */

function LandingNav() {
  const { actions } = useStore()
  const [open, setOpen] = useState(false)
  const scrolled = useScrolled(10)

  const links: Array<[string, string]> = [
    ['PRODUCT', '#product'],
    ['HOW IT WORKS', '#how'],
    ['PROOF', '#proof'],
  ]

  return (
    <header className={`nav${scrolled ? ' nav--scrolled' : ''}${open ? ' open' : ''}`}>
      <div className="container nav-inner">
        <a href="#top" aria-label="LOCATE — back to top" onClick={() => setOpen(false)}>
          <Wordmark />
        </a>
        <nav className="nav-links" aria-label="Primary">
          {links.map(([label, href]) => (
            <a key={href} className="nav-link" href={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-cta">
          <Btn variant="primary" size="sm" arrow onClick={() => actions.openApp('overview')}>
            OPEN APP
          </Btn>
        </div>
        <button
          className="nav-burger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconX size={20} /> : <IconMenu size={20} />}
        </button>
        <div className="nav-menu">
          <nav aria-label="Mobile">
            {links.map(([label, href]) => (
              <a key={href} className="nav-link" href={href} onClick={() => setOpen(false)}>
                {label}
              </a>
            ))}
          </nav>
          <Btn variant="primary" block arrow onClick={() => actions.openApp('overview')}>
            OPEN APP
          </Btn>
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* hero                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  const { state, actions } = useStore()
  const shortSupply = selectShortSupply(state.offers)

  return (
    <section className="hero grid-bg" id="top">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">PRESTOCKS TOKEN-LENDING & SHORT-SUPPLY RAIL</span>
          <h1 className="display-xl hero-title">
            <span className="line-mask">
              <span className="line-inner">Lend out your PreStocks.</span>
            </span>
            <span className="line-mask">
              <span className="line-inner">
                <em>
                  Short the <span className="mark-lime">premium.</span>
                </em>
              </span>
            </span>
          </h1>
          <p className="hero-sub">
            Turn idle PreStocks into borrowable short supply. Holders earn an upfront fee; traders
            borrow the token against USDC and return it at maturity.
          </p>
          <div className="hero-ctas">
            <Btn variant="primary" arrow onClick={() => actions.openApp('overview')}>
              OPEN LOCATE
            </Btn>
            <a className="btn btn-ghost" href="#how">
              SEE HOW IT WORKS
            </a>
          </div>
          <div className="hero-strip" aria-label="Sample market state">
            <div className="hstat">
              <span className="hstat-label">REFERENCE</span>
              <span className="hstat-value">${OPENAI.referencePrice.toLocaleString('en-US')}</span>
            </div>
            <div className="hstat">
              <span className="hstat-label">MARKET</span>
              <span className="hstat-value">${OPENAI.marketPrice.toLocaleString('en-US')}</span>
            </div>
            <div className="hstat">
              <span className="hstat-label">PREMIUM</span>
              <span className="hstat-value" style={{ color: 'var(--accent-soft)' }}>
                +{OPENAI.premiumPct.toFixed(1)}%
              </span>
            </div>
            <div className="hstat">
              <span className="hstat-label">SHORT SUPPLY</span>
              <span className="hstat-value">{fmtToken(shortSupply)}</span>
              <span className="hstat-note tiny">
                <span className="live-dot" aria-hidden="true" />
                SAMPLE MARKET STATE
              </span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <HeroRail />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* final CTA + footer                                                  */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  const { actions } = useStore()
  return (
    <section className="cta-final grid-bg on-dark">
      <div className="container">
        <div className="cta-final-inner">
          <span className="eyebrow eyebrow--dark">OPEN THE RAIL</span>
          <h2 className="display-xl">
            PreStocks aren&apos;t just something to hold.
            <br />
            <em>
              Make them <span className="mark-lime">borrowable.</span>
            </em>
          </h2>
          <div>
            <Btn variant="primary" arrow onClick={() => actions.openApp('overview')}>
              OPEN LOCATE
            </Btn>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const { actions } = useStore()
  return (
    <footer className="footer on-dark">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Wordmark dark />
            <p className="footer-tag">
              PRESTOCKS TOKEN-LENDING
              <br />& SHORT-SUPPLY RAIL
            </p>
          </div>
          <div className="footer-col">
            <h4>APP</h4>
            <ul>
              <li><button onClick={() => actions.openApp('overview')}>Open app</button></li>
              <li><button onClick={() => actions.openApp('book')}>Book</button></li>
              <li><button onClick={() => actions.openApp('create')}>Create offer</button></li>
              <li><button onClick={() => actions.openApp('verify')}>Verify</button></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>PROTOCOL</h4>
            <ul>
              <li><a href="#how">How it works</a></li>
              <li><a href="#product">The problem</a></li>
              <li><a href="#token">Token-2022</a></li>
              <li><a href="#proof">Proof</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-legal">
          <span>© 2025 LOCATE — PRODUCT DESIGN PREVIEW</span>
          <span>SAMPLE MARKET STATE · SIMULATED RECEIPTS · NO LIVE TRANSACTIONS</span>
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */

export function Landing() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <ProblemSection />
        <MissingMarketSection />
        <HowItWorksSection />
        <WhyDifferentSection />
        <Token2022Section />
        <LenderSection />
        <BorrowerSection />
        <ProofSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
