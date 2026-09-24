/**
 * Create offer — one focused panel: form left, live summary right,
 * confirmation in a drawer. Tokens never leave the wallet until taken.
 */
import { useEffect, useState } from 'react'
import { useStore } from '../../../state/StoreProvider'
import { Btn, Drawer, Field, Notice, Reveal, RowLine, SelectField, Segmented } from '../../primitives'
import { fmtToken, fmtUsd } from '../../../lib/session'
import type { Offer, OfferDraft, TermDays } from '../../../types'

const TERM_OPTIONS = [
  { value: 7, label: '7 DAYS' },
  { value: 14, label: '14 DAYS' },
  { value: 30, label: '30 DAYS' },
] as const

const EXPIRY_OPTIONS = [
  { value: 24, label: '24H' },
  { value: 48, label: '48H' },
  { value: 168, label: '7D' },
]

export function CreateOfferView() {
  const { state, actions } = useStore()
  const market = state.market.find((m) => m.asset === 'OPENAI')
  const [amount, setAmount] = useState('0.005')
  const [collateral, setCollateral] = useState('12.50')
  const [fee, setFee] = useState('0.35')
  const [termDays, setTermDays] = useState<TermDays>(7)
  const [expiryHours, setExpiryHours] = useState(48)
  const [confirming, setConfirming] = useState(false)

  const amountN = Number(amount) || 0
  const collateralN = Number(collateral) || 0
  const feeN = Number(fee) || 0
  const marketValue = amountN * (market?.marketPrice ?? 1337)
  const collateralization = marketValue > 0 ? (collateralN / marketValue) * 100 : 0
  const amountError =
    amountN <= 0
      ? 'Enter an amount to list'
      : amountN > state.wallet.openai
        ? 'Exceeds your session balance'
        : undefined

  const valid = amountN > 0 && amountN <= state.wallet.openai && collateralN > 0 && feeN >= 0

  const draft: OfferDraft = {
    asset: 'OPENAI',
    amount: amountN,
    collateralUsdc: collateralN,
    feeUsdc: feeN,
    termDays,
    expiryHours,
  }

  return (
    <div className="view view-enter">
      <div className="view-head">
        <div>
          <h1 className="view-title">CREATE OFFER</h1>
          <p className="view-sub">List your OPENAI as borrowable short supply.</p>
        </div>
        <div className="view-actions">
          <Btn variant="ghost" size="sm" onClick={() => actions.nav('book')}>
            ← BACK TO BOOK
          </Btn>
        </div>
      </div>

      <div className="grid-2">
        <Reveal>
          <div className="card card--pad">
            <span className="card-label">OFFER TERMS</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 16 }}>
              <SelectField label="PRESTOCK" defaultValue="OPENAI" disabled>
                <option value="OPENAI">OPENAI — TOKEN-2022</option>
              </SelectField>
              <p className="field-hint" style={{ marginTop: -10 }}>
                Fee-aware delivery · exact net return requirement
              </p>

              <Field
                label="AMOUNT"
                suffix="OPENAI"
                aux={`MAX ${fmtToken(state.wallet.openai)}`}
                type="number"
                step="0.000001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={amountError}
              />

              <Field
                label="USDC COLLATERAL"
                suffix="USDC"
                hint="Posted by the borrower; claimable by you on default"
                type="number"
                step="0.01"
                min="0"
                value={collateral}
                onChange={(e) => setCollateral(e.target.value)}
              />

              <Field
                label="UPFRONT FEE"
                suffix="USDC"
                hint="Paid to you immediately when the offer is taken"
                type="number"
                step="0.01"
                min="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />

              <div className="field">
                <span className="field-label"><span>TERM</span></span>
                <Segmented
                  ariaLabel="Loan term"
                  options={TERM_OPTIONS}
                  value={termDays}
                  onChange={(v) => setTermDays(v as TermDays)}
                  full
                />
              </div>

              <div className="field">
                <span className="field-label"><span>OFFER EXPIRY</span></span>
                <Segmented
                  ariaLabel="Offer expiry"
                  options={EXPIRY_OPTIONS}
                  value={expiryHours}
                  onChange={setExpiryHours}
                  full
                />
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="card card--pad" style={{ position: 'sticky', top: 84 }}>
            <span className="card-label">OFFER SUMMARY</span>
            <dl className="rows" style={{ marginTop: 14 }}>
              <RowLine k="AMOUNT" v={`${fmtToken(amountN)} OPENAI`} />
              <RowLine k="COLLATERAL" v={`${fmtUsd(collateralN)} USDC`} />
              <RowLine k="UPFRONT FEE" v={`${fmtUsd(feeN)} USDC`} tone="lime" />
              <RowLine k="TERM" v={`${termDays} DAYS`} />
              <RowLine k="EXPIRY" v={expiryHours === 168 ? '7 DAYS' : `${expiryHours}H`} />
              <RowLine
                k="COLLATERALIZATION"
                v={`${Number.isFinite(collateralization) ? collateralization.toFixed(0) : '—'}% OF MARKET`}
              />
            </dl>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
              <Notice tone="lime">
                <span>
                  <strong>YOU KEEP YOUR TOKENS UNTIL THE OFFER IS TAKEN.</strong> The listing is
                  passive — inventory stays in your wallet.
                </span>
              </Notice>
              {collateralization > 0 && collateralization < 110 && (
                <Notice tone="warn">
                  Thin collateral — if the borrower defaults, you claim less than the market value
                  of the tokens.
                </Notice>
              )}
              <Btn variant="primary" block arrow disabled={!valid} onClick={() => setConfirming(true)}>
                CREATE OFFER
              </Btn>
            </div>
          </div>
        </Reveal>
      </div>

      <ConfirmOfferDrawer
        open={confirming}
        draft={draft}
        onClose={() => setConfirming(false)}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* confirm drawer                                                      */
