"use client";

/**
 * LOCATE — workspace state. Offers, loans, and receipts start empty and are filled from the live API.
 */

import { create } from "zustand";
import {
  ASSETS,
  seedLoans,
  seedOffers,
  seedReceipts,
} from "./seed";
import type {
  Asset,
  CreateOfferInput,
  Loan,
  Offer,
  Receipt,
  ToastPayload,
  ToastTone,
} from "./types";

export type View =
  | "overview"
  | "book"
  | "create"
  | "loan"
  | "offers"
  | "loans"
  | "verify";

export type Mode = "landing" | "app";

interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

interface LocateState {
  mode: Mode;
  view: View;
  activeLoanId: string | null;

  usdcBalance: number;
  tokenBalances: Record<string, number>;

  offers: Offer[];
  loans: Loan[];
  receipts: Receipt[];

  toast: ToastPayload | null;
  /** one-shot simulation guards */
  arrivalsStarted: boolean;

  openApp: () => void;
  goLanding: () => void;
  navigate: (view: View, loanId?: string) => void;

  assetById: (id: string) => Asset | undefined;
  offerById: (id: string) => Offer | undefined;
  loanById: (id: string) => Loan | undefined;

  takeOffer: (offerId: string) => ActionResult;
  createOffer: (input: CreateOfferInput) => ActionResult;
  cancelOffer: (offerId: string) => ActionResult;
  buyAndReturn: (loanId: string) => ActionResult;
  claimCollateral: (loanId: string) => ActionResult;

  ensureArrivals: () => void;
  pushToast: (title: string, body?: string, tone?: ToastTone) => void;
  dismissToast: () => void;
  setOffers: (offers: Offer[]) => void;
  setLoans: (loans: Loan[]) => void;
}

let toastSeq = 1;

export const useLocate = create<LocateState>((set, get) => ({
  mode: "landing",
  view: "overview",
  activeLoanId: null,

  usdcBalance: 0,
  tokenBalances: {},

  offers: seedOffers(),
  loans: seedLoans(),
  receipts: seedReceipts(),

  toast: null,
  arrivalsStarted: false,

  openApp: () => set({ mode: "app", view: "overview", activeLoanId: null }),
  goLanding: () => set({ mode: "landing" }),
  navigate: (view, loanId) => set({ view, activeLoanId: loanId ?? null }),

  assetById: (id) => ASSETS.find((a) => a.id === id),
  offerById: (id) => get().offers.find((o) => o.id === id),
  loanById: (id) => get().loans.find((l) => l.id === id),

  takeOffer: () => ({ ok: false, error: "Connect a Devnet wallet. Take is a real transaction, not a local balance change." }),
  createOffer: () => ({ ok: false, error: "Connect a Devnet wallet. Listing requires a real Token-2022 approval." }),
  cancelOffer: () => ({ ok: false, error: "Connect a Devnet wallet. Cancel is a real transaction." }),
  buyAndReturn: () => ({ ok: false, error: "Connect a Devnet wallet. Return is a real transaction." }),
  claimCollateral: () => ({ ok: false, error: "Connect a Devnet wallet. Claim is a real transaction after maturity." }),
  ensureArrivals: () => set({ arrivalsStarted: true }),

  pushToast: (title, body, tone = "ink") => {
    set({ toast: { id: toastSeq++, title, body, tone } });
  },
  dismissToast: () => set({ toast: null }),
  setOffers: (offers) => set({ offers }),
  setLoans: (loans) => set({ loans }),
}));

export const locateAsset = (id: string) => ASSETS.find((a) => a.id === id);
export const locateEpoch = 0;
