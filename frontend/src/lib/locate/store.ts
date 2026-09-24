"use client";

/**
 * LOCATE — workspace state. Offers and loans start empty and are filled from the live API.
 */

import { create } from "zustand";
import { ASSETS } from "./seed";
import type {
  Asset,
  CreateOfferInput,
  Loan,
  Offer,
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

  offers: Offer[];
  loans: Loan[];

  toast: ToastPayload | null;

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

  pushToast: (title: string, body?: string, tone?: ToastTone) => void;
  dismissToast: () => void;
  setOffers: (offers: Offer[]) => void;
  setLoans: (loans: Loan[]) => void;
}

let toastSeq = 1;

function createLocateStore() {
  return create<LocateState>((set, get) => ({
    mode: "landing",
    view: "overview",
    activeLoanId: null,

    offers: [],
    loans: [],

    toast: null,

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

    pushToast: (title, body, tone = "ink") => {
      set({ toast: { id: toastSeq++, title, body, tone } });
    },
    dismissToast: () => set({ toast: null }),
    setOffers: (offers) => set({ offers }),
    setLoans: (loans) => set({ loans }),
  }));
}

const globalForLocate = globalThis as typeof globalThis & {
  __locateZustand?: ReturnType<typeof createLocateStore>;
};

export const useLocate =
  globalForLocate.__locateZustand ?? (globalForLocate.__locateZustand = createLocateStore());

export const locateAsset = (id: string) => ASSETS.find((a) => a.id === id) ?? {
  id,
  symbol: id,
  name: id,
  logo: "",
  refPrice: null,
  marketPrice: null,
  transferFeeBps: 100,
  standard: "TOKEN-2022" as const,
  blurb: "",
};
export const locateEpoch = 0;
