/**
 * My loans — borrowed and lent positions, compact.
 */
import { useState } from 'react'
import { useStore } from '../../../state/StoreProvider'
import { useNow } from '../../../hooks/usePerception'
import { Btn, Chip, Reveal, statusTone } from '../../primitives'
import { fmtAgo, fmtCountdown, fmtToken, fmtUsd } from '../../../lib/session'

const DAY = 86_400

type StatusFilter = 'ACTIVE' | 'RETURNED' | 'CLAIMABLE' | 'CLAIMED' | 'ALL'

const FILTERS: StatusFilter[] = ['ACTIVE', 'RETURNED', 'CLAIMABLE', 'CLAIMED', 'ALL']

export function MyLoansView() {
  const { state, actions } = useStore()
  const now = useNow()
  const [filter, setFilter] = useState<StatusFilter>('ALL')

  const rows = state.loans.filter((l) => filter === 'ALL' || l.status === filter)
  const n = now ?? 0

  return (
    <div className="view view-enter">
      <div className="view-head">
        <div>
          <h1 className="view-title">MY LOANS</h1>
          <p className="view-sub">Borrowed and lent positions.</p>
        </div>
        <div className="view-actions">
          <Btn variant="ghost" size="sm" arrow onClick={() => actions.nav('book')}>
            OPEN BOOK
          </Btn>
        </div>
      </div>

      <div className="filterbar" role="group" aria-label="Loan status filter">
        <span className="filter-label">STATUS</span>
        <div className="segmented" role="group" aria-label="Loan status filter">
          {FILTERS.map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <span className="tiny" style={{ marginLeft: 'auto' }}>
          {rows.length} POSITIONS
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <span className="em-title">No loans in this state.</span>
          <p className="em-copy">Take an offer from the book to open your first borrow.</p>
          <Btn variant="primary" arrow onClick={() => actions.nav('book')}>
            OPEN BOOK
          </Btn>
        </div>
      ) : (
        <Reveal>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">LOAN</th>
                  <th scope="col">DIRECTION</th>
                  <th scope="col">AMOUNT</th>
                  <th scope="col">COLLATERAL</th>
                  <th scope="col">MATURITY</th>
                  <th scope="col">STATUS</th>
                  <th scope="col"><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const remaining = l.borrowedAtOffset + l.termDays * DAY - n
                  return (
                    <tr key={l.id}>
                      <td data-th="LOAN">
                        <div className="t-name">{l.asset}</div>
                        <span className="t-mono" style={{ color: 'var(--ink-3)' }}>{l.id}</span>
                      </td>
                      <td data-th="DIRECTION">
                        <Chip tone={l.direction === 'BORROWED' ? 'dark' : 'neutral'}>{l.direction}</Chip>
                      </td>
                      <td data-th="AMOUNT" className="t-mono">{fmtToken(l.amount)}</td>
                      <td data-th="COLLATERAL" className="t-mono">{fmtUsd(l.collateralUsdc)}</td>
                      <td data-th="MATURITY" className="t-mono">
                        {l.status === 'ACTIVE'
                          ? fmtCountdown(remaining)
                          : l.settledAtOffset !== undefined
                            ? fmtAgo(n - l.settledAtOffset)
                            : '—'}
                      </td>
                      <td data-th="STATUS"><Chip tone={statusTone(l.status)}>{l.status}</Chip></td>
                      <td data-th="ACTIONS" className="t-actions">
                        <Btn variant="ghost" size="sm" arrow onClick={() => actions.nav('loan', l.id)}>
                          OPEN
                        </Btn>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
    </div>
  )
}
