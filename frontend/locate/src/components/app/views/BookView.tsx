/**
 * Book — borrowable PreStocks. Offers rise into view; taking an offer
 * happens in a drawer that answers the five questions up front.
 */
import { useEffect, useState } from 'react'
import { selectActiveOffers, useStore } from '../../../state/StoreProvider'
import { Btn, Drawer, Notice, Reveal, RowLine } from '../../primitives'
import { IconAlert } from '../../primitives/icons'
import { fmtToken, fmtUsd, shortAddr } from '../../../lib/session'
import type { Loan, Offer } from '../../../types'

type AssetFilter = 'OPENAI' | 'SPACEX'
type TermFilter = 'ALL' | '7' | '14'

export function BookView() {
  const { state, actions } = useStore()
  const [asset, setAsset] = useState<AssetFilter>('OPENAI')
  const [term, setTerm] = useState<TermFilter>('ALL')
  const [takeTarget, setTakeTarget] = useState<Offer | null>(null)

  const active = selectActiveOffers(state.offers)
  const premium = state.market.find((m) => m.asset === 'OPENAI')?.premiumPct ?? 30.3
  const filtered = active.filter(
    (o) => o.asset === asset && (term === 'ALL' || String(o.termDays) === term),
  )
  const supply = active.filter((o) => o.asset === 'OPENAI').reduce((s, o) => s + o.amount, 0)

  return (
    <div className="view view-enter">
      <div className="view-head">
        <div>
          <h1 className="view-title">BORROWABLE PRESTOCKS</h1>
          <p className="view-sub">
            Live short supply. The premium is advisory information — it never triggers settlement.
          </p>
        </div>
        <div className="view-actions">
          <Btn variant="ghost" size="sm" onClick={() => actions.nav('create')}>
            CREATE OFFER
          </Btn>
        </div>
      </div>

      <div className="filterbar" role="group" aria-label="Book filters">
        <span className="filter-label">ASSET</span>
        <div className="segmented" role="group" aria-label="Asset filter">
          {(['OPENAI', 'SPACEX'] as AssetFilter[]).map((a) => (
            <button key={a} aria-pressed={asset === a} onClick={() => setAsset(a)}>
              {a}
            </button>
          ))}
        </div>
        <span className="filter-label" style={{ marginLeft: 12 }}>TERM</span>
        <div className="segmented" role="group" aria-label="Term filter">
          {(['ALL', '7', '14'] as TermFilter[]).map((t) => (
            <button key={t} aria-pressed={term === t} onClick={() => setTerm(t)}>
              {t === 'ALL' ? 'ALL' : `${t}D`}
            </button>
          ))}
        </div>
        <span className="tiny" style={{ marginLeft: 'auto' }} aria-live="polite">
          {filtered.length} OFFERS · SUPPLY {fmtToken(supply)} OPENAI
        </span>
      </div>

      {/* SPACEX has no supply listed */}
      {asset === 'SPACEX' ? (
        <div className="empty">
          <span className="em-title">No borrowable supply for SPACEX yet.</span>
          <p className="em-copy">
            SPACEX trades near its reference ($184.50 vs $191.20). Nobody has listed inventory —
            short supply appears here the moment a lender does.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <>
          <div className="scanline" role="status">
            <span className="sc-label">SCANNING FOR SUPPLY — {fmtToken(supply)} OPENAI</span>
          </div>
          <div className="empty">
            <span className="em-title">No borrowable supply yet.</span>
            <p className="em-copy">
              Short supply for OPENAI is 0.000000. Lenders arrive over time — or create the first
              offer yourself.
            </p>
            <Btn variant="primary" arrow onClick={() => actions.nav('create')}>
              CREATE AN OFFER
            </Btn>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((o, i) => (
            <Reveal key={o.id} delay={i * 80}>
              <OfferCard offer={o} premium={premium} onTake={() => setTakeTarget(o)} />
            </Reveal>
          ))}
        </div>
      )}

      <TakeOfferDrawer
        offer={takeTarget}
        onClose={() => setTakeTarget(null)}
      />
    </div>
  )
}

