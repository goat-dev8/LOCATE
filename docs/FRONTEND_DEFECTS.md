# Frontend defects

The delivered `FRONTEND/` was checked read-only on 2026-09-24. LOCATE did not edit it. `node sdk/tools/check-frontend.mjs FRONTEND` exits 1.

The app state is a local simulation. `FRONTEND/src/lib/locate/store.ts` lines 3–6 say the store is preview state. Line 96 sets a USDC balance of 250. Line 97 sets token balances, including SPACEX. Lines 99–101 load `seedOffers()`, `seedLoans()`, and `seedReceipts()` from `FRONTEND/src/lib/locate/seed.ts`. That seed includes a SPACEX offer at line 245. None of those numbers come from the API or the chain.

`takeOffer`, `createOffer`, `cancelOffer`, `buyAndReturn`, and `claimCollateral` in `store.ts` change that local store. They do not call `@locate/sdk` builders or the live API.

The four public variables are absent: `VITE_API_BASE_URL`, `VITE_SOLANA_CLUSTER`, `VITE_SOLANA_RPC_URL`, and `VITE_LOCATE_PROGRAM_ID`. No source file reads them.

The checker also flags `setTimeout` and `Math.random` in animation and toast code (`ClickSpark.tsx`, `DecryptionText.tsx`, `sidebar.tsx`, `use-toast.ts`, `Footer.tsx`, `LocateRoot.tsx`, `hooks.ts`). Those are not market numbers. The protocol replacements above are the blockers.

There is no devnet banner string in the checked sources, and there is no `FRONTEND/dist` yet, so the bundle secret scan and the banner check have not run.
