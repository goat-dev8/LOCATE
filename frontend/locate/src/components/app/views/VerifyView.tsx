/**
 * Verify — the proof room. Every settlement resolves to a receipt:
 * verified or refused, with the actual reason and the full line detail.
 */
import { useState } from 'react'
import { useStore } from '../../../state/StoreProvider'
import { useNow } from '../../../hooks/usePerception'
import { Chip, Reveal, RowLine, statusTone } from '../../primitives'
import { IconAlert, IconCheck, IconShieldCheck } from '../../primitives/icons'
import { fmtAgo } from '../../../lib/session'
import type { Receipt } from '../../../types'

type ReceiptFilter = 'ALL' | 'VERIFIED' | 'REFUSED' | 'CLAIMED'

const FILTERS: ReceiptFilter[] = ['ALL', 'VERIFIED', 'REFUSED', 'CLAIMED']

const FLOW = ['BORROW', 'SELL', 'BUY BACK', 'RETURN', 'VERIFIED']

export function VerifyView() {
  const { state } = useStore()
  const now = useNow()
  const [filter, setFilter] = useState<ReceiptFilter>('ALL')
  const [expanded, setExpanded] = useState<string | null>(state.receipts[0]?.id ?? null)

  const rows = state.receipts.filter((r) => filter === 'ALL' || r.status === filter)
  const n = now ?? 0

  return (
    <div className="view view-enter">
      <div className="view-head">
        <div>
          <h1 className="view-title">VERIFY</h1>
          <p className="view-sub">
            The proof room — every settlement resolves to a receipt, verified or refused, with the
            reason.
          </p>
        </div>
      </div>

      {/* resolving flow */}
      <Reveal className="in">
        <div className="vflow" role="img" aria-label="Borrow, sell, buy back, return, verified">
          {FLOW.map((f, i) => (
            <span key={f} style={{ display: 'contents' }}>
              {i > 0 && (
                <svg className="vf-sep" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 12h15M13 6l6 6-6 6" />
                </svg>
              )}
              <span
                className={`vf-node${i === FLOW.length - 1 ? ' vf-node--final' : ''} in`}
                style={{ ['--vf-delay' as never]: `${i * 240}ms`, opacity: 1, transform: 'none' }}
              >
                {f}
                {i === FLOW.length - 1 && <IconShieldCheck size={14} className="vf-check" />}
              </span>
            </span>
          ))}
        </div>
      </Reveal>

      <div className="filterbar" role="group" aria-label="Receipt filter">
        <span className="filter-label">STATUS</span>
        <div className="segmented" role="group" aria-label="Receipt filter">
          {FILTERS.map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <span className="tiny" style={{ marginLeft: 'auto' }}>
          {rows.length} RECEIPTS
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <span className="em-title">No receipts in this state.</span>
          <p className="em-copy">Settle a loan to generate proof.</p>
        </div>
      ) : (
        <div className="timeline">
          {rows.map((r, i) => (
            <ReceiptItem
              key={r.id}
              receipt={r}
              delay={i * 90}
              ago={fmtAgo(n - r.tsOffset)}
              expanded={expanded === r.id}
              onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
            />
          ))}
        </div>
      )}

      <p className="tiny">
        Preview receipts use simulated identifiers — no on-chain proofs in this preview.
      </p>
    </div>
  )
}

function ReceiptItem({
  receipt,
  delay,
  ago,
  expanded,
  onToggle,
}: {
  receipt: Receipt
  delay: number
  ago: string
  expanded: boolean
  onToggle: () => void
}) {
  const refused = receipt.status === 'REFUSED'
  const claimed = receipt.status === 'CLAIMED'

  const summary = refused
    ? `${receipt.reasonCode ?? ''} — ${receipt.reason ?? ''}`
    : claimed
      ? `No return after maturity + grace — the USDC collateral was claimed by the lender.`
      : receipt.direction === 'BORROWED'
        ? 'Token returned — net requirement met. Collateral released to borrower; fee kept by lender.'
        : 'Token returned — net requirement met. Collateral held for borrower; fee kept by you.'

  return (
    <Reveal delay={delay} as="div">
      <div className={`tl-item${refused ? ' tl-item--neg' : ' tl-item--done'}`}>
        <span className="tl-dot">
          {refused ? <IconAlert size={12} /> : <IconCheck size={12} />}
        </span>
        <div className="tl-body">
          <div className="tl-head">
            <span className="tl-title">RECEIPT {receipt.id}</span>
            <Chip tone={statusTone(receipt.status)}>{receipt.status}</Chip>
            <Chip tone="neutral">{receipt.isYours ? 'YOUR LOAN' : 'NETWORK'}</Chip>
            <span className="tl-when">{ago}</span>
          </div>
          <p className="tl-copy" style={{ color: refused ? 'var(--danger-soft)' : undefined }}>
            {summary}
          </p>

          <button
            className="link-arrow"
            style={{ marginTop: 10, fontSize: 12 }}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            {expanded ? 'HIDE LINES ▴' : 'VIEW LINES ▾'}
          </button>

          {expanded && (
            <div className="card card--pad" style={{ marginTop: 12 }}>
              <dl className="rows">
                {receipt.lines.map((l) => (
                  <RowLine key={l.label} k={l.label} v={l.value} tone={l.tone} />
                ))}
              </dl>
              <div className="sig-line">SIG {receipt.sig} — SIMULATED · NOT AN ON-CHAIN PROOF</div>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  )
}