/* ------------------------------------------------------------------ */

function ConfirmOfferDrawer({
  open,
  draft,
  onClose,
}: {
  open: boolean
  draft: OfferDraft
  onClose: () => void
}) {
  const { actions } = useStore()
  const [phase, setPhase] = useState<'review' | 'busy' | 'done'>('review')
  const [created, setCreated] = useState<Offer | null>(null)

  // reset drawer state whenever it is (re)opened
  useEffect(() => {
    if (open) {
      setPhase('review')
      setCreated(null)
    }
  }, [open])

  const confirm = async () => {
    setPhase('busy')
    const offer = await actions.createOffer(draft)
    setCreated(offer)
    setPhase('done')
  }

  const close = () => {
    setPhase('review')
    setCreated(null)
    onClose()
  }

  return (
    <Drawer open={open} onClose={close} title="CONFIRM OFFER">
      {phase !== 'done' ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="payline">
              <span className="pl-k">LISTING</span>
              <span className="pl-v">{fmtToken(draft.amount)} OPENAI</span>
            </div>
            <div className="payline">
              <span className="pl-k">COLLATERAL REQUIRED</span>
              <span className="pl-v">{fmtUsd(draft.collateralUsdc)}</span>
            </div>
            <div className="payline">
              <span className="pl-k">UPFRONT FEE TO YOU</span>
              <span className="pl-v">{fmtUsd(draft.feeUsdc)}</span>
            </div>
            <div className="payline">
              <span className="pl-k">TERM</span>
              <span className="pl-v">{draft.termDays} DAYS</span>
            </div>
          </div>

          <Notice tone="info">
            <span>
              <strong style={{ color: 'var(--ink)' }}>What happens next —</strong> the listing goes
              live in the book. Your tokens stay in your wallet until a borrower takes the offer.
            </span>
          </Notice>

          <Btn variant="primary" block busy={phase === 'busy'} onClick={confirm}>
            CONFIRM — LIST OFFER
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
            <span className="ds-title">OFFER CREATED</span>
            <p className="ds-copy">
              Listing {created?.id ?? ''} is active in the book. You keep your tokens until a
              borrower takes the offer.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn
              variant="primary"
              block
              arrow
              onClick={() => {
                close()
                actions.nav('offers')
              }}
            >
              VIEW MY OFFERS
            </Btn>
            <Btn variant="ghost" block onClick={close}>
              BACK TO FORM
            </Btn>
          </div>
        </>
      )}
    </Drawer>
  )
}
