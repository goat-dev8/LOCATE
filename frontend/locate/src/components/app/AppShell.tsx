/**
 * AppShell — the LOCATE workspace.
 * One sidebar, one content surface, one status bar. No page sprawl:
 * secondary actions live in drawers, never in new routes.
 */
import type { AppSection } from '../../types'
import { selectActiveOffers, useStore } from '../../state/StoreProvider'
import { Wordmark } from '../brand/Wordmark'
import {
  IconArrowLeft,
  IconBook,
  IconGauge,
  IconLoop,
  IconShieldCheck,
  IconTag,
} from '../primitives/icons'
import { fmtToken, fmtUsd } from '../../lib/session'
import {
  BookView,
  CreateOfferView,
  LoanDetailView,
  MyLoansView,
  MyOffersView,
  OverviewView,
  VerifyView,
} from './views'

const NAV: Array<{ id: AppSection; label: string; icon: typeof IconGauge }> = [
  { id: 'overview', label: 'Overview', icon: IconGauge },
  { id: 'book', label: 'Book', icon: IconBook },
  { id: 'offers', label: 'My Offers', icon: IconTag },
  { id: 'loans', label: 'My Loans', icon: IconLoop },
  { id: 'verify', label: 'Verify', icon: IconShieldCheck },
]

const TITLES: Record<AppSection, string> = {
  overview: 'Overview',
  book: 'Book',
  create: 'Create offer',
  loan: 'Loan',
  offers: 'My offers',
  loans: 'My loans',
  verify: 'Verify',
}

function Sidebar() {
  const { state, actions } = useStore()
  const activeOffers = selectActiveOffers(state.offers).length
  const myActiveOffers = selectActiveOffers(state.offers).filter((o) => o.isYours).length
  const myLoansOpen = state.loans.filter((l) => l.status === 'ACTIVE' || l.status === 'CLAIMABLE').length

  const counts: Partial<Record<AppSection, number>> = {
    book: activeOffers,
    offers: myActiveOffers,
    loans: myLoansOpen,
  }

  return (
    <aside className="sidebar on-dark">
      <div className="sidebar-head">
        <button className="sidebar-brand" onClick={() => actions.nav('overview')} aria-label="LOCATE — overview">
          <Wordmark dark />
        </button>
        <button className="sidebar-back" onClick={actions.goLanding}>
          <IconArrowLeft size={12} />
          BACK TO SITE
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Workspace">
        {NAV.map(({ id, label, icon: Icon }) => {
          const current = state.section === id || (id === 'overview' && state.section === 'create')
          return (
            <button
              key={id}
              className="side-item"
              aria-current={current ? 'page' : undefined}
              onClick={() => actions.nav(id)}
            >
              <Icon size={17} />
              {label}
              {counts[id] !== undefined && counts[id]! > 0 && (
                <span className="side-count">{counts[id]}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="wallet">
        <button
          className="wallet-row"
          onClick={() => actions.toast('Preview session', 'No real wallet is connected — this is the design preview.', 'neutral')}
          aria-label="Session wallet details"
        >
          <span className="wallet-dot" aria-hidden="true" />
          <span className="wallet-addr">
            {state.wallet.address.slice(0, 4)}…{state.wallet.address.slice(-4)}
          </span>
          <span className="wallet-tag">PREVIEW</span>
        </button>
        <div className="wallet-balances">
          <div className="wb-line">
            <span>USDC</span>
            <span className="wb-v">{fmtUsd(state.wallet.usdc)}</span>
          </div>
          <div className="wb-line">
            <span>OPENAI</span>
            <span className="wb-v">{fmtToken(state.wallet.openai)}</span>
          </div>
          <div className="wb-line">
            <span>SOL</span>
            <span className="wb-v">{state.wallet.sol.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function MobileHead() {
  const { state, actions } = useStore()
  return (
    <div className="mobile-head">
      <button className="icon-btn" onClick={actions.goLanding} aria-label="Back to site">
        <IconArrowLeft size={16} />
      </button>
      <button className="sidebar-brand" style={{ background: 'none' }} onClick={() => actions.nav('overview')} aria-label="LOCATE — overview">
        <Wordmark />
      </button>
      <button
        className="mh-wallet"
        onClick={() => actions.toast('Preview session', 'No real wallet is connected — this is the design preview.', 'neutral')}
      >
        <span className="live-dot" aria-hidden="true" />
        {state.wallet.address.slice(0, 4)}…{state.wallet.address.slice(-4)}
      </button>
    </div>
  )
}

function Topbar() {
  const { state } = useStore()
  const q = state.market.find((m) => m.asset === 'OPENAI')
  return (
    <div className="topbar">
      <span className="topbar-title">{TITLES[state.section]}</span>
      {q && (
        <span className="topbar-market">
          <span>OPENAI ${q.marketPrice.toLocaleString('en-US')}</span>
          <span className="tm-prem">+{q.premiumPct.toFixed(1)}%</span>
          <span className="tm-live">
            <span className="live-dot" aria-hidden="true" />
            SAMPLE
          </span>
        </span>
      )}
    </div>
  )
}

function Statusbar() {
  return (
    <div className="statusbar">
      <span className="sb-dot" aria-hidden="true" />
      <span>PREVIEW SESSION</span>
      <span>SAMPLE MARKET STATE</span>
      <span className="sb-right">LOCATE RAIL v0.1 — TIME + DELIVERY</span>
    </div>
  )
}

function Tabbar() {
  const { state, actions } = useStore()
  return (
    <nav className="tabbar" aria-label="Workspace">
      <div className="tabbar-items">
        {NAV.map(({ id, label, icon: Icon }) => {
          const current = state.section === id || (id === 'overview' && state.section === 'create')
          return (
            <button
              key={id}
              className="tab-item"
              aria-current={current ? 'page' : undefined}
              onClick={() => actions.nav(id)}
            >
              <Icon size={19} />
              {label === 'My Offers' ? 'OFFERS' : label === 'My Loans' ? 'LOANS' : label.toUpperCase()}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function CurrentView() {
  const { state } = useStore()
  switch (state.section) {
    case 'book':
      return <BookView />
    case 'create':
      return <CreateOfferView />
    case 'loan':
      return <LoanDetailView />
    case 'offers':
      return <MyOffersView />
    case 'loans':
      return <MyLoansView />
    case 'verify':
      return <VerifyView />
    default:
      return <OverviewView />
  }
}

export function AppShell() {
  return (
    <div className="app view-enter">
      <MobileHead />
      <div className="app-body">
        <Sidebar />
        <div className="main">
          <Topbar />
          <main className="content">
            <CurrentView />
          </main>
          <Statusbar />
        </div>
      </div>
      <Tabbar />
    </div>
  )
}