function OfferCard({
  offer,
  premium,
  onTake,
}: {
  offer: Offer
  premium: number
  onTake: () => void
}) {
  return (
    <article className="card card--pad card--hover offer-card" aria-label={`Offer ${offer.id} — OPENAI`}>
      <div className="offer-head">
        <div className="offer-asset">
          <span className="oa-name">OPENAI</span>
          <span className="oa-avail num">{fmtToken(offer.amount)} available</span>
          <span className="oa-addr">LENDER {shortAddr(offer.lenderAddr)} · OFFER {offer.id}</span>
        </div>
        <div className="offer-prem">
          <span className="op-val num">+{premium.toFixed(1)}%</span>
          <span className="op-note">VS REFERENCE — ADVISORY</span>
        </div>
      </div>

      <div className="offer-terms">
        <div className="oterm">
          <span className="ot-k">COLLATERAL</span>
          <span className="ot-v">{fmtUsd(offer.collateralUsdc)} USDC</span>
        </div>
        <div className="oterm">
          <span className="ot-k">FEE</span>
          <span className="ot-v">{fmtUsd(offer.feeUsdc)} USDC</span>
        </div>
        <div className="oterm">
          <span className="ot-k">TERM</span>
          <span className="ot-v">{offer.termDays} DAYS</span>
        </div>
        <div className="oterm">
          <span className="ot-k">EXPIRY</span>
          <span className="ot-v">{offer.expiryHours}H</span>
        </div>
      </div>

      <div className="offer-foot">
        <span className="tiny">RETURN {fmtToken(offer.amount)} NET AT MATURITY · +24H GRACE</span>
        <Btn variant="primary" size="sm" arrow onClick={onTake}>
          TAKE OFFER
        </Btn>
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* take offer drawer                                                   */
/* ------------------------------------------------------------------ */

function TakeOfferDrawer({ offer, onClose }: { offer: Offer | null; onClose: () => void }) {
  const { state, actions } = useStore()
  const [phase, setPhase] = useState<'review' | 'busy' | 'done'>('review')
  const [loan, setLoan] = useState<Loan | null>(null)
  const [busyTick, setBusyTick] = useState(0)

  const open = offer !== null
  const total = offer ? offer.collateralUsdc + offer.feeUsdc : 0
  const insufficient = offer ? state.wallet.usdc < total : false

  // busy sequence: staged settlement steps advance on a timer
  useEffect(() => {
    if (phase !== 'busy') return
    const t = window.setTimeout(() => setBusyTick((x) => x + 1), 650)
    return () => window.clearTimeout(t)
  }, [phase, busyTick])

  const confirm = async () => {
    if (!offer) return
    setPhase('busy')
    setBusyTick(0)
    const created = await actions.takeOffer(offer.id)
    if (created) setLoan(created)
    setPhase('done')
  }

  const close = () => {
    setPhase('review')
    setLoan(null)
    onClose()
  }

  if (!offer) return null

  return (
    <Drawer open={open} onClose={close} title={`TAKE OFFER — OPENAI`}>
      {phase !== 'done' ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="payline">
              <span className="pl-k">YOU RECEIVE</span>
              <span className="pl-v">{fmtToken(offer.amount)} OPENAI</span>
            </div>
            <div className="payline">
              <span className="pl-k">COLLATERAL — LOCKED UNTIL RETURN</span>
              <span className="pl-v">{fmtUsd(offer.collateralUsdc)} USDC</span>
            </div>
            <div className="payline">
              <span className="pl-k">UPFRONT FEE — TO LENDER</span>
              <span className="pl-v">{fmtUsd(offer.feeUsdc)} USDC</span>
            </div>
            <div className="payline payline--total">
              <span className="pl-k">TOTAL USDC AT TAKE</span>
              <span className="pl-v">{fmtUsd(total)}</span>
            </div>
          </div>

          <dl className="rows">
            <RowLine k="TERM" v={`${offer.termDays} DAYS`} />
            <RowLine k="RETURN REQUIREMENT" v={`${fmtToken(offer.amount)} NET`} />
            <RowLine k="MATURITY" v={`${offer.termDays} DAYS + 24H GRACE`} />
            <RowLine k="LENDER" v={shortAddr(offer.lenderAddr)} />
          </dl>

          <Notice tone="info">
            <span>
              <strong style={{ color: 'var(--ink)' }}>What happens next —</strong> the token is
              delivered to your session wallet. Sell it to open the short; buy it back and return
              the net amount before maturity to release your collateral.
            </span>
          </Notice>

          {insufficient ? (
            <Notice tone="neg" icon={<IconAlert size={16} />}>
              Insufficient session USDC — you hold {fmtUsd(state.wallet.usdc)}, this offer requires{' '}
              {fmtUsd(total)}.
            </Notice>
          ) : (
            <Btn variant="primary" block busy={phase === 'busy'} onClick={confirm}>
              CONFIRM — POST {fmtUsd(total)} USDC
            </Btn>
          )}
        </>
      ) : (
        <>
          <div className="done-state">
            <span className="ds-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 12.5l5 5L19.5 7" />
              </svg>
            </span>
            <span className="ds-title">TOKEN DELIVERED</span>
            <p className="ds-copy">
              Loan {loan?.id ?? ''} is active. Return {fmtToken(offer.amount)} OPENAI by maturity —
              then your {fmtUsd(offer.collateralUsdc)} USDC collateral releases.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn
              variant="primary"
              block
              arrow
              onClick={() => {
                const id = loan?.id
                close()
                if (id) actions.nav('loan', id)
              }}
            >
              VIEW LOAN
            </Btn>
            <Btn variant="ghost" block onClick={close}>
              STAY IN BOOK
            </Btn>
          </div>
        </>
      )}
    </Drawer>
  )
}
