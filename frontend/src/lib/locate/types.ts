/**
 * LOCATE — domain types.
 * Frontend preview build: all data is illustrative sample state.
 * The service seam mirrors a future REST surface (GET /v1/offers, etc.).
 */

export type AssetId =
  | "OPENAI"
  | "SPACEX"
  | "XAI"
  | "ANTHROPIC"
  | "NEURALINK"
  | "ANDURIL"
  | "FIGUREAI"
  | "POLYMARKET"
  | "KALSHI";

export interface Asset {
  id: AssetId;
  symbol: string;
  name: string;
  /** Brand mark (public/logos) */
  logo: string;
  /** Reference price — illustrative sample market state */
  refPrice: number;
  /** Current market price — illustrative sample market state */
  marketPrice: number;
  /** Token-2022 transfer fee, basis points */
  transferFeeBps: number;
  standard: "TOKEN-2022";
  blurb: string;
}

export type OfferStatus = "ACTIVE" | "TAKEN" | "CANCELLED" | "SETTLED";
export type LoanStatus = "ACTIVE" | "RETURNED" | "CLAIMABLE" | "CLAIMED";
export type ReceiptStatus = "VERIFIED" | "REFUSED" | "CLAIMED";

export interface Offer {
  id: string;
  assetId: AssetId;
  /** Amount the lender makes borrowable (gross from lender side) */
  amount: number;
  /** USDC collateral locked by the borrower */
  collateralUsdc: number;
  /** Upfront fee paid by the borrower to the lender */
  feeUsdc: number;
  termDays: number;
  /** Offer listing expiry */
  expiryAt: number;
  lender: string;
  isYours: boolean;
  status: OfferStatus;
  createdAt: number;
  mint?: string;
  nonce?: string;
  amountRaw?: string;
  collateralRaw?: string;
  feeRaw?: string;
  termSecs?: string;
  graceSecs?: string;
  expiresAtSec?: string;
}

export interface Loan {
  id: string;
  offerId: string;
  assetId: AssetId;
  direction: "BORROWED" | "LENT";
  /** Gross amount that left the lender */
  amount: number;
  /** Net tokens that must arrive back at the lender */
  netRequired: number;
  collateralUsdc: number;
  feeUsdc: number;
  startedAt: number;
  maturityAt: number;
  /** Grace window after maturity before the lender can claim */
  graceHours: number;
  status: LoanStatus;
  offerPubkey?: string;
  mint?: string;
  amountRaw?: string;
  collateralRaw?: string;
  feeRaw?: string;
  lenderPubkey?: string;
  borrowerPubkey?: string;
  feeBps?: number;
}

export interface ReceiptLine {
  label: string;
  value: string;
}

export interface Receipt {
  id: string;
  loanId: string;
  assetId: AssetId;
  status: ReceiptStatus;
  /** Machine-readable outcome code */
  code: string;
  reason?: string;
  lines: ReceiptLine[];
  /** Simulated signature — obviously non-production placeholder */
  sig: string;
  at: number;
  yours: boolean;
}

export interface CreateOfferInput {
  assetId: AssetId;
  amount: number;
  collateralUsdc: number;
  feeUsdc: number;
  termDays: number;
  expiryHours: number;
}

export type ToastTone = "ink" | "lime" | "ember" | "refuse";

export interface ToastPayload {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
}
