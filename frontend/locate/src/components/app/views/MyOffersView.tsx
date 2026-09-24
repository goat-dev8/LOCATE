/**
 * My offers — everything the session wallet has listed, compact.
 */
import { useEffect, useState } from 'react'
import { useStore } from '../../../state/StoreProvider'
import { Btn, Chip, Drawer, Notice, Reveal, RowLine, statusTone } from '../../primitives'
import { fmtToken, fmtUsd } from '../../../lib/session'
import type { Offer } from '../../../types'

type StatusFilter = 'ACTIVE' | 'TAKEN' | 'SETTLED' | 'CANCELLED' | 'ALL'

const FILTERS: StatusFilter[] = ['ACTIVE', 'TAKEN', 'SETTLED', 'CANCELLED', 'ALL']

export function MyOffersView() {
  const { state, actions } = useStore()
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [cancelTarget, setCancelTarget] = useState<Offer | null>(null)

  const mine = state.offers.filter((o) => o.isYours)
  const rows = mine.filter((o) => filter === 'ALL' || o.status === filter)

  return (
    <div className="view view-enter">
      <div className="view-head">
        <div>
          <h1 className="view-title">MY OFFERS</h1>
          <p className="view-sub">
            Everything you&apos;ve listed — open, taken, settled, cancelled.
          </p>
        </div>
        <div className="view-actions">
          <Btn variant="primary" size="sm" arrow onClick={() => actions.nav('create')}>
            CREATE OFFER
          </Btn>
        </div>
      </div>

      <div className="filterbar" role="group" aria-label="Offer status filter">
        <span className="filter-label">STATUS</span>
        <div className="segmented" role="group" aria-label="Offer status filter">
          {FILTERS.map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <span className="tiny" style={{ marginLeft: 'auto' }}>
          {rows.length} LISTINGS
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <span className="em-title">Nothing here yet.</span>
          <p className="em-copy">List your OPENAI as borrowable short supply.</p>
          <Btn variant="primary" arrow onClick={() => actions.nav('create')}>
            CREATE AN OFFER
          </Btn>
        </div>
      ) : (
        <Reveal>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">OFFER</th>
                  <th scope="col">AMOUNT</th>
                  <th scope="col">COLLATERAL</th>
                  <th scope="col">FEE</th>
                  <th scope="col">TERM</th>
                  <th scope="col">STATUS</th>
                  <th scope="col"><span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const loan = state.loans.find((l) => l.offerId === o.id)
                  return (
                    <tr key={o.id}>
                      <td data-th="OFFER">
                        <div className="t-name">OPENAI</div>
                        <span className="t-mono" style={{ color: 'var(--ink-3)' }}>{o.id}</span>
                      </td>
                      <td data-th="AMOUNT" className="t-mono">{fmtToken(o.amount)}</td>
                      <td data-th="COLLATERAL" className="t-mono">{fmtUsd(o.collateralUsdc)}</td>
                      <td data-th="FEE" className="t-mono">{fmtUsd(o.feeUsdc)}</td>
                      <td data-th="TERM" className="t-mono">{o.termDays}D</td>
                      <td data-th="STATUS"><Chip tone={statusTone(o.status)}>{o.status}</Chip></td>
                      <td data-th="ACTIONS" className="t-actions">
                        {o.status === 'ACTIVE' && (
                          <Btn variant="ghost" size="sm" onClick={() => setCancelTarget(o)}>
                            CANCEL
                          </Btn>
                        )}
                        {o.status === 'TAKEN' && loan && (
                          <Btn variant="ghost" size="sm" arrow onClick={() => actions.nav('loan', loan.id)}>
                            OPEN LOAN
                          </Btn>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}

      <CancelOfferDrawer offer={cancelTarget} onClose={() => setCancelTarget(null)} />
    </div>
  )
}

function CancelOfferDrawer({ offer, onClose }: { offer: Offer | null; onClose: () => void }) {
  const { actions } = useStore()
  const [phase, setPhase] = useState<'review' | 'busy' | 'done'>('review')

  useEffect(() => {
    if (offer) setPhase('review')
  }, [offer])

  const confirm = async () => {
    if (!offer) return
    setPhase('busy')
    await actions.cancelOffer(offer.id)
    setPhase('done')
  }

  const close = () => {
    setPhase('review')
    onClose()
  }

  if (!offer) return null

  return (
    <Drawer open={offer !== null} onClose={close} title={`CANCEL OFFER — ${offer.id}`}>
      {phase !== 'done' ? (
        <>
          <Notice tone="info">
            <span>
              Your tokens never left your wallet — cancelling simply removes the listing from the
              book.
            </span>
          </Notice>
          <dl className="rows">
            <RowLine k="AMOUNT" v={`${fmtToken(offer.amount)} OPENAI`} />
            <RowLine k="COLLATERAL" v={fmtUsd(offer.collateralUsdc)} />
            <RowLine k="FEE" v={fmtUsd(offer.feeUsdc)} />
            <RowLine k="STATUS" v="ACTIVE" tone="lime" />
          </dl>
          <Btn variant="danger" block busy={phase === 'busy'} onClick={confirm}>
            CONFIRM — CANCEL OFFER
          </Btn>
        </>
      ) : (
        <>
          <div className="done-state">
            <span className="ds-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </span>
            <span className="ds-title">OFFER CANCELLED</span>
            <p className="ds-copy">Listing removed from the book. Your tokens were never at risk.</p>
          </div>
          <Btn variant="ghost" block onClick={close}>
            CLOSE
          </Btn>
        </>
      )}
    </Drawer>
  )
}
