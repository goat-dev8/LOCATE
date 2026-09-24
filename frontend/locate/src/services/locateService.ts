/**
 * LOCATE service layer — the single seam between the UI and a future backend.
 *
 * Today every call resolves against local preview state (src/data/seed.ts).
 * Tomorrow the same functions map 1:1 onto HTTP:
 *
 *   fetchMarket()              → GET  /v1/market
 *   fetchWallet()              → GET  /v1/wallet
 *   listOffers()               → GET  /v1/offers
 *   listLoans()                → GET  /v1/loans
 *   listReceipts()             → GET  /v1/verify
 *   createOffer(draft)         → POST /v1/offers
 *   cancelOffer(id)            → POST /v1/offers/{id}/cancel
 *   takeOffer(offer, at)       → POST /v1/loans
 *   returnLoan(loan, cover)    → POST /v1/loans/{id}/return
 *   claimLoan(loan)            → POST /v1/loans/{id}/claim
 *   pollExternalListing(id)    → GET  /v1/offers/{id}   (simulated lender arrival)
 *
 * The UI never imports seed data directly — only these services.
 */
import type { Loan, MarketQuote, Offer, OfferDraft, Receipt, WalletState } from '../types'
import {
  BORROWER_A,
  GRACE_HOURS,
  externalArrival1,
  externalArrival2,
  seedLoans,
  seedMarket,
  seedOffers,
  seedReceipts,
  seedWallet,
} from '../data/seed'
import { fmtToken, fmtUsd } from '../lib/session'

/** Simulated network latency so loading states are honest. */
const delay = (ms = 140) => new Promise<void>((r) => setTimeout(r, ms))

const nextId = (items: { id: string }[], prefix: string) => {
  const max = items.reduce((m, it) => {
    const n = parseInt(it.id.replace(/\D+/g, ''), 10)
    return Number.isFinite(n) ? Math.max(m, n) : m
  }, 1000)
  return `${prefix}-${max + 1}`
}

export async function fetchMarket(): Promise<MarketQuote[]> {
  await delay()
  return seedMarket
}

export async function fetchWallet(): Promise<WalletState> {
  await delay()
  return { ...seedWallet }
}

export async function listOffers(): Promise<Offer[]> {
  await delay()
  return seedOffers.map((o) => ({ ...o }))
}

export async function listLoans(): Promise<Loan[]> {
  await delay()
  return seedLoans.map((l) => ({ ...l }))
}

export async function listReceipts(): Promise<Receipt[]> {
  await delay()
  return seedReceipts.map((r) => ({ ...r }))
}

/** A lender arrives and lists inventory — short supply goes 0.0000 → borrowable. */
export async function pollExternalListing(id: string, atOffset: number): Promise<Offer> {
  await delay(80)
  return id === 'O-1039' ? externalArrival1(atOffset) : externalArrival2(atOffset)
}

export async function createOffer(
  draft: OfferDraft,
  atOffset: number,
  existing: Offer[],
): Promise<Offer> {
  await delay(420)
  return {
    id: nextId(existing, 'O'),
    asset: draft.asset,
    amount: draft.amount,
    collateralUsdc: draft.collateralUsdc,
    feeUsdc: draft.feeUsdc,
    termDays: draft.termDays,
    expiryHours: draft.expiryHours,
    isYours: true,
    lenderAddr: seedWallet.address,
    status: 'ACTIVE',
    listedAtOffset: atOffset,
  }
}

export async function cancelOffer(_offerId: string): Promise<void> {
  await delay(320)
}

/**
 * Borrower posts USDC collateral + fee and receives the token.
 * Settlement never depends on price — only on time and delivery.
 */
export async function takeOffer(
  offer: Offer,
  borrowerAddr: string,
  atOffset: number,
  existingLoans: Loan[],
): Promise<{ loan: Loan }> {
  await delay(520)
  const loan: Loan = {
    id: nextId(existingLoans, 'L'),
    offerId: offer.id,
    asset: offer.asset,
    amount: offer.amount,
    direction: offer.isYours ? 'LENT' : 'BORROWED',
    collateralUsdc: offer.collateralUsdc,
    feeUsdc: offer.feeUsdc,
    termDays: offer.termDays,
    graceHours: GRACE_HOURS,
    borrowerAddr: offer.isYours ? borrowerAddr : seedWallet.address,
    lenderAddr: offer.lenderAddr,
    status: 'ACTIVE',
    returnRequirement: offer.amount,
    borrowedAtOffset: atOffset,
  }
  return { loan }
}

/** Borrower buys back and returns the required net amount. */
export async function returnLoan(
  loan: Loan,
  atOffset: number,
  coverCostUsd: number,
  existingReceipts: Receipt[],
): Promise<Receipt> {
  await delay(860)
  const receiptId = nextId(existingReceipts, 'R')
  return {
    id: receiptId,
    loanId: loan.id,
    offerId: loan.offerId,
    asset: loan.asset,
    kind: 'RETURN',
    status: 'VERIFIED',
    isYours: true,
    counterpartyAddr: loan.direction === 'BORROWED' ? loan.lenderAddr : loan.borrowerAddr,
    direction: loan.direction,
    lines: [
      { label: 'OFFER', value: loan.offerId },
      { label: 'LOAN', value: loan.id },
      { label: 'TOKEN DELIVERED', value: `${fmtToken(loan.amount)} ${loan.asset}` },
      { label: 'TOKEN RETURNED', value: `${fmtToken(loan.returnRequirement)} ${loan.asset}`, tone: 'lime' },
      { label: 'NET REQUIREMENT', value: `${fmtToken(loan.returnRequirement)} — MET` },
      { label: 'COVER COST', value: `${fmtUsd(coverCostUsd)} (OPEN MARKET)` },
      { label: 'UPFRONT FEE', value: `${fmtUsd(loan.feeUsdc)} → LENDER` },
      { label: 'COLLATERAL', value: `${fmtUsd(loan.collateralUsdc)} USDC → BORROWER`, tone: 'lime' },
    ],
    tsOffset: atOffset,
    sig: `sim-${receiptId.toLowerCase()}-e5c2·preview`,
  }
}

/** Lender claims USDC collateral after maturity + grace passed without return. */
export async function claimLoan(
  loan: Loan,
  atOffset: number,
  existingReceipts: Receipt[],
): Promise<Receipt> {
  await delay(640)
  const receiptId = nextId(existingReceipts, 'R')
  return {
    id: receiptId,
    loanId: loan.id,
    offerId: loan.offerId,
    asset: loan.asset,
    kind: 'CLAIM',
    status: 'CLAIMED',
    isYours: true,
    counterpartyAddr: loan.borrowerAddr,
    direction: loan.direction,
    lines: [
      { label: 'OFFER', value: loan.offerId },
      { label: 'LOAN', value: loan.id },
      { label: 'TOKEN DELIVERED', value: `${fmtToken(loan.amount)} ${loan.asset}` },
      { label: 'TOKEN RETURNED', value: '0.000000 OPENAI', tone: 'red' },
      { label: 'MATURITY + GRACE', value: 'ELAPSED — NO RETURN', tone: 'red' },
      { label: 'COLLATERAL', value: `${fmtUsd(loan.collateralUsdc)} USDC → LENDER`, tone: 'lime' },
    ],
    tsOffset: atOffset,
    sig: `sim-${receiptId.toLowerCase()}-9a4f·preview`,
  }
}

/** Simulated borrower that takes the session wallet's newly listed offer. */
export function simulatedTaker(): string {
  return BORROWER_A
}
