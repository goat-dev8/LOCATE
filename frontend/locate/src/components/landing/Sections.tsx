/**
 * LOCATE landing sections — the editorial core of the story.
 * Numbered like a technical brief: 01 problem → 08 proof.
 */
import type { ReactNode } from 'react'
import { useStore } from '../../state/StoreProvider'
import { useSpotlight } from '../../hooks/usePerception'
import { Btn, Chip, Notice, Reveal, RowLine } from '../primitives'
import { IconAlert, IconArrowRight, IconClock, IconShieldCheck } from '../primitives/icons'
import { seedMarket, seedReceipts } from '../../data/seed'

const OPENAI = seedMarket[0]
/* ------------------------------------------------------------------ */
/* section shell                                                       */
/* ------------------------------------------------------------------ */

function SectionShell({
  id,
  num,
  eyebrow,
  title,
  lede,
  children,
}: {
  id?: string
  num: string
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="section" id={id}>
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">
            {num} — {eyebrow}
          </span>
          <h2 className="display-l">{title}</h2>
          {lede && <p className="lead">{lede}</p>}
        </Reveal>
        {children}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 01 — the problem                                                    */
/* ------------------------------------------------------------------ */

export function ProblemSection() {
  const refPct = (OPENAI.referencePrice / OPENAI.marketPrice) * 100
  return (
    <SectionShell
      id="product"
      num="01"
      eyebrow="THE PROBLEM"
      title={
        <>
          Some PreStocks are expensive to buy —
          <br />
          and <em>impossible to borrow.</em>
        </>
      }
    >
      <div className="grid-2">
        <Reveal className="card card--pad">
          <div className="spread" aria-label="Reference price versus market price">
            <div className="sbar">
              <div className="sbar-head">
                <span>REFERENCE — PRESTOCKS PUBLISHED</span>
                <span className="sbar-value num">${OPENAI.referencePrice.toLocaleString('en-US')}</span>
              </div>
              <div className="sbar-track">
                <div className="sbar-fill sbar-fill--ink" style={{ width: `${refPct}%` }} />
              </div>
            </div>
            <div className="sbar">
              <div className="sbar-head">
                <span>MARKET — DEX</span>
                <span className="sbar-value num">${OPENAI.marketPrice.toLocaleString('en-US')}</span>
              </div>
              <div className="sbar-track">
                <div className="sbar-fill sbar-fill--ink" style={{ width: `${refPct}%` }} />
                <div className="sbar-fill sbar-fill--amber" style={{ left: `${refPct}%`, width: `${100 - refPct}%` }} />
                <span className="sbar-premium num" style={{ left: `${refPct + 2}%` }}>
                  +30% PREMIUM
                </span>
              </div>
            </div>
            <div className="spread-axis num" aria-hidden="true">
              <span>$0</span>
              <span>$500</span>
              <span>$1,000</span>
              <span>$1,337</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120} className="section-copy-col">
          <p className="lead">
            Holders can sell. Traders can buy. But the token itself still needs to be{' '}
            <strong>borrowed</strong> before it can be shorted.
          </p>
          <p className="lead" style={{ marginTop: 16 }}>
            A large premium is exactly when shorts should appear — and exactly when nobody can
            borrow the asset to short it.
          </p>
          <p className="section-kicker">THIS IS THE REASON LOCATE EXISTS.</p>
        </Reveal>
      </div>
    </SectionShell>
  )
}

/* ------------------------------------------------------------------ */
/* 02 — the missing market                                             */
/* ------------------------------------------------------------------ */

export function MissingMarketSection() {
  const nodes: Array<[string, string, boolean]> = [
    ['IDLE PRESTOCK', 'holder inventory', false],
    ['LENDER', 'lists a fixed term', false],
    ['BORROWABLE SUPPLY', 'the missing market', true],
    ['SHORT', 'sell the actual token', false],
    ['PRICE DISCOVERY', 'premium meets its foe', false],
  ]
  return (
    <SectionShell
      num="02"
      eyebrow="THE MISSING MARKET"
      title="LOCATE does not manufacture tokens. It unlocks holder inventory."
      lede="PreStock short supply is not broadly available through existing venues. Every short starts with someone willing to lend."
    >
      <Reveal>
        <div className="chain" role="img" aria-label="Idle PreStock becomes borrowable supply, enabling shorts and price discovery">
          {nodes.map(([name, sub, lime], i) => (
            <div key={name} style={{ display: 'contents' }}>
              {i > 0 && <div className="chain-link" aria-hidden="true" />}
              <div className={`chain-node${lime ? ' chain-node--lime' : ''}`}>
                <span className="chain-name">{name}</span>
                <span className="chain-sub">{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </SectionShell>
  )
}

/* ------------------------------------------------------------------ */
/* 03 — how it works                                                   */
/* ------------------------------------------------------------------ */

export function HowItWorksSection() {
  const steps: Array<[string, string, string]> = [
    ['OFFER', 'A lender lists an amount, USDC collateral, an upfront fee, and a term.', 'AMOUNT · COLLATERAL · FEE · TERM'],
    ['TAKE', 'A borrower posts the USDC collateral and fee. The token is delivered.', 'USDC IN — TOKEN OUT'],
    ['SHORT', 'The borrower can sell the borrowed PreStock on the open market.', 'THE ACTUAL TOKEN'],
    ['RETURN', 'The borrower buys the token back and returns the required net amount.', '0.005000 NET'],
    ['SETTLE', 'Collateral returns to the borrower. The fee stays with the lender.', 'TIME + DELIVERY'],
  ]
  return (
    <SectionShell
      id="how"
      num="03"
      eyebrow="HOW IT WORKS"
      title="One rail. Five moves."
      lede="The entire mechanism is a delivery obligation with a clock. No price ever triggers settlement."
    >
      <div className="steps">
        <div className="steps-line" aria-hidden="true" />
        <div className="steps-grid">
          {steps.map(([title, copy, meta], i) => (
            <Reveal key={title} delay={i * 90} className="step">
              <span className="step-dot" aria-hidden="true" />
              <span className="step-num">0{i + 1}</span>
              <h3 className="step-title">{title}</h3>
              <p className="step-copy">{copy}</p>
              <span className="rail-tag" style={{ position: 'static', display: 'inline-block', marginTop: 4 }}>
                {meta}
              </span>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="step-claim">
            <span className="claim-name">CLAIM</span>
            <p className="claim-copy">
              The alternate ending — if the token is not returned after <strong>maturity + grace</strong>,
              the lender claims the USDC collateral.
            </p>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  )
}

/* ------------------------------------------------------------------ */
/* 04 — why it's different                                             */
/* ------------------------------------------------------------------ */

function GlyphOracle() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path d="M6 27c5-11 10-16 16-16s11 5 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 27h32" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 5" />
      <path d="M12 12l20 20" stroke="#FF5D5D" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="22" cy="27" r="3" fill="#6798FF" stroke="rgba(255,255,255,0.85)" strokeWidth="1" />
    </svg>
  )
}

function GlyphNoLiquidation() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path d="M22 5l14 6v10c0 8-6 13.5-14 18C14 34.5 8 29 8 21V11l14-6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 13l18 18" stroke="#FF5D5D" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 24l4 4 7-8" stroke="#6798FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GlyphTimeDelivery() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <circle cx="19" cy="19" r="12" stroke="currentColor" strokeWidth="1.6" />
      <path d="M19 12v7l5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M31 27v10h9" stroke="#6798FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="35" y="33" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="39" cy="37" r="1.6" fill="#6798FF" />
    </svg>
  )
}

export function WhyDifferentSection() {
  const cards: Array<{ name: string; copy: string; glyph: ReactNode }> = [
    {
      name: 'NO ORACLE',
      copy: 'Price never controls settlement. No mark-based debt, no health factor, no stale feed deciding your fate.',
      glyph: <GlyphOracle />,
    },
    {
      name: 'NO LIQUIDATION',
      copy: 'No forced AMM sale, no margin calls, no keeper hunting a liquidatable position. Collateral moves only at settlement.',
      glyph: <GlyphNoLiquidation />,
    },
    {
      name: 'TIME + DELIVERY',
      copy: 'The contract settles by maturity and exact token delivery. Returned tokens release collateral; missing tokens convert it.',
      glyph: <GlyphTimeDelivery />,
    },
  ]
  return (
    <SectionShell
      num="04"
      eyebrow="WHY IT'S DIFFERENT"
      title="No oracle. No liquidations. Time + delivery."
      lede="LOCATE is not a DEX, not a lending pool, not a perps exchange. It is a delivery rail for the actual PreStock token."
    >
      <div className="grid-3">
        {cards.map((c, i) => (
          <SpotlightCard key={c.name} delay={i * 100}>
            <div className="spot-glyph">{c.glyph}</div>
            <div className="spot-name">{c.name}</div>
            <p className="spot-copy">{c.copy}</p>
          </SpotlightCard>
        ))}
      </div>
    </SectionShell>
  )
}

function SpotlightCard({ children, delay }: { children: ReactNode; delay: number }) {
  const ref = useSpotlight<HTMLDivElement>()
  return (
    <Reveal delay={delay}>
      <div ref={ref} className="card card--pad card--hover spot-card" tabIndex={0}>
        {children}
      </div>
    </Reveal>
  )
}

/* ------------------------------------------------------------------ */
/* 05 — token-2022                                                     */
/* ------------------------------------------------------------------ */

export function Token2022Section() {
  const exts: Array<[string, string]> = [
    ['PAUSED', 'Transfers can be halted at the token level. Listing surfaces the state before an offer is taken.'],
    ['HOOK', 'Transfer hooks can reject or reroute movement. Delivery expects the exact net amount.'],
    ['FEE CHANGE', 'Transfer fees can move. The return requirement is fixed at the fee observed at delivery.'],
    ['DELEGATION', 'Delegated transfers must still satisfy the same net return requirement.'],
  ]
  return (
    <SectionShell
      id="token"
      num="05"
      eyebrow="TOKEN-2022 MECHANICS"
      title="Built for how PreStocks actually move."
      lede="PreStocks are Token-2022 assets — transfer fees and extensions can change how tokens move. LOCATE treats delivery as exact and fee-aware."
    >
      <Reveal>
        <div className="feeflow" role="img" aria-label="A gross send of 0.005050 minus a 1 percent transfer fee of 0.000050 delivers a net of 0.005000">
          <div className="ff-chip">
            <span className="ff-name">GROSS SEND</span>
            <span className="ff-value num">0.005050</span>
          </div>
          <span className="ff-arrow"><IconArrowRight size={20} /></span>
          <div className="ff-chip ff-chip--fee">
            <span className="ff-name">TRANSFER FEE — 1%</span>
            <span className="ff-value num">0.000050</span>
          </div>
          <span className="ff-arrow"><IconArrowRight size={20} /></span>
          <div className="ff-chip ff-chip--net">
            <span className="ff-name">NET DELIVERED</span>
            <span className="ff-value num">0.005000</span>
          </div>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <Notice tone="lime" icon={<IconClock size={16} />}>
          <strong>RETURN REQUIREMENT — 0.005000 OPENAI NET.</strong> The borrower returns the net
          amount; the requirement is fee-aware from delivery, so a fee change can&apos;t break settlement.
        </Notice>
      </Reveal>
      <div className="ext-grid" style={{ marginTop: 26 }}>
        {exts.map(([name, copy], i) => (
          <Reveal key={name} delay={i * 80}>
            <div className="ext-card">
              <span className="ext-name">
                <span className="ext-dot" aria-hidden="true" />
                {name}
              </span>
              <p className="ext-copy">{copy}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  )
}

/* ------------------------------------------------------------------ */
/* 06 — for lenders                                                    */
/* ------------------------------------------------------------------ */

export function LenderSection() {
  const { actions } = useStore()
  return (
    <SectionShell
      num="06"
      eyebrow="FOR LENDERS"
      title="Earn a fee on inventory you were holding anyway."
    >
      <div className="grid-2">
        <Reveal className="section-copy-col">
          <div className="ticks">
            <p className="tick">You set the amount, the USDC collateral, the upfront fee, and the term.</p>
            <p className="tick">Your tokens stay in your wallet until the offer is taken.</p>
            <p className="tick">If the token is not returned after maturity + grace, the USDC collateral is yours.</p>
          </div>
          <blockquote className="quote-slat">
            “Your tokens stay in your wallet until someone takes the offer.”
          </blockquote>
          <div style={{ marginTop: 26 }}>
            <Btn variant="ghost" arrow onClick={() => actions.openApp('create')}>
              LIST AN OFFER
            </Btn>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="preview-frame">
            <div className="preview-bar">
              <span className="pb-dot" /><span className="pb-dot" /><span className="pb-dot" />
              <span className="pb-label">LOCATE — MY OFFERS</span>
              <Chip tone="pos">OPEN</Chip>
            </div>
            <div className="preview-body">
              <div className="card-label" style={{ marginBottom: 12 }}>YOUR OPENAI</div>
              <dl className="rows">
                <RowLine k="AMOUNT" v="0.005000" />
                <RowLine k="TERM" v="7 DAYS" />
                <RowLine k="USDC COLLATERAL" v="$12.50" />
                <RowLine k="UPFRONT FEE" v="$0.35" tone="lime" />
                <RowLine k="STATUS" v="OPEN — TOKENS IN WALLET" tone="lime" />
              </dl>
              <p className="tiny" style={{ marginTop: 14 }}>
                SAMPLE VIEW — ILLUSTRATIVE TERMS
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  )
}

/* ------------------------------------------------------------------ */
/* 07 — for borrowers                                                  */
/* ------------------------------------------------------------------ */

export function BorrowerSection() {
  const { actions } = useStore()
  const cover = 0.005 * OPENAI.marketPrice
  return (
    <SectionShell
      num="07"
      eyebrow="FOR BORROWERS"
      title="Borrow the actual token. Short the actual premium."
    >
      <div className="grid-2">
        <Reveal className="section-copy-col">
          <div className="ticks">
            <p className="tick">You receive the PreStock token itself — not a synthetic, not a perp.</p>
            <p className="tick">You post USDC collateral and an upfront fee. Both are fixed before you commit.</p>
            <p className="tick">Buy the token back, return the net amount, release your collateral.</p>
          </div>
          <p className="section-kicker">
            WHAT YOU PAY — COLLATERAL + FEE. WHAT YOU RECEIVE — THE TOKEN.
          </p>
        </Reveal>

        <Reveal delay={140}>
          <div className="preview-frame">
            <div className="preview-bar">
              <span className="pb-dot" /><span className="pb-dot" /><span className="pb-dot" />
              <span className="pb-label">LOCATE — BOOK</span>
              <span className="chip chip-accent">+30.3% VS REF</span>
            </div>
            <div className="preview-body">
              <div className="card-label" style={{ marginBottom: 4 }}>OPENAI — BORROW 0.005</div>
              <div className="display-m" style={{ marginBottom: 12 }}>0.005000 OPENAI</div>
              <dl className="rows">
                <RowLine k="COLLATERAL" v="$12.50 USDC" />
                <RowLine k="FEE" v="$0.35 USDC" />
                <RowLine k="TERM" v="7 DAYS" />
                <RowLine k="RETURN REQUIREMENT" v="0.005000 NET" />
                <RowLine k="EST. COVER COST" v={`~$${cover.toFixed(2)} AT MARKET`} />
              </dl>
              <div style={{ marginTop: 18 }}>
                <Btn variant="primary" block arrow onClick={() => actions.openApp('book')}>
                  TAKE OFFER
                </Btn>
              </div>
              <p className="tiny" style={{ marginTop: 10 }}>
                PREMIUM IS ADVISORY INFORMATION ONLY — IT NEVER TRIGGERS SETTLEMENT.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  )
}

/* ------------------------------------------------------------------ */
/* 08 — verifiable settlement                                          */
/* ------------------------------------------------------------------ */

export function ProofSection() {
  const receipt = seedReceipts[0] // R-1038 — VERIFIED
  const refusal = seedReceipts[2] // R-1029 — REFUSED
  const flow = ['BORROW', 'SELL', 'BUY BACK', 'RETURN', 'VERIFIED']
  return (
    <SectionShell
      id="proof"
      num="08"
      eyebrow="VERIFIABLE SETTLEMENT"
      title="Every loan ends in a receipt."
      lede="Returned tokens, released collateral, kept fee — or a claim with a reason. Each settlement resolves to a record you can check line by line."
    >
      <Reveal>
        <div className="vflow" role="img" aria-label="Borrow, sell, buy back, return, verified">
          {flow.map((f, i) => (
            <span key={f} style={{ display: 'contents' }}>
              {i > 0 && <IconArrowRight size={14} className="vf-sep" aria-hidden="true" />}
              <span
                className={`vf-node${i === flow.length - 1 ? ' vf-node--final' : ''}`}
                style={{ ['--vf-delay' as never]: `${i * 240}ms` }}
              >
                {f}
                {i === flow.length - 1 && <IconShieldCheck size={14} className="vf-check" />}
              </span>
            </span>
          ))}
        </div>
      </Reveal>

      <div className="grid-2" style={{ marginTop: 34 }}>
        <Reveal>
          <div className="card card--pad receipt-card">
            <div className="receipt-id">RECEIPT — {receipt.id} · LOAN {receipt.loanId}</div>
            <div className="stamp stamp--ok">VERIFIED</div>
            <dl className="rows" style={{ marginTop: 14 }}>
              {receipt.lines.map((l) => (
                <RowLine key={l.label} k={l.label} v={l.value} tone={l.tone} />
              ))}
            </dl>
            <div className="sig-line">
              SIG {receipt.sig} — SIMULATED · NOT AN ON-CHAIN PROOF
            </div>
          </div>
        </Reveal>

        <Reveal delay={140} className="section-copy-col">
          <div className="card card--pad receipt-card">
            <div className="receipt-id">RECEIPT — {refusal.id} · NETWORK</div>
            <div className="stamp stamp--neg">REFUSED</div>
            <dl className="rows" style={{ marginTop: 14 }}>
              <RowLine k="TOKEN RETURNED" v="0.004940 OPENAI" tone="red" />
              <RowLine k="NET REQUIREMENT" v="0.005000 — NOT MET" tone="red" />
            </dl>
            <div className="sig-line">
              {refusal.reasonCode} — {refusal.reason}
            </div>
          </div>
          <Notice tone="neg" icon={<IconAlert size={16} />}>
            A refusal always carries its machine-readable reason —{' '}
            <span className="mono">RETURN_REFUSED_SHORT_DELIVERY</span> — with the amounts that failed.
          </Notice>
          <p className="tiny" style={{ marginTop: 4 }}>
            Preview receipts use simulated identifiers. No on-chain proofs in this preview.
          </p>
        </Reveal>
      </div>
    </SectionShell>
  )
}
