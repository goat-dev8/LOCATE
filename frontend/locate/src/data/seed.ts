/**
 * LOCATE preview state.
 *
 * Realistic illustrative data for the frontend simulation. The whole module is
 * shaped exactly like the payloads a future real backend would return, so the
 * services layer can be swapped without touching the UI.
 *
 * Timestamps are second offsets relative to session start (negative = past).
 */
import type { Loan, MarketQuote, Offer, Receipt, WalletState } from '../types'

/** Session wallet address (preview — never a real keypair). */
export const YOU = '7fKd9cE4VaLt2Qx9'
export const LENDER_A = '4fDe8sJ2pRwM9a2B'
export const LENDER_B = '8c1EoQ5nTbY44Bd'
export const BORROWER_A = '3cAe6hK9mXzF8f1D'
export const BORROWER_B = '5d9BvN3qLsT7cC2a'
export const BORROWER_C = '9a2FrH6wGkPd61cD'

const DAY = 86_400

export const seedMarket: MarketQuote[] = [
  {
    asset: 'OPENAI',
    displayName: 'OPENAI PreStock',
    referencePrice: 1026,
    marketPrice: 1337,
    premiumPct: 30.3,
    note: 'Sample market state — illustrative',
  },
  {
    asset: 'SPACEX',
    displayName: 'SPACEX PreStock',
    referencePrice: 184.5,
    marketPrice: 191.2,
    premiumPct: 3.6,
    note: 'No borrowable supply listed',
  },
]

export const seedWallet: WalletState = {
  label: 'PREVIEW SESSION',
  address: YOU,
  sol: 2.4183,
  usdc: 250.0,
  openai: 0.005,
}

/**
 * Offers visible at boot.
 * The public book starts EMPTY on purpose — short supply for OPENAI begins at
 * 0.000000, then lenders arrive (see externalArrivals below).
 * These entries are the session wallet's own history.
 */
export const seedOffers: Offer[] = [
  {
    id: 'O-1032',
    asset: 'OPENAI',
    amount: 0.003,
    collateralUsdc: 9.0,
    feeUsdc: 0.25,
    termDays: 7,
    expiryHours: 48,
    isYours: true,
    lenderAddr: YOU,
    status: 'CANCELLED',
    listedAtOffset: -(5.8 * DAY),
  },
  {
    id: 'O-1034',
    asset: 'OPENAI',
    amount: 0.004,
    collateralUsdc: 10.5,
    feeUsdc: 0.3,
    termDays: 7,
    expiryHours: 48,
    isYours: true,
    lenderAddr: YOU,
    status: 'TAKEN',
    listedAtOffset: -(8.8 * DAY),
    takenAtOffset: -(8.5 * DAY),
    takenByAddr: BORROWER_B,
  },
  {
    id: 'O-1036',
    asset: 'OPENAI',
    amount: 0.004,
    collateralUsdc: 10.0,
    feeUsdc: 0.28,
    termDays: 7,
    expiryHours: 48,
    isYours: true,
    lenderAddr: YOU,
    status: 'SETTLED',
    listedAtOffset: -(5.6 * DAY),
    takenAtOffset: -(5 * DAY),
    takenByAddr: BORROWER_C,
  },
  {
    // external offer the session wallet previously borrowed against (settled)
    id: 'O-1037',
    asset: 'OPENAI',
    amount: 0.005,
    collateralUsdc: 12.5,
    feeUsdc: 0.35,
    termDays: 7,
    expiryHours: 48,
    isYours: false,
    lenderAddr: LENDER_A,
    status: 'SETTLED',
    listedAtOffset: -(5.1 * DAY),
    takenAtOffset: -(5 * DAY),
    takenByAddr: YOU,
  },
]

export const seedLoans: Loan[] = [
  {
    // you lent 0.004 OPENAI; borrower never returned it — claim window is open
    id: 'L-1035',
    offerId: 'O-1034',
    asset: 'OPENAI',
    amount: 0.004,
    direction: 'LENT',
    collateralUsdc: 10.5,
    feeUsdc: 0.3,
    termDays: 7,
    graceHours: 24,
    borrowerAddr: BORROWER_B,
    lenderAddr: YOU,
    status: 'CLAIMABLE',
    returnRequirement: 0.004,
    borrowedAtOffset: -(8.5 * DAY),
  },
  {
    // you lent 0.004 OPENAI; token returned, fee kept
    id: 'L-1037',
    offerId: 'O-1036',
    asset: 'OPENAI',
    amount: 0.004,
    direction: 'LENT',
    collateralUsdc: 10.0,
    feeUsdc: 0.28,
    termDays: 7,
    graceHours: 24,
    borrowerAddr: BORROWER_C,
    lenderAddr: YOU,
    status: 'RETURNED',
    returnRequirement: 0.004,
    borrowedAtOffset: -(5 * DAY),
    settledAtOffset: -(2 * DAY),
  },
  {
    // you borrowed 0.005 OPENAI against USDC; returned, collateral released
    id: 'L-1038',
    offerId: 'O-1037',
    asset: 'OPENAI',
    amount: 0.005,
    direction: 'BORROWED',
    collateralUsdc: 12.5,
    feeUsdc: 0.35,
    termDays: 7,
    graceHours: 24,
    borrowerAddr: YOU,
    lenderAddr: LENDER_A,
    status: 'RETURNED',
    returnRequirement: 0.005,
    borrowedAtOffset: -(5 * DAY),
    settledAtOffset: -(2 * DAY),
  },
]

