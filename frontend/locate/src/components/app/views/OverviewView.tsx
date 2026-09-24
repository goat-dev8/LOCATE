/**
 * Overview — the workspace landing: market state, short supply status,
 * active offers and loans in one glance.
 */
import { selectActiveOffers, selectShortSupply, useStore } from '../../../state/StoreProvider'
import { useNow } from '../../../hooks/usePerception'
import { Btn, Notice, Reveal, RowLine, Stat } from '../../primitives'
import { IconScan } from '../../primitives/icons'
import { fmtCountdown, fmtToken } from '../../../lib/session'
import type { Loan } from '../../../types'

const DAY = 86_400

function loanRemaining(l: Loan, now: number): number {
  return l.borrowedAtOffset + l.termDays * DAY - now
}

export function OverviewView() {
  const { state, actions } = useStore()
  const now = useNow()
  const q = state.market.find((m) => m.asset === 'OPENAI')
  const supply = selectShortSupply(state.offers)
  const activeOffers = selectActiveOffers(state.offers)
  const openLoans = state.loans.filter((l) => l.status === 'ACTIVE' || l.status === 'CLAIMABLE')
  const n = now ?? 0

  return (
    <div className="view view-enter">
      {/* market state */}
      <Reveal>
        <div className="ovw-hero">
          <div>
            <span className="eyebrow">OPENAI — PRESTOCK</span>
            <h1 className="display-l" style={{ marginTop: 14 }}>
              Short the premium.
            </h1>
            <p className="tiny" style={{ marginTop: 10 }}>
              SAMPLE MARKET STATE — PREMIUM IS ADVISORY, NEVER DRIVES SETTLEMENT
            </p>
          </div>
          <div className="ovw-stats">
            <Stat xl label="REFERENCE" value={`$${(q?.referencePrice ?? 0).toLocaleString('en-US')}`} />
            <Stat xl label="MARKET" value={`$${(q?.marketPrice ?? 0).toLocaleString('en-US')}`} />
            <Stat
              xl
              label="PREMIUM"
              value={`+${(q?.premiumPct ?? 0).toFixed(1)}%`}
            />
          </div>
        </div>
      </Reveal>

      {/* short supply statement */}
      <Reveal delay={90}>
        <div className="card card--pad">
          <span className="card-label">SHORT SUPPLY — OPENAI</span>
          <div
            className="stat-value stat-value--xl num"
            style={{ marginTop: 12, fontFamily: 'var(--font-mono)', letterSpacing: 0 }}
          >
            {fmtToken(supply)}
          </div>
          {supply === 0 ? (
            <>
              <p className="display-m" style={{ marginTop: 16 }}>
                No offers yet.
              </p>
              <p className="small" style={{ marginTop: 8, maxWidth: '52ch' }}>
                Nobody has listed borrowable inventory yet. Lenders arrive over time — or create
                the first offer yourself.
              </p>
              <div style={{ marginTop: 18 }}>
                <Btn variant="primary" arrow onClick={() => actions.nav('create')}>
                  CREATE AN OFFER
                </Btn>
              </div>
            </>
          ) : (
            <>
              <p className="small" style={{ marginTop: 10 }}>
                {activeOffers.length} {activeOffers.length === 1 ? 'offer' : 'offers'} · from $
                {Math.min(...activeOffers.map((o) => o.feeUsdc)).toFixed(2)} upfront fee
              </p>
              <div style={{ marginTop: 18 }}>
                <Btn variant="ghost" arrow onClick={() => actions.nav('book')}>
                  OPEN BOOK
                </Btn>
              </div>
            </>
          )}
        </div>
      </Reveal>

      {/* active offers + loans */}
      <div className="ovw-main">
        <Reveal delay={140}>
          <div className="card card--pad" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span className="card-label">ACTIVE OFFERS</span>
              <span className="stat-value num" style={{ fontSize: 28 }}>
                {activeOffers.length}
              </span>
            </div>
            <dl className="rows" style={{ marginTop: 14 }}>
              {activeOffers.slice(0, 3).map((o) => (
                <RowLine
                  key={o.id}
                  k={`${fmtToken(o.amount)} — $${o.collateralUsdc.toFixed(2)} / $${o.feeUsdc.toFixed(2)} / ${o.termDays}D`}
                  v={o.isYours ? 'YOURS' : o.lenderAddr.slice(0, 4) + '…' + o.lenderAddr.slice(-4)}
                />
              ))}
              {activeOffers.length === 0 && (
                <p className="tiny" style={{ padding: '10px 0' }}>NO ACTIVE LISTINGS</p>
              )}
            </dl>
            <div style={{ marginTop: 16 }}>
              <Btn variant="ghost" size="sm" block arrow onClick={() => actions.nav('book')}>
                VIEW BOOK
              </Btn>
            </div>
          </div>
        </Reveal>

        <Reveal delay={190}>
          <div className="card card--pad" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span className="card-label">ACTIVE LOANS</span>
              <span className="stat-value num" style={{ fontSize: 28 }}>
                {openLoans.length}
              </span>
            </div>
            <dl className="rows" style={{ marginTop: 14 }}>
              {openLoans.slice(0, 3).map((l) => (
                <RowLine
                  key={l.id}
                  k={`${l.id} · ${l.direction}`}
                  v={
                    l.status === 'ACTIVE'
                      ? fmtCountdown(loanRemaining(l, n))
                      : 'CLAIM WINDOW OPEN'
                  }
                />
              ))}
              {openLoans.length === 0 && (
                <p className="tiny" style={{ padding: '10px 0' }}>NO OPEN LOANS</p>
              )}
            </dl>
            <div style={{ marginTop: 16 }}>
              <Btn variant="ghost" size="sm" block arrow onClick={() => actions.nav('loans')}>
                VIEW MY LOANS
              </Btn>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={220}>
        <Notice tone="info" icon={<IconScan size={16} />}>
          <span>
            <strong style={{ color: 'var(--ink)' }}>Lenders arrive over time.</strong> This preview
            simulates supply discovery on the rail — watch the book fill within the first minute.
          </span>
        </Notice>
      </Reveal>

      {/* claimable prompt */}
      {openLoans.some((l) => l.status === 'CLAIMABLE') && (
        <Reveal delay={240}>
          <Notice tone="warn">
            <span>
              A loan is past maturity + grace with no return. Open it to claim the USDC collateral.
            </span>
          </Notice>
        </Reveal>
      )}
    </div>
  )
}
