/**
 * LOCATE — domain types.
 *
 * The entire data layer is shaped so a future real backend
 * (GET /v1/offers, /v1/loans, /v1/activity, /v1/verify) can replace the
 * preview services without touching the UI.
 *
 * All timestamps are OFFSETS IN SECONDS relative to session start,
 * which keeps rendering deterministic (see src/lib/session.ts).
 */

export type AssetSymbol = 'OPENAI' | 'SPACEX'

export type TermDays = 7 | 14 | 30

/** Published market context for a PreStock. Advisory only — never drives settlement. */
export interface MarketQuote {
  asset: AssetSymbol
  displayName: string
  /** PreStocks published reference price, USD */
  referencePrice: number
  /** Observable DEX price, USD */
  marketPrice: number
  /** (market - reference) / reference, percent */
  premiumPct: number
  note?: string
}

export type OfferStatus = 'ACTIVE' | 'TAKEN' | 'CANCELLED' | 'SETTLED'

/** A lender's listed borrowable inventory. */
export interface Offer {
  id: string
  asset: AssetSymbol
  /** token amount listed */
  amount: number
  /** USDC collateral the borrower must post */
  collateralUsdc: number
  /** upfront fee paid to the lender, USDC */
  feeUsdc: number
  termDays: TermDays
  /** listing lifetime before the offer expires */
  expiryHours: number
  /** true when the offer belongs to the session wallet */
  isYours: boolean
  lenderAddr: string
  status: OfferStatus
  /** seconds before (negative) or after (positive) session start */
  listedAtOffset: number
  takenAtOffset?: number
  takenByAddr?: string
}

export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'CLAIMABLE' | 'CLAIMED'

/** Loan direction relative to the session wallet. */
export type LoanDirection = 'BORROWED' | 'LENT'

/** An active or settled borrow against an offer. */
export interface Loan {
  id: string
  offerId: string
  asset: AssetSymbol
  amount: number
  direction: LoanDirection
  collateralUsdc: number
  feeUsdc: number
  termDays: TermDays
  graceHours: number
  borrowerAddr: string
  lenderAddr: string
  status: LoanStatus
  /** net token amount that must be delivered back */
  returnRequirement: number
  borrowedAtOffset: number
  settledAtOffset?: number
}

export type ReceiptStatus = 'VERIFIED' | 'REFUSED' | 'CLAIMED'

export type ReceiptKind = 'RETURN' | 'CLAIM'

export interface ReceiptLine {
  label: string
  value: string
  /** optional emphasis tone for the value */
  tone?: 'ink' | 'lime' | 'amber' | 'red'
}

/** Settlement proof record rendered in the Verify room. */
export interface Receipt {
  id: string
  loanId: string
  offerId: string
  asset: AssetSymbol
  kind: ReceiptKind
  status: ReceiptStatus
  /** machine-readable refusal code, when status = REFUSED */
  reasonCode?: string
  /** human explanation of a refusal */
  reason?: string
  /** true when the receipt belongs to the session wallet */
  isYours: boolean
  counterpartyAddr: string
  direction: LoanDirection
  lines: ReceiptLine[]
  tsOffset: number
  /** clearly-simulated identifier — never presented as an on-chain proof */
  sig: string
}

/** Session wallet (preview — no real wallet is ever connected). */
export interface WalletState {
  label: string
  address: string
  sol: number
  usdc: number
  openai: number
}

export type ToastTone = 'neutral' | 'positive' | 'warn'

export interface ToastItem {
  id: number
  title: string
  body?: string
  tone: ToastTone
}

/** Draft for creating a new offer from the app. */
export interface OfferDraft {
  asset: AssetSymbol
  amount: number
  collateralUsdc: number
  feeUsdc: number
  termDays: TermDays
  expiryHours: number
}

/** Top-level navigation. The whole product is one workspace. */
export type View = 'landing' | 'app'

export type AppSection =
  | 'overview'
  | 'book'
  | 'create'
  | 'loan'
  | 'offers'
  | 'loans'
  | 'verify'

export interface AppState {
  booted: boolean
  view: View
  section: AppSection
  selectedLoanId: string | null
  market: MarketQuote[]
  wallet: WalletState
  offers: Offer[]
  loans: Loan[]
  receipts: Receipt[]
  toasts: ToastItem[]
  /** offer ids already delivered by the simulated market — scheduler idempotency */
  arrivedOfferIds: string[]
}

/** Actions accepted by the store reducer. */
export type Action =
  | { type: 'BOOT'; market: MarketQuote[]; wallet: WalletState; offers: Offer[]; loans: Loan[]; receipts: Receipt[] }
  | { type: 'NAV'; view: View; section?: AppSection; loanId?: string | null }
  | { type: 'OFFER_ARRIVED'; offer: Offer }
  | { type: 'OFFER_CREATED'; offer: Offer }
  | { type: 'OFFER_CANCELLED'; offerId: string }
  | { type: 'OFFER_TAKEN'; offerId: string; loan: Loan }
  | { type: 'LOAN_RETURNED'; loanId: string; receipt: Receipt; coverCostUsd: number }
  | { type: 'LOAN_CLAIMED'; loanId: string; receipt: Receipt }
  | { type: 'TOAST'; title: string; body?: string; tone?: ToastTone }
  | { type: 'DISMISS_TOAST'; id: number }