export const seedReceipts: Receipt[] = [
  {
    id: 'R-1038',
    loanId: 'L-1038',
    offerId: 'O-1037',
    asset: 'OPENAI',
    kind: 'RETURN',
    status: 'VERIFIED',
    isYours: true,
    counterpartyAddr: LENDER_A,
    direction: 'BORROWED',
    lines: [
      { label: 'OFFER', value: 'O-1037' },
      { label: 'LOAN', value: 'L-1038' },
      { label: 'TOKEN DELIVERED', value: '0.005000 OPENAI' },
      { label: 'TOKEN RETURNED', value: '0.005000 OPENAI', tone: 'lime' },
      { label: 'NET REQUIREMENT', value: '0.005000 — MET' },
      { label: 'UPFRONT FEE', value: '$0.35 → LENDER' },
      { label: 'COLLATERAL', value: '$12.50 USDC → BORROWER', tone: 'lime' },
    ],
    tsOffset: -(2 * DAY),
    sig: 'sim-r1038-4e91·preview',
  },
  {
    id: 'R-1037',
    loanId: 'L-1037',
    offerId: 'O-1036',
    asset: 'OPENAI',
    kind: 'RETURN',
    status: 'VERIFIED',
    isYours: true,
    counterpartyAddr: BORROWER_C,
    direction: 'LENT',
    lines: [
      { label: 'OFFER', value: 'O-1036' },
      { label: 'LOAN', value: 'L-1037' },
      { label: 'TOKEN DELIVERED', value: '0.004000 OPENAI' },
      { label: 'TOKEN RETURNED', value: '0.004000 OPENAI', tone: 'lime' },
      { label: 'NET REQUIREMENT', value: '0.004000 — MET' },
      { label: 'UPFRONT FEE', value: '$0.28 → LENDER (KEPT)', tone: 'lime' },
      { label: 'COLLATERAL', value: '$10.00 USDC → BORROWER' },
    ],
    tsOffset: -(2 * DAY),
    sig: 'sim-r1037-b208·preview',
  },
  {
    // third-party refusal — shows the refusal path with a real reason
    id: 'R-1029',
    loanId: 'L-1029',
    offerId: 'O-1026',
    asset: 'OPENAI',
    kind: 'RETURN',
    status: 'REFUSED',
    reasonCode: 'RETURN_REFUSED_SHORT_DELIVERY',
    reason: 'Returned amount did not satisfy the original net token requirement.',
    isYours: false,
    counterpartyAddr: LENDER_B,
    direction: 'BORROWED',
    lines: [
      { label: 'OFFER', value: 'O-1026' },
      { label: 'LOAN', value: 'L-1029' },
      { label: 'TOKEN DELIVERED', value: '0.005000 OPENAI' },
      { label: 'TOKEN RETURNED', value: '0.004940 OPENAI', tone: 'red' },
      { label: 'NET REQUIREMENT', value: '0.005000 — NOT MET', tone: 'red' },
      { label: 'COLLATERAL', value: '$12.50 USDC → LENDER (HELD)', tone: 'red' },
    ],
    tsOffset: -(1.5 * DAY),
    sig: 'sim-r1029-77d3·preview',
  },
]

/**
 * External lenders that arrive after the session starts, turning
 * 0.000000 short supply into borrowable inventory.
 */
export function externalArrival1(atOffset: number): Offer {
  return {
    id: 'O-1039',
    asset: 'OPENAI',
    amount: 0.005,
    collateralUsdc: 12.5,
    feeUsdc: 0.35,
    termDays: 7,
    expiryHours: 48,
    isYours: false,
    lenderAddr: LENDER_A,
    status: 'ACTIVE',
    listedAtOffset: atOffset,
  }
}

export function externalArrival2(atOffset: number): Offer {
  return {
    id: 'O-1040',
    asset: 'OPENAI',
    amount: 0.01,
    collateralUsdc: 27.0,
    feeUsdc: 0.6,
    termDays: 14,
    expiryHours: 24,
    isYours: false,
    lenderAddr: LENDER_B,
    status: 'ACTIVE',
    listedAtOffset: atOffset,
  }
}

/** Simulated borrower that eventually takes a newly created offer. */
export const SIMULATED_TAKER = BORROWER_A
export const SIMULATED_TAKER_DELAY_MS = 32_000

export const GRACE_HOURS = 24
