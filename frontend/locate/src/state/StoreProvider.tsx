/**
 * LOCATE client store.
 *
 * One workspace, one store. The reducer is pure; everything dynamic
 * (simulated market arrivals, toast timers, hash routing) lives in
 * provider effects and is idempotent under StrictMode double-mounts.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import type {
  Action,
  AppSection,
  AppState,
  Loan,
  Offer,
  OfferDraft,
  Receipt,
} from '../types'
import * as svc from '../services/locateService'
import { sessionElapsed, sessionStart } from '../lib/session'
import { SIMULATED_TAKER_DELAY_MS } from '../data/seed'

const initialState: AppState = {
  booted: false,
  view: 'landing',
  section: 'overview',
  selectedLoanId: null,
  market: [],
  wallet: { label: '', address: '', sol: 0, usdc: 0, openai: 0 },
  offers: [],
  loans: [],
  receipts: [],
  toasts: [],
  arrivedOfferIds: [],
}

function pushToast(
  state: AppState,
  title: string,
  body: string | undefined,
  tone: 'neutral' | 'positive' | 'warn',
): AppState {
  const id = Date.now() + state.toasts.length
  return {
    ...state,
    toasts: [...state.toasts, { id, title, body, tone }].slice(-3),
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'BOOT':
      return {
        ...state,
        booted: true,
        market: action.market,
        wallet: action.wallet,
        offers: action.offers,
        loans: action.loans,
        receipts: action.receipts,
      }

    case 'NAV':
      return {
        ...state,
        view: action.view,
        section: action.section ?? (action.view === 'app' ? 'overview' : state.section),
        selectedLoanId: action.loanId !== undefined ? action.loanId : null,
      }

    case 'OFFER_ARRIVED': {
      if (
        state.offers.some((o) => o.id === action.offer.id) ||
        state.arrivedOfferIds.includes(action.offer.id)
      ) {
        return state
      }
      const next: AppState = {
        ...state,
        offers: [...state.offers, action.offer],
        arrivedOfferIds: [...state.arrivedOfferIds, action.offer.id],
      }
      return pushToast(
        next,
        'New supply listed',
        `${action.offer.lenderAddr.slice(0, 4)}…${action.offer.lenderAddr.slice(-4)} listed ${action.offer.amount.toFixed(6)} OPENAI`,
        'positive',
      )
    }

    case 'OFFER_CREATED':
      return pushToast(
        { ...state, offers: [...state.offers, action.offer] },
        'Offer created',
        'Your tokens stay in your wallet until the offer is taken.',
        'positive',
      )

    case 'OFFER_CANCELLED':
      return pushToast(
        {
          ...state,
          offers: state.offers.map((o) =>
            o.id === action.offerId ? { ...o, status: 'CANCELLED' as const } : o,
          ),
        },
        'Offer cancelled',
        'Listing removed from the book.',
        'neutral',
      )

    case 'OFFER_TAKEN': {
      const offer = state.offers.find((o) => o.id === action.offerId)
      if (!offer || offer.status !== 'ACTIVE') return state
      const loan = action.loan
      const wallet = { ...state.wallet }
      if (offer.isYours) {
        // tokens leave at delivery; the upfront fee is paid to you immediately
        wallet.openai = Math.max(0, wallet.openai - offer.amount)
        wallet.usdc += offer.feeUsdc
      } else {
        // you are the borrower: post collateral + fee, receive the token
        wallet.usdc -= offer.collateralUsdc + offer.feeUsdc
        wallet.openai += offer.amount
      }
      const next: AppState = {
        ...state,
        wallet,
        offers: state.offers.map((o) =>
          o.id === action.offerId
            ? {
                ...o,
                status: 'TAKEN' as const,
                takenAtOffset: loan.borrowedAtOffset,
                takenByAddr: loan.borrowerAddr,
              }
            : o,
        ),
        loans: [loan, ...state.loans],
      }
      return pushToast(
        next,
        offer.isYours ? 'Your offer was taken' : 'Token delivered',
        offer.isYours
          ? `${loan.borrowerAddr.slice(0, 4)}…${loan.borrowerAddr.slice(-4)} borrowed ${offer.amount.toFixed(6)} OPENAI against $${offer.collateralUsdc.toFixed(2)} USDC.`
          : `Loan ${loan.id} active — return ${loan.returnRequirement.toFixed(6)} OPENAI by maturity.`,
        'positive',
      )
    }

    case 'LOAN_RETURNED': {
      const loan = state.loans.find((l) => l.id === action.loanId)
      if (!loan || loan.status !== 'ACTIVE') return state
      const wallet = { ...state.wallet }
      if (loan.direction === 'BORROWED') {
        wallet.usdc = wallet.usdc - action.coverCostUsd + loan.collateralUsdc // buy back, then collateral releases
        wallet.openai = Math.max(0, wallet.openai - loan.returnRequirement)
      } else {
        wallet.openai += loan.returnRequirement // tokens returned to you, the lender
      }
      const next: AppState = {
        ...state,
        wallet,
        loans: state.loans.map((l) =>
          l.id === action.loanId
            ? { ...l, status: 'RETURNED' as const, settledAtOffset: action.receipt.tsOffset }
            : l,
        ),
        receipts: [action.receipt, ...state.receipts],
      }
      return pushToast(
        next,
        loan.direction === 'BORROWED' ? 'Returned — collateral released' : 'Token returned',
        loan.direction === 'BORROWED'
          ? `$${loan.collateralUsdc.toFixed(2)} USDC back to you — receipt ${action.receipt.id}.`
          : `${loan.returnRequirement.toFixed(6)} OPENAI is back in your wallet — receipt ${action.receipt.id}.`,
        'positive',
      )
    }

    case 'LOAN_CLAIMED': {
      const loan = state.loans.find((l) => l.id === action.loanId)
      if (!loan || loan.status !== 'CLAIMABLE') return state
      const wallet = { ...state.wallet }
      wallet.usdc += loan.collateralUsdc
      const next: AppState = {
        ...state,
        wallet,
        loans: state.loans.map((l) =>
          l.id === action.loanId
            ? { ...l, status: 'CLAIMED' as const, settledAtOffset: action.receipt.tsOffset }
            : l,
        ),
        receipts: [action.receipt, ...state.receipts],
      }
      return pushToast(
        next,
        'Collateral claimed',
        `$${loan.collateralUsdc.toFixed(2)} USDC released to you — receipt ${action.receipt.id}.`,
        'neutral',
      )
    }

    case 'TOAST':
      return pushToast(state, action.title, action.body, action.tone ?? 'neutral')

    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }

    default:
      return state
  }
}

/* ------------------------------------------------------------------ */
/* Context                                                            */
/* ------------------------------------------------------------------ */

