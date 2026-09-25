/**
 * LOCATE — domain types. Live values come from the API, SDK, wallet, or RPC.
 */

export type AssetId = string;

export interface Asset {
  id: AssetId;
  symbol: string;
  name: string;
  logo: string;
  refPrice: number | null;
  marketPrice: number | null;
  transferFeeBps: number;
  standard: "TOKEN-2022";
  blurb: string;
}

export type OfferStatus = "ACTIVE" | "TAKEN" | "CANCELLED" | "SETTLED";
export type LoanStatus = "ACTIVE" | "RETURNED" | "CLAIMABLE" | "CLAIMED";
export type ReceiptStatus = "VERIFIED" | "PENDING" | "REFUSED" | "CLAIMED";

export interface Offer {
  id: string;
  assetId: AssetId;
  amount: number;
  collateralUsdc: number;
  feeUsdc: number;
  termDays: number;
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
  amount: number;
  netRequired: number;
  collateralUsdc: number;
  feeUsdc: number;
  startedAt: number;
  maturityAt: number;
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
  termsKnown?: boolean;
  feeKnown?: boolean;
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
  code: string;
  reason?: string;
  lines: ReceiptLine[];
  sig: string;
  at: number;
  yours: boolean;
  browserVerified?: boolean;
}

export interface CreateOfferInput {
  assetId: AssetId;
  amount: number;
  collateralUsdc: number;
  feeUsdc: number;
  termDays: number;
  expiryHours: number;
  termSecs?: number;
  graceSecs?: number;
}

export type ToastTone = "ink" | "lime" | "ember" | "refuse";

export interface ToastPayload {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
}
