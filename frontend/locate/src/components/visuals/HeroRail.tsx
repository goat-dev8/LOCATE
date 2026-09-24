/**
 * HeroRail — the LOCATE system diagram.
 *
 * An original, proprietary-feeling technical illustration: a PreStock travels
 * down the lending rail (lender → offer → borrower → short), USDC collateral
 * + fee travels up to the contract, and the token returns up the settlement
 * rail. Everything scales with the stage via container queries.
 */
import type { CSSProperties } from 'react'

/** shorthand for cqw-positioned absolutes */
const at = (left: number, top: number, width?: number, extra?: Record<string, string | number>): CSSProperties => ({
  position: 'absolute' as const,
  left: `${left}cqw`,
  top: `${top}cqw`,
  ...(width !== undefined ? { width: `${width}cqw` } : {}),
  ...extra,
})

export function HeroRail() {
  return (
    <div
      className="stage stage--hero"
      role="img"
      aria-label="LOCATE system diagram: an OPENAI PreStock flows from the lender through the LOCATE offer contract to a borrower who can short it; the borrower posts USDC collateral and fee; the token is bought back and returned at maturity, releasing collateral and keeping the fee with the lender; if not returned, the lender claims the collateral."
    >
      <div className="stage-frame" />
      <span className="stage-corner stage-corner--tl">LOCATE RAIL — 01</span>
      <span className="stage-corner stage-corner--tr">SAMPLE TERMS</span>
      <span className="stage-corner stage-corner--bl">TOKEN-2022</span>
      <span className="stage-corner stage-corner--br">TIME + DELIVERY</span>

      {/* ── left spine: the token's journey down ─────────────────── */}
      <div className="rail-v" style={at(14.8, 8, undefined, { height: '106cqw' })} />
      <span className="rail-head" style={at(15, 114.5)} aria-hidden="true" />

      {/* stations */}
      <span className="station station--pulse" style={at(15, 14)} aria-hidden="true" />
      <span className="station" style={at(15, 33)} aria-hidden="true" />
      <span className="station station--lime station--pulse" style={at(15, 58)} aria-hidden="true" />
      <span className="station" style={at(15, 92)} aria-hidden="true" />
      <span className="station station--pulse" style={at(15, 111)} aria-hidden="true" />

      {/* token particles traveling down the spine */}
      <span
        className="rail-particle rail-particle--token"
        style={{ ...at(13.55, 9.5), ['--travel' as never]: '107cqw', ['--pdur' as never]: '5.2s', ['--pdelay' as never]: '0.6s' }}
        aria-hidden="true"
      />
      <span
        className="rail-particle rail-particle--token"
        style={{ ...at(13.55, 9.5), ['--travel' as never]: '107cqw', ['--pdur' as never]: '5.2s', ['--pdelay' as never]: '3.2s' }}
        aria-hidden="true"
      />

      {/* ── nodes ─────────────────────────────────────────────────── */}
      <div className="rail-card" style={at(21, 6, 40)}>
        <div className="rail-eyebrow">PRESTOCK · TOKEN-2022</div>
        <div className="rail-amount">OPENAI · 0.005000</div>
        <div className="rail-row">
          <span className="k">DEX $1,337</span>
          <span className="v">REF $1,026</span>
        </div>
      </div>

      {/* premium annotation */}
      <div style={at(61, 10.9, 4.5, { height: '1px', background: 'var(--line-2)' })} aria-hidden="true" />
      <span className="premium-badge" style={at(66, 8)}>
        ▲ +30% PREMIUM
      </span>

      <div className="rail-card" style={at(21, 25, 37)}>
        <div className="rail-eyebrow">LENDER — 7fKd…2Qx9</div>
        <div className="rail-amount">0.005000 OPENAI</div>
        <div className="rail-row">
          <span className="k">STATUS</span>
          <span className="v">IN WALLET</span>
        </div>
      </div>

      {/* the contract — the heart of the rail */}
      <div className="rail-card rail-card--ink" style={at(21, 47, 49)}>
        <div className="rail-head-row">
          <svg className="rail-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <circle cx="16" cy="16" r="9" fill="none" stroke="#6798FF" strokeWidth="2.4" />
            <path d="M16 2v6M16 24v6M2 16h6M24 16h6" stroke="#6798FF" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="16" cy="16" r="2.6" fill="#6798FF" />
          </svg>
          <span className="rh-title">LOCATE OFFER</span>
          <span className="rail-open">
            <span className="ro-dot" aria-hidden="true" />
            OPEN
          </span>
        </div>
        <div className="rail-row"><span className="k">TERM</span><span className="v">7 DAYS</span></div>
        <div className="rail-row"><span className="k">UPFRONT FEE</span><span className="v">$0.35 USDC</span></div>
        <div className="rail-row"><span className="k">COLLATERAL</span><span className="v">$12.50 USDC</span></div>
        <div className="rail-row"><span className="k">EXPIRY</span><span className="v">48H</span></div>
      </div>

      <div className="rail-card" style={at(21, 86, 37)}>
        <div className="rail-eyebrow">BORROWER — 3cAe…8f1D</div>
        <div className="rail-amount">RECEIVES 0.005000</div>
        <div className="rail-row">
          <span className="k">POSTS</span>
          <span className="v">$12.85 USDC</span>
        </div>
      </div>

      <div className="rail-card--short" style={at(21, 109, 49)}>
        <span className="rs-text">SHORT — SELL 0.005000 ON THE DEX</span>
      </div>

      {/* ── right lanes: USDC in (payment) & token return ─────────── */}
      {/* usdc lane: borrower → contract */}
      <div className="rail-h" style={at(58, 94.8, 18)} aria-hidden="true" />
      <div className="rail-v rail-v--rev" style={at(75.8, 66, undefined, { height: '28.5cqw' })} aria-hidden="true" />
      <div className="rail-h rail-h--rev" style={at(70.2, 65.8, 5.6)} aria-hidden="true" />
      <span className="rail-head rail-head--left" style={at(70.4, 66.8)} aria-hidden="true" />

      <span
        className="rail-particle rail-particle--usdc"
        style={{ ...at(74.4, 93), ['--travel' as never]: '-26.5cqw', ['--pdur' as never]: '2.8s', ['--pdelay' as never]: '1.8s' }}
        aria-hidden="true"
      >
        $
      </span>

      <span className="rail-tag" style={at(78.5, 75)}>USDC + FEE</span>

      {/* return lane: borrower → net check → lender */}
      <div className="rail-h rail-h--lime" style={at(58, 90.8, 30)} aria-hidden="true" />
      <div className="rail-v rail-v--lime rail-v--rev" style={at(87.8, 36, undefined, { height: '54.5cqw' })} aria-hidden="true" />
      <div className="rail-h rail-h--lime rail-h--rev" style={at(58, 33.8, 30)} aria-hidden="true" />
      <span className="rail-head rail-head--left rail-head--lime" style={at(58.4, 34.8)} aria-hidden="true" />

      <span className="station station--lime" style={at(88, 58)} aria-hidden="true" />
      <span className="rail-tag rail-tag--lime" style={at(72, 56.5)}>NET CHECK</span>
      <span className="rail-tag rail-tag--lime" style={at(62, 44)}>RETURN 0.005000 NET</span>
      <span className="rail-tag rail-tag--lime" style={at(62, 28.5)}>+ FEE $0.35 KEPT</span>

      <span
        className="rail-particle rail-particle--token"
        style={{ ...at(86.55, 88), ['--travel' as never]: '-52cqw', ['--pdur' as never]: '3.6s', ['--pdelay' as never]: '2.6s' }}
        aria-hidden="true"
      />

      {/* ── settlement strip ──────────────────────────────────────── */}
      <div className="settle-strip" style={at(21, 0, undefined, { top: 'auto', bottom: '3cqw', right: '8cqw' })}>
        <span className="ss-text">
          SETTLE — <b>COLLATERAL → BORROWER</b> · <b>FEE → LENDER</b>
        </span>
        <span className="ss-claim">NOT RETURNED AFTER MATURITY + GRACE → LENDER CLAIMS USDC</span>
      </div>
    </div>
  )
}
