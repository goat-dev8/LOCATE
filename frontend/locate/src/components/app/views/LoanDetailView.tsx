/**
 * Loan detail — one position, its clock, its settlement path.
 * Buy & return and claim both run in drawers with staged progress.
 */
import { useEffect, useState } from 'react'
import { selectLoanById, useStore } from '../../../state/StoreProvider'
import { useNow } from '../../../hooks/usePerception'
import {
  Btn,
  Chip,
  Drawer,
  MaturityRing,
  Notice,
  Reveal,
  RowLine,
  StagedProgress,
  statusTone,
} from '../../primitives'
import { IconCheck } from '../../primitives/icons'
import { fmtAgo, fmtCountdown, fmtDate, fmtToken, fmtUsd, shortAddr } from '../../../lib/session'
import type { Loan, Receipt } from '../../../types'

const DAY = 86_400

export function LoanDetailView() {
  const { state, actions } = useStore()
  const now = useNow()
  const loan = selectLoanById(state.loans, state.selectedLoanId)
  const [returnOpen, setReturnOpen] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)

  if (!loan) {
    return (
      <div className="view view-enter">
        <div className="empty">
          <span className="em-title">Loan not found.</span>
          <Btn variant="ghost" arrow onClick={() => actions.nav('loans')}>
            OPEN MY LOANS
          </Btn>
        </div>
      </div>
    )
  }

  const n = now ?? 0
  const maturityOffset = loan.borrowedAtOffset + loan.termDays * DAY
  const remaining = maturityOffset - n
  const termSeconds = loan.termDays * DAY
  const progress = Math.max(0, Math.min(1, remaining / termSeconds))
  const marketPrice = state.market.find((m) => m.asset === loan.asset)?.marketPrice ?? 0

  return (
    <div className="view view-enter">
      <div className="view-head">
        <div>
          <h1 className="view-title">{loan.id}</h1>
          <p className="view-sub">
            {loan.asset} · {fmtToken(loan.amount)} · {loan.direction === 'BORROWED' ? 'You borrowed the token' : 'You lent the token'} ·{' '}
            {shortAddr(loan.direction === 'BORROWED' ? loan.lenderAddr : loan.borrowerAddr)}
          </p>
        </div>
        <div className="view-actions">
          <Chip tone={loan.direction === 'BORROWED' ? 'dark' : 'neutral'}>{loan.direction}</Chip>
          <Chip tone={statusTone(loan.status)}>{loan.status}</Chip>
        </div>
      </div>

      <Reveal>
        <div className="card card--pad">
          <div className="grid-2" style={{ gap: 28, alignItems: 'center' }}>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <MaturityRing progress={loan.status === 'ACTIVE' ? progress : 0} size={150}>
                {loan.status === 'ACTIVE' ? (
                  <>
                    <span className="ring-time num">{fmtCountdown(remaining)}</span>
                    <span className="ring-label">TO MATURITY</span>
                  </>
                ) : loan.status === 'CLAIMABLE' ? (
                  <>
                    <span className="ring-time" style={{ fontSize: 12 }}>PAST DUE</span>
                    <span className="ring-label">CLAIM OPEN</span>
                  </>
                ) : (
                  <>
                    <span className="ring-time" style={{ fontSize: 12 }}>SETTLED</span>
                    <span className="ring-label">{loan.status}</span>
                  </>
                )}
              </MaturityRing>
            </div>

            <dl className="rows">
              <RowLine k="ASSET" v={`${loan.asset} — TOKEN-2022`} />
              <RowLine k="AMOUNT" v={fmtToken(loan.amount)} />
              <RowLine k="COLLATERAL" v={`${fmtUsd(loan.collateralUsdc)} USDC`} />
              <RowLine k="UPFRONT FEE" v={fmtUsd(loan.feeUsdc)} />
              <RowLine k="RETURN REQUIREMENT" v={`${fmtToken(loan.returnRequirement)} NET`} tone="lime" />
              <RowLine k="BORROWED" v={fmtAgo(n - loan.borrowedAtOffset)} />
              <RowLine k="MATURITY" v={fmtDate(maturityOffset, n)} />
              <RowLine k="GRACE" v="+24H AFTER MATURITY" />
            </dl>
          </div>
        </div>
      </Reveal>

      {/* settlement timeline */}
      <Reveal delay={90}>
        <div className="card card--pad">
          <span className="card-label">SETTLEMENT PATH</span>
          <div className="timeline" style={{ marginTop: 16 }}>
            <div className="tl-item tl-item--done">
              <span className="tl-dot"><IconCheck size={11} /></span>
              <div className="tl-body">
                <div className="tl-head">
                  <span className="tl-title">OFFER TAKEN — TOKEN DELIVERED</span>
                  <span className="tl-when">{fmtAgo(n - loan.borrowedAtOffset)}</span>
                </div>
                <p className="tl-copy">
                  {fmtToken(loan.amount)} {loan.asset} delivered against {fmtUsd(loan.collateralUsdc)} USDC collateral.
                </p>
              </div>
            </div>

            <div className={`tl-item${loan.status === 'ACTIVE' ? '' : ' tl-item--done'}`}>
              <span className="tl-dot">{loan.status !== 'ACTIVE' ? <IconCheck size={11} /> : null}</span>
              <div className="tl-body">
                <div className="tl-head">
                  <span className="tl-title">
                    {loan.direction === 'BORROWED' ? 'NET RETURN REQUIRED' : 'AWAITING RETURN'}
                  </span>
                  {loan.status === 'ACTIVE' && (
                    <span className="tl-when num">{fmtCountdown(remaining)} TO MATURITY</span>
                  )}
                </div>
                <p className="tl-copy">
                  {loan.direction === 'BORROWED'
                    ? 'Buy the token back on the open market and deliver the net amount to the contract.'
                    : 'The borrower must deliver the net amount by maturity + grace.'}
                </p>
              </div>
            </div>

            <div className={`tl-item${remaining <= 0 || loan.status !== 'ACTIVE' ? ' tl-item--done' : ''}`}>
              <span className="tl-dot">{remaining <= 0 || loan.status !== 'ACTIVE' ? <IconCheck size={11} /> : null}</span>
              <div className="tl-body">
                <div className="tl-head">
                  <span className="tl-title">MATURITY + 24H GRACE</span>
                  <span className="tl-when">{fmtDate(maturityOffset + DAY, n)}</span>
                </div>
                <p className="tl-copy">No price triggers anything here — only time and delivery.</p>
              </div>
            </div>

            {loan.status === 'RETURNED' && (
              <div className="tl-item tl-item--done">
                <span className="tl-dot"><IconCheck size={11} /></span>
                <div className="tl-body">
                  <div className="tl-head">
                    <span className="tl-title">SETTLED — COLLATERAL RELEASED, FEE KEPT</span>
                    <span className="tl-when">{loan.settledAtOffset !== undefined ? fmtAgo(n - loan.settledAtOffset) : ''}</span>
                  </div>
                  <p className="tl-copy">
                    Net delivery verified. {fmtUsd(loan.collateralUsdc)} USDC returned to the
                    borrower; the {fmtUsd(loan.feeUsdc)} fee stays with the lender.
                  </p>
                </div>
              </div>
            )}

            {loan.status === 'CLAIMABLE' && (
              <div className="tl-item tl-item--neg">
                <span className="tl-dot">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5L21.5 20h-19L12 3.5z"/><path d="M12 10v4.5"/></svg>
                </span>
                <div className="tl-body">
                  <div className="tl-head">
                    <span className="tl-title">NOT RETURNED — CLAIM WINDOW OPEN</span>
                  </div>
                  <p className="tl-copy">
                    The borrower did not return the token after maturity + grace. The{' '}
                    {fmtUsd(loan.collateralUsdc)} USDC collateral is claimable by you, the lender.
                  </p>
                </div>
              </div>
            )}

            {loan.status === 'CLAIMED' && (
              <div className="tl-item tl-item--neg">
                <span className="tl-dot">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5L21.5 20h-19L12 3.5z"/><path d="M12 10v4.5"/></svg>
                </span>
                <div className="tl-body">
                  <div className="tl-head">
                    <span className="tl-title">COLLATERAL CLAIMED BY LENDER</span>
                    <span className="tl-when">{loan.settledAtOffset !== undefined ? fmtAgo(n - loan.settledAtOffset) : ''}</span>
                  </div>
                  <p className="tl-copy">
                    No return after maturity + grace. {fmtUsd(loan.collateralUsdc)} USDC collateral
                    released to the lender.
                  </p>
                </div>
              </div>
            )}

            {loan.status === 'ACTIVE' && (
              <div className="tl-item">
                <span className="tl-dot" />
                <div className="tl-body">
                  <div className="tl-head">
                    <span className="tl-title">SETTLEMENT PENDING</span>
                  </div>
                  <p className="tl-copy">
                    Returned token releases collateral · no return after grace converts it to the
                    lender.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Reveal>

      {/* actions */}
      <Reveal delay={140}>
        <div className="view-actions">
          {loan.direction === 'BORROWED' && loan.status === 'ACTIVE' && (
            <>
              <Btn variant="primary" arrow onClick={() => setReturnOpen(true)}>
                BUY &amp; RETURN
              </Btn>
              <Btn variant="ghost" onClick={() => actions.nav('verify')}>
                VERIFY
              </Btn>
            </>
          )}
          {loan.direction === 'LENT' && loan.status === 'CLAIMABLE' && (
            <>
              <Btn variant="primary" arrow onClick={() => setClaimOpen(true)}>
                CLAIM COLLATERAL — {fmtUsd(loan.collateralUsdc)}
              </Btn>
              <Btn variant="ghost" onClick={() => actions.nav('verify')}>
                VERIFY
              </Btn>
            </>
          )}
          {(loan.status === 'RETURNED' || loan.status === 'CLAIMED') && (
            <Btn variant="ghost" arrow onClick={() => actions.nav('verify')}>
              VIEW RECEIPT
            </Btn>
          )}
        </div>
      </Reveal>

      {loan.direction === 'BORROWED' && (
        <BuyReturnDrawer
          loan={loan}
          marketPrice={marketPrice}
          open={returnOpen}
          onClose={() => setReturnOpen(false)}
        />
      )}
      {loan.direction === 'LENT' && (
        <ClaimDrawer loan={loan} open={claimOpen} onClose={() => setClaimOpen(false)} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* buy & return drawer                                                 */
/* ------------------------------------------------------------------ */

const RETURN_STEPS = [
  'BUY 0.005000 ON THE OPEN MARKET',
  'DELIVER TO LOCATE CONTRACT',
  'VERIFY NET DELIVERY',
]

function BuyReturnDrawer({
  loan,
  marketPrice,
  open,
  onClose,
}: {
  loan: Loan
  marketPrice: number
  open: boolean
  onClose: () => void
}) {
  const { actions } = useStore()
  const [phase, setPhase] = useState<'review' | 'busy' | 'done'>('review')
  const [step, setStep] = useState(0)
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  useEffect(() => {
    if (open) {
      setPhase('review')
      setStep(0)
      setReceipt(null)
    }
  }, [open, loan.id])

  useEffect(() => {
    if (phase !== 'busy') return
    const t = window.setTimeout(() => setStep((s) => Math.min(s + 1, RETURN_STEPS.length)), 700)
    return () => window.clearTimeout(t)
  }, [phase, step])

  const cover = loan.returnRequirement * marketPrice
  const net = loan.collateralUsdc - cover

  const confirm = async () => {
    setPhase('busy')
    setStep(0)
    const r = await actions.buyAndReturn(loan.id)
    setStep(RETURN_STEPS.length)
    setReceipt(r ?? null)
    setPhase('done')
  }

  const close = () => {
    setPhase('review')
    setReceipt(null)
    onClose()
  }

  return (
    <Drawer open={open} onClose={close} title="BUY & RETURN — OPENAI">
      {phase === 'review' ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="payline">
              <span className="pl-k">EST. COVER COST — {fmtToken(loan.returnRequirement)} AT ${marketPrice.toLocaleString('en-US')}</span>
              <span className="pl-v">~{fmtUsd(cover)}</span>
            </div>
            <div className="payline">
              <span className="pl-k">COLLATERAL RELEASED ON DELIVERY</span>
              <span className="pl-v">+{fmtUsd(loan.collateralUsdc)}</span>
            </div>
            <div className="payline payline--total">
              <span className="pl-k">NET AFTER RETURN</span>
              <span className="pl-v">{net >= 0 ? `+${fmtUsd(net)}` : `−${fmtUsd(-net)}`}</span>
            </div>
          </div>

          <dl className="rows">
            <RowLine k="RETURN REQUIREMENT" v={`${fmtToken(loan.returnRequirement)} NET`} />
            <RowLine k="UPFRONT FEE — ALREADY PAID" v={fmtUsd(loan.feeUsdc)} />
          </dl>

          <Notice tone="info">
            <span>
              You&apos;ll buy back {fmtToken(loan.returnRequirement)} {loan.asset} on the open market
              and deliver it to the contract. Collateral releases on verified net delivery.
            </span>
          </Notice>

          <Btn variant="primary" block onClick={confirm}>
            CONFIRM — BUY &amp; RETURN
          </Btn>
        </>
      ) : phase === 'busy' ? (
        <StagedProgress steps={RETURN_STEPS} current={step} />
      ) : (
        <>
          <div className="done-state">
            <span className="ds-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 12.5l5 5L19.5 7" />
              </svg>
            </span>
            <span className="ds-title">RETURNED — COLLATERAL RELEASED</span>
            <p className="ds-copy">
              Receipt {receipt?.id ?? ''} issued. Verification passed: net delivery met.{' '}
              {fmtUsd(loan.collateralUsdc)} USDC is back in your wallet.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn
              variant="primary"
              block
              arrow
              onClick={() => {
                close()
                actions.nav('verify')
              }}
            >
              VIEW RECEIPT
            </Btn>
            <Btn variant="ghost" block onClick={close}>
              CLOSE
            </Btn>
          </div>
        </>
      )}
    </Drawer>
  )
}

/* ------------------------------------------------------------------ */
/* claim drawer                                                        */
/* ------------------------------------------------------------------ */

function ClaimDrawer({ loan, open, onClose }: { loan: Loan; open: boolean; onClose: () => void }) {
  const { actions } = useStore()
  const [phase, setPhase] = useState<'review' | 'busy' | 'done'>('review')
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  useEffect(() => {
    if (open) {
      setPhase('review')
      setReceipt(null)
    }
  }, [open, loan.id])

  const confirm = async () => {
    setPhase('busy')
    const r = await actions.claimCollateral(loan.id)
    setReceipt(r ?? null)
    setPhase('done')
  }

  const close = () => {
    setPhase('review')
    setReceipt(null)
    onClose()
  }

  return (
    <Drawer open={open} onClose={close} title={`CLAIM COLLATERAL — ${loan.id}`}>
      {phase !== 'done' ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="payline">
              <span className="pl-k">TOKEN DELIVERED</span>
              <span className="pl-v">{fmtToken(loan.amount)} OPENAI</span>
            </div>
            <div className="payline">
              <span className="pl-k">RETURNED</span>
              <span className="pl-v" style={{ color: 'var(--danger-soft)' }}>0.000000 — NONE</span>
            </div>
            <div className="payline">
              <span className="pl-k">MATURITY + GRACE</span>
              <span className="pl-v" style={{ color: 'var(--danger-soft)' }}>ELAPSED</span>
            </div>
            <div className="payline payline--total">
              <span className="pl-k">YOU CLAIM</span>
              <span className="pl-v">{fmtUsd(loan.collateralUsdc)} USDC</span>
            </div>
          </div>

          <Notice tone="neg">
            <span>
              The borrower did not return the token after maturity + grace. The USDC collateral is
              released to you as the lender.
            </span>
          </Notice>

          <Btn variant="primary" block busy={phase === 'busy'} onClick={confirm}>
            CONFIRM — CLAIM {fmtUsd(loan.collateralUsdc)} USDC
          </Btn>
        </>
      ) : (
        <>
          <div className="done-state">
            <span className="ds-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 12.5l5 5L19.5 7" />
              </svg>
            </span>
            <span className="ds-title">COLLATERAL CLAIMED</span>
            <p className="ds-copy">
              Receipt {receipt?.id ?? ''} issued. {fmtUsd(loan.collateralUsdc)} USDC released to
              your wallet.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn
              variant="primary"
              block
              arrow
              onClick={() => {
                close()
                actions.nav('verify')
              }}
            >
              VIEW RECEIPT
            </Btn>
            <Btn variant="ghost" block onClick={close}>
              CLOSE
            </Btn>
          </div>
        </>
      )}
    </Drawer>
  )
}