export interface StoreActions {
  openApp: (section?: AppSection) => void
  goLanding: () => void
  nav: (section: AppSection, loanId?: string | null) => void
  toast: (title: string, body?: string, tone?: 'neutral' | 'positive' | 'warn') => void
  dismissToast: (id: number) => void
  takeOffer: (offerId: string) => Promise<Loan | undefined>
  createOffer: (draft: OfferDraft) => Promise<Offer>
  cancelOffer: (offerId: string) => Promise<void>
  buyAndReturn: (loanId: string) => Promise<Receipt | undefined>
  claimCollateral: (loanId: string) => Promise<Receipt | undefined>
}

interface StoreValue {
  state: AppState
  actions: StoreActions
}

const StoreContext = createContext<StoreValue | null>(null)

export function LocateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  /* boot — pull preview state through the service seam */
  useEffect(() => {
    sessionStart()
    let alive = true
    Promise.all([
      svc.fetchMarket(),
      svc.fetchWallet(),
      svc.listOffers(),
      svc.listLoans(),
      svc.listReceipts(),
    ]).then(([market, wallet, offers, loans, receipts]) => {
      if (alive) dispatch({ type: 'BOOT', market, wallet, offers, loans, receipts })
    })
    return () => {
      alive = false
    }
  }, [])

  /* simulated market: lenders arrive and turn 0.0000 supply borrowable */
  useEffect(() => {
    if (!state.booted) return
    const t1 = window.setTimeout(() => {
      svc.pollExternalListing('O-1039', sessionElapsed()).then((offer) =>
        dispatch({ type: 'OFFER_ARRIVED', offer }),
      )
    }, 6000)
    const t2 = window.setTimeout(() => {
      svc.pollExternalListing('O-1040', sessionElapsed()).then((offer) =>
        dispatch({ type: 'OFFER_ARRIVED', offer }),
      )
    }, 17000)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [state.booted])

  /* toast auto-dismiss */
  const toastTimers = useRef(new Map<number, number>())
  useEffect(() => {
    for (const t of state.toasts) {
      if (!toastTimers.current.has(t.id)) {
        const timer = window.setTimeout(() => {
          dispatch({ type: 'DISMISS_TOAST', id: t.id })
          toastTimers.current.delete(t.id)
        }, 4600)
        toastTimers.current.set(t.id, timer)
      }
    }
  }, [state.toasts])

  /* hash routing for the app workspace (#app/book, #app/loan/L-1042 …) */
  useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash
      if (!h.startsWith('#app')) return
      const parts = h.slice(1).split('/').filter(Boolean) // ['app', section?, id?]
      const section = (parts[1] as AppSection | undefined) ?? 'overview'
      const loanId = parts[2] ?? null
      const s = stateRef.current
      if (s.view !== 'app' || s.section !== section || s.selectedLoanId !== loanId) {
        dispatch({ type: 'NAV', view: 'app', section, loanId })
      }
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  const writeHash = useCallback((section: AppSection, loanId?: string | null) => {
    const target = loanId ? `#app/${section}/${loanId}` : `#app/${section}`
    if (window.location.hash !== target) {
      window.history.replaceState(null, '', target)
    }
  }, [])

  const actions = useMemo<StoreActions>(() => {
    const marketPriceOf = (asset: string) => {
      const q = stateRef.current.market.find((m) => m.asset === asset)
      return q?.marketPrice ?? 0
    }

    return {
      openApp(section = 'overview') {
        writeHash(section)
        dispatch({ type: 'NAV', view: 'app', section })
      },

      goLanding() {
        window.history.replaceState(null, '', window.location.pathname)
        dispatch({ type: 'NAV', view: 'landing' })
      },

      nav(section, loanId = null) {
        writeHash(section, loanId)
        dispatch({ type: 'NAV', view: 'app', section, loanId })
      },

      toast(title, body, tone = 'neutral') {
        dispatch({ type: 'TOAST', title, body, tone })
      },

      dismissToast(id) {
        dispatch({ type: 'DISMISS_TOAST', id })
      },

      async takeOffer(offerId) {
        const s = stateRef.current
        const offer = s.offers.find((o) => o.id === offerId)
        if (!offer || offer.status !== 'ACTIVE') return undefined
        const { loan } = await svc.takeOffer(offer, s.wallet.address, sessionElapsed(), s.loans)
        dispatch({ type: 'OFFER_TAKEN', offerId, loan })
        return loan
      },

      async createOffer(draft) {
        const s = stateRef.current
        const offer = await svc.createOffer(draft, sessionElapsed(), s.offers)
        dispatch({ type: 'OFFER_CREATED', offer })
        // simulated borrower: someone eventually takes a freshly listed offer
        window.setTimeout(() => {
          const cur = stateRef.current
          const fresh = cur.offers.find((o) => o.id === offer.id)
          if (fresh && fresh.status === 'ACTIVE') {
            svc.takeOffer(fresh, svc.simulatedTaker(), sessionElapsed(), cur.loans).then(
              ({ loan }) => dispatch({ type: 'OFFER_TAKEN', offerId: offer.id, loan }),
            )
          }
        }, SIMULATED_TAKER_DELAY_MS)
        return offer
      },

      async cancelOffer(offerId) {
        await svc.cancelOffer(offerId)
        dispatch({ type: 'OFFER_CANCELLED', offerId })
      },

      async buyAndReturn(loanId) {
        const s = stateRef.current
        const loan = s.loans.find((l) => l.id === loanId)
        if (!loan || loan.status !== 'ACTIVE') return undefined
        const coverCostUsd = loan.returnRequirement * marketPriceOf(loan.asset)
        const receipt = await svc.returnLoan(loan, sessionElapsed(), coverCostUsd, s.receipts)
        dispatch({ type: 'LOAN_RETURNED', loanId, receipt, coverCostUsd })
        return receipt
      },

      async claimCollateral(loanId) {
        const s = stateRef.current
        const loan = s.loans.find((l) => l.id === loanId)
        if (!loan || loan.status !== 'CLAIMABLE') return undefined
        const receipt = await svc.claimLoan(loan, sessionElapsed(), s.receipts)
        dispatch({ type: 'LOAN_CLAIMED', loanId, receipt })
        return receipt
      },
    }
  }, [writeHash])

  const value = useMemo(() => ({ state, actions }), [state, actions])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <LocateProvider>')
  return ctx
}

/* ------------------------------------------------------------------ */
/* Selectors                                                          */
/* ------------------------------------------------------------------ */

export function selectActiveOffers(offers: Offer[]): Offer[] {
  return offers.filter((o) => o.status === 'ACTIVE')
}

export function selectShortSupply(offers: Offer[]): number {
  return selectActiveOffers(offers)
    .filter((o) => o.asset === 'OPENAI')
    .reduce((sum, o) => sum + o.amount, 0)
}

export function selectLoanById(loans: Loan[], id: string | null): Loan | undefined {
  return id ? loans.find((l) => l.id === id) : undefined
}
