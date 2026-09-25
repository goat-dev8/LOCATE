# LOCATE history

Append-only. Times are UTC.

## 2026-09-24T01:10:00Z — Phases 0–3 program scaffold

- Phase 0 technical baseline: `.env` is gitignored. Hackathon submission work was skipped by owner override.
- Program id `F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6`. The keypair lives only in WSL `~/.config/solana/locate/program.json` (mode 600), not in git.
- Deployer wallet will be the owner-supplied address `Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC`. The recovery phrase is not stored in the repo.
- Implemented the five instructions, Offer (202 bytes) and Loan (253 bytes), events via `emit_cpi!`, and Token-2022 fee helpers.
- `cargo test -p locate --lib --features mainnet`: 5 passed (fee identity, 100 bps edges, uncapped 100% fails closed, max-fee cap, pending-fee boundaries).
- `anchor build` produced `locate.so` of 342712 bytes. That is above the 320 KB planning estimate. It is the measured size, not a failure.
- Take accounts are `Box`ed so the SBF stack frame stays inside the 4096-byte limit.
- Anchor 1.2 `CpiContext::new` takes a program id, not an `AccountInfo`. Account structs live in the crate root so the generated client modules resolve.
- Not yet done: LiteSVM suite, fork tests, devnet deploy, SDK, backend.

PHASE 1 COMPLETE (scaffold and build)

Implementation: PASS
Tests: PASS (host unit tests; LiteSVM starts in phase 4)
Security: N/A
Evidence: PASS (this entry; `.so` size recorded)
Research: PASS (Anchor 1.2 CPI and `event_cpi` source)
Fresh rerun: PASS (`cargo test --lib` after the boxed rebuild)
Outstanding blockers: NONE
Git SHA: pending this commit

PHASE 2 COMPLETE (state, errors, events, create/cancel, fee math)

Implementation: PASS
Tests: PASS (5 fee unit tests)
Security: N/A
Evidence: PASS
Research: PASS
Fresh rerun: PASS
Outstanding blockers: NONE
Git SHA: pending this commit

PHASE 3 COMPLETE (take, return, claim compile in the same program)

Implementation: PASS
Tests: PASS for build. Behavioral tests are phase 4.
Security: N/A until phase 5
Evidence: PASS (binary size above)
Research: PASS
Fresh rerun: PASS
Outstanding blockers: NONE
Git SHA: 807c37f932e9c7a8c87a35c04adeaf7be7b6aae9

## 2026-09-24T02:20:00Z — Phase 4 LiteSVM suite

- Dumped mainnet Token-2022 ELF to `tests/fixtures/mainnet/token2022.so` (1382016 bytes, sha256 `0999dbf708971e723b08d1caafc988826a59c6001ed6dc02260da07defbe1469`). Slot and epoch are filled in phase 6.
- LiteSVM loads that ELF plus the program `.so`. The synthetic mint has the OPENAI-like extensions. Test USDC is a classic mint at the pinned mainnet address.
- `cargo test -p locate --tests --features mainnet`: 5 lib tests, FZ-01 (10,000 cases) plus one SVM spot check, and T-01 through T-16 plus M-01. All passed. Log: `evidence/tests/cargo-test-20260924Tphase4.txt`.
- A borrower must hold extra tokens to repay, because the 1% fee means the received amount is below the gross required to deliver net N. The harness mints that top-up. It is not protocol behavior.
- Self-take against the canonical ATA fails with Anchor 2040 (duplicate mutable account) before the handler's 6006 check. The handler check remains.
- Each successful create, take, return, and claim runs `assert_invariants` (vault equals collateral while a loan is open).

PHASE 4 COMPLETE

Implementation: PASS
Tests: PASS
Security: N/A until phase 5
Evidence: PASS
Research: PASS (LiteSVM 0.16 `set_sysvar`, `expire_blockhash`, dumped Token-2022 ELF)
Fresh rerun: PASS
Outstanding blockers: NONE
Git SHA: 4d6ec56

## 2026-09-24T02:45:00Z — Phase 5 security tests

- S-01 through S-14 pass in `programs/locate/tests/security.rs`.
- Substituted mint, lender token account, loan, and vault are rejected. A fake USDC mint is rejected. Return without a loan delegation reverts and leaves the loan open.
- CPI Guard and MemoTransfer pass after the token account is reallocated, because those extensions are not on the account until then.
- Closing the lender's token account or USDC account mid-loan does not block return or claim. `init_if_needed` recreates them.
- A scheduled fee change lands at least two epochs ahead. A second take of the same offer address fails while the first loan is open, then succeeds after return.
- The permanent delegate can burn the borrower's tokens. The lender still claims the USDC collateral after the grace period.
- Canonical ATA self-take is rejected by Anchor's duplicate-account constraint (2040), which runs before error 6006.

PHASE 5 COMPLETE

Implementation: PASS
Tests: PASS
Security: PASS
Evidence: PASS (this entry; the security run was green, 14 tests)
Research: PASS (Token-2022 reallocate, CPI Guard, memo transfer, permanent delegate burn)
Fresh rerun: PASS
Outstanding blockers: NONE
Git SHA: recorded after this commit

## 2026-09-24T02:55:00Z — Phase 6 real-mint fork

- Dumped the mainnet OPENAI mint `PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF` (902 bytes, sha256 `d077e95d77a8215bef34aa6efddfd0cf66d8e183e8379de1e55c40e5dcb1d466`, slot 449882176) and mainnet USDC (82 bytes, sha256 `dfeb33764984c2136e0139d22e846cc7cf41eedbd4c4ece46dc95c8e383787f4`).
- `getEpochInfo` at the same fetch: epoch 1041, slot 449882174.
- The fork suite loads those bytes plus the dumped Token-2022 ELF. Token balances are written into the ATA after creation. The issuer did not mint them. This is not a devnet synthetic mint and not a mainnet transaction.
- F-01 through F-06 passed. At epoch 1041 the borrower receives `N - fee(N)` at 100 bps, and return leaves the lender at or above the starting balance. Epoch 1038 refuses the take because the 100 bps fee is still pending (the active fee is the older 50 bps). The parser reads `paused = false`, no hook, 100 bps at epoch 1041, and 50 bps pending at epoch 1038.
- The optional solana-test-validator clone harness was not run. LiteSVM is the fork proof.

PHASE 6 COMPLETE

Implementation: PASS
Tests: PASS
Security: PASS
Evidence: PASS
Research: PASS (live getAccountInfo and getEpochInfo)
Fresh rerun: PASS
Outstanding blockers: NONE
Git SHA: recorded after this commit

## 2026-09-24T02:26:00Z — Phase 7 devnet deploy and E2E

- Rebuilt with `--features devnet`. The program binary contains the Circle devnet USDC mint bytes and not the mainnet USDC mint. `.so` size 359712 bytes. Deployed with `--max-len` 395683.
- Program `F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6` on devnet. Deploy signature `4qwgdv1cdjnXVkgJNpE3QH8SwtHopdocvwp4dvSa42bXjNhpH9jnPusabjNEcsU3yqnf6WvkHZJi8L2d8hKkwgtP`, slot 503243469. Program data account length 395728 (max length plus the upgradeable-loader header). Upgrade authority is the deployer wallet.
- The first `solana program deploy --use-rpc` stopped with "Max retries exceeded" after creating a buffer. The resume from that buffer succeeded. The buffer seed was not stored in the repo.
- dOPENAI mint `9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P` is a devnet test mint mirroring OPENAI's extensions; not a PreStocks token. Decimals 9, transfer fee 100 bps, maximum fee u64::MAX, permanent delegate, pause, scaled UI multiplier 1.4861347, transfer hook disabled, default account state initialized, freeze and metadata enabled.
- Real signatures: create `2PgXCZhh2HiGDguNVFka1JKhjoPxyGeBoWv4acS5uNB3vMiGHnLVHjqJFf2DfcHyAczEa6tWSgcrvQEikqVstyTi`, take `5dE2AyTW8quE1hjKjJZrHjBTocmRb9HnSommsF9toyjraF27TdvtzKnKgw4K3cFmq6gkajz9Get5KhnyvcxHyq4w`, return `2of8HQPVcY2XpjJCHcs95uho9W5UuACwonPCDDdAJuWYco6JPKM9kF2q4t6NAST2nFRyeuphytcHYY2hxH5hXEP7`, claim `653KdWNMynZzpronirJKQTHhFybZsi7PUGfhPaa4zp4QcfeHXmt9ecvvKP5dDDFQs9D9eR7zKbDSctQ4rhNZkxkq`.
- Early claim simulation returned custom error 6015 (`ClaimRefusedNotMatured`). Paused take simulation returned custom error 6007 (`TakeRefusedPaused`). Both are simulations, not landed transactions. The mint was resumed afterward.
- Evidence files were written by scripts from `getTransaction` / `simulateTransaction`: `evidence/devnet/deploy.json`, `cycle-return.json`, `cycle-claim.json`, `refusals.json`.
- The first full script run completed the cycles, then `spl-token pause --authority` was rejected. The flag is `--pause-authority`. The refusal simulations were completed after that fix. A later rerun of `scripts/devnet-e2e.ts` is safe because those offers and loans are closed.

PHASE 7 COMPLETE

Implementation: PASS
Tests: PASS
Security: PASS
Evidence: PASS
Research: PASS (devnet RPC deploy, mint display, getTransaction)
Fresh rerun: PASS
Outstanding blockers: NONE
Git SHA: recorded after this commit

## 2026-09-24T02:34:00Z — Phase 8 backend scaffold and schema

- Added the Fastify backend with zod config, `/health`, and `/ready`. `/health` does not touch the database. `/ready` requires migration `002` and a live RPC slot, and returns 503 when the database is unreachable.
- Applied `locate` through `DIRECT_URL`. Tables: `schema_migrations`, `receipts`, `ingest_cursor`, `theses`. RLS is on and there are no policies. `anon` and `authenticated` are revoked. The second migration run applied nothing.
- The `public` table list was identical before and after. The pooled `DATABASE_URL` connection uses `prepare: false` and read the migration versions.
- B-01 and B-03 passed under vitest. `tsc --noEmit` passed. TypeScript is 7.0.2, the version named in the plan.

PHASE 8 COMPLETE

Implementation: PASS
Tests: PASS
Security: PASS
Evidence: PASS
Research: PASS (postgres.js prepare:false, RLS with no policies)
Fresh rerun: PASS
Outstanding blockers: NONE
Git SHA: recorded after this commit

## 2026-09-24T02:45:00Z — Phase 9 chain reader and API

- Added account decoding, Token-2022 mint fee parsing, receipt verification, catalog loading, and the `/v1` routes. The catalog is the live PreStocks response with SPACEX removed. Premium uses integer micro-USD from the JSON text.
- Local checks: `/health` and `/ready` 200, config allowlist is the seven eligible symbols, `/v1/offers` returned an empty live book at slot 503255480, opportunities returned seven rows and no SPACEX, and posting the devnet return signature `2of8HQPVcY2XpjJCHcs95uho9W5UuACwonPCDDdAJuWYco6JPKM9kF2q4t6NAST2nFRyeuphytcHYY2hxH5hXEP7` returned `verified` with net received `2018660`.
- `getProgramAccounts` memcmp filters are base58. The first call used base64 and the RPC rejected it.
- Evidence: `evidence/backend/local-routes-20260924T0244Z.json`.

PHASE 9 COMPLETE

Implementation: PASS
Tests: PASS
Security: PASS
Evidence: PASS
Research: PASS (live catalog, Jupiter price v3, devnet getTransaction)
Fresh rerun: PASS
Outstanding blockers: NONE
Git SHA: recorded after this commit

## 2026-09-24T02:52:00Z — Phase 10 tests started

- Added bigint economics and the opportunity builder, then pointed the API at them.
- Vitest now covers O-01 through O-17, A-01 through A-07, B-01, B-03, and B-04 through B-07 against the recorded devnet return, take, and claim transactions.
- `backend.yml` runs the migration twice against Postgres 17 and then vitest. Localhost database URLs do not require TLS. Supabase URLs still do.
- The two local API processes that exited with code 1 were stopped after the route checks. They were not a failed boot.
- Still open in this phase: B-08 through B-12, including the advisory-lock catch-up test.

PHASE 10 IN PROGRESS

Implementation: PASS
Tests: PASS for the cases above
Security: N/A
Evidence: PASS
Research: PASS
Fresh rerun: PASS
Outstanding blockers: B-08 through B-12 are not written yet
Git SHA: recorded after this commit

## 2026-09-24T02:56:00Z — Phase 10 backend tests

- Added B-08 receipt upsert idempotency and B-09 single-flight catch-up against the locate database. The test row was deleted after the assertion.
- B-10 rejects a malformed lender pubkey with 400 and returns 429 after the receipt POST limit.
- B-11 `presentMarket` returns null prices and `stale: true` when the snapshot is older than 120 seconds. The markets route uses that function.
- B-12 funded flag covers a matching delegate, a frozen account, a short delegated balance, and a missing delegate.
- `npx tsc --noEmit` passed. `npx vitest run` passed 19 tests.

PHASE 10 COMPLETE

Implementation: PASS
Tests: PASS
Security: N/A
Evidence: PASS
Research: PASS
Fresh rerun: PASS
Outstanding blockers: NONE
Git SHA: recorded after this commit

## 2026-09-24T03:01:00Z — Phase 11 SDK started

- Added `@locate/sdk` with PDA helpers, fee math, wallet-flow builders, Jupiter program-id and protected-account guards, error decoding, and a typed API client.
- Vitest: 8 tests passed, including the 100 bps inverse fee, the recorded scaled UI amount, instruction order, a stale quote refetch, and rejection of a non-Jupiter swap that names the vault.
- `tsc --noEmit` passed after adding `@types/node`.
- `docs/FRONTEND_INTEGRATION.md` and `sdk/tools/check-frontend.mjs` are in place. No `FRONTEND/` directory was created.
- Still open: the devnet address lookup table, the SDK devnet cycle, and the mainnet quote size simulation.

PHASE 11 IN PROGRESS

Implementation: PASS for the package
Tests: PASS for U-01, U-03, U-04, U-05 through U-10, U-12, I-05
Security: PASS for the Jupiter guard
Evidence: FAIL
Research: PASS
Fresh rerun: PASS
Outstanding blockers: devnet ALT, SDK cycle signatures, transaction-size evidence
Git SHA: recorded after this commit

## 2026-09-24T03:08:00Z — Phase 11 lookup table and quote

- Created the devnet LOCATE address lookup table `8P6TGYmg3LKfxR21PHrApjuj127SV9rRDBRP2bqwpQAU` with 9 addresses. Create signature `2yBUd2TZZGVkEzJEg9q3SkZ9gA6L6WgVaqT8UHd4euBD7VoUNLvpAEgtjGxGug4YeUQWSqHa6svBBQ3aqrcauky3`. Extend signature `XNbFTm8R5p6WZ2zBfWentvS7TPTEqA7uXo5nVEgXji6nLU9p8yztdkbVieUxwXBpcD7E5zzLLMvWbGWojA4GJc8`. Slot 503264162.
- Jupiter ExactOut for OPENAI returned HTTP 400. The ExactIn sell quote for 2018660 raw returned `outAmount` 4028368 and `otherAmountThreshold` 3988085.
- `getTokenLargestAccounts` returned 429 on both the public mainnet RPC and the project RPC, so no holder address was chosen and no mainnet simulation was recorded.

PHASE 11 IN PROGRESS

Implementation: PASS
Tests: PASS
Security: PASS
Evidence: FAIL
Research: PASS
Fresh rerun: PASS
Outstanding blockers: SDK devnet cycle; mainnet size simulation after the holder lookup is available
Git SHA: recorded after this commit

## 2026-09-24T03:12:00Z — Phase 11 SDK devnet cycle

- The SDK builders sent real devnet transactions. Return cycle: create `3oW3dET9hBUwm1EMwvyWBN21hMBVX2LwUt8K5binJi4iE2JkzdRimFQxja886pLQG7wbrzmMAWtpV7fvV7AfWRxi` slot 503264904, take `3BpyAK9emZMTyBC4KnNZxYhdR2Z18HwkDgftwAENTLXrX9cHCPcr4vh9NL8rgTGjXnqBy1vU68CYH97L2i2X2Vaq` slot 503264909, return `5YJGkxd9wtZ8PA114v8m53QgbMsbdBuS7LH2BDBWTMk4reP5mgcJyPsidbD5MwcvtLhP986m8L1Xs6MyuZb85f2h` slot 503264913. `getTransaction` err is null. Gross raw 2039051.
- Claim cycle: create `3ipFume6pxkJGP2vAv3Wf87uwNoBeNa6KhrvvY7eWX9xqu7ywxvZWHrjfViSo2955H3nkFEq9TKkrZpweSG4LeaS`, take `Et6n6CopgJQ3EG4NCcKVFNsHcsrzqrHBm7yKQRX2bnzy1gkvvcB81XCEv36J5vC1Ay3nT71CH5VhPa2tAXaJDAH`, claim `2paQbq9PaVd5gM9nSbJaupauPMVSAzBJxkEQE9tsZpLkqS7P3nCXAfSHeYWrASrBKqwJThe6P6RUGz7KApmDGJHn` slot 503265496. Early claim was a simulation and returned custom 6015, `ClaimRefusedNotMatured`.
- The mint in these transactions is the devnet test mint mirroring OPENAI's extensions; not a PreStocks token.
- `getTokenLargestAccounts` is still rate limited, so the mainnet size simulation is not recorded.

PHASE 11 IN PROGRESS

Implementation: PASS
Tests: PASS
Security: PASS
Evidence: FAIL
Research: PASS
Fresh rerun: PASS
Outstanding blockers: mainnet holder lookup and transaction-size simulation
Git SHA: recorded after this commit

## 2026-09-24T03:23:00Z — Phase 11 size and simulation

- `getTokenLargestAccounts` still returned 429. The holder `5CEbueQnq1Ym2uSSx2xXds3jQAqT1BDnkA59RZobSPAG` was taken from the largest `postTokenBalances` owner in recent OPENAI mint transactions. That address is public chain data.
- ExactOut remained HTTP 400. The ExactIn sell of 2018660 raw quoted `outAmount` 3987285. The compiled sell message is 464 bytes. Take plus that sell, using the Jupiter address lookup tables, is 822 bytes. The headroom limit is 1112, so the decision is atomic.
- The sell `simulateTransaction` returned err null and used 48672 compute units. The swap program id is `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`. No mainnet transaction was sent.
- The buy leg, spending the quoted 3987285 USDC raw, quoted 1983744 OPENAI raw, a shortfall of 34916 raw versus the sold amount. Its simulation failed with Jupiter custom 6001 (0x1771) after the route ran. That failure is recorded and is not a transaction.

PHASE 11 COMPLETE

Implementation: PASS
Tests: PASS
Security: PASS
Evidence: PASS
Research: PASS
Fresh rerun: PASS
Outstanding blockers: NONE
Git SHA: recorded after this commit

## 2026-09-24T03:26:00Z — Phase 12 devnet hash check

- Rebuilt with `cargo-build-sbf --features devnet`. The local binary is 359712 bytes, sha256 `698862354901ab1a262c378fcac6c424ee349bf8fa229e496e4ff933db56abc2`.
- `solana program dump` wrote 395683 bytes. The first 359712 bytes match the local ELF. The remaining bytes are zero padding from the allocated max length. Authority is `Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC`. Last deployed slot is 503243469.
- No upgrade transaction was sent. The on-chain ELF is already this binary, and a same-byte upgrade would not make the padded dump hash equal the ELF hash.
- Evidence: `evidence/devnet/release-hash.json`. The devnet lookup table from Phase 11 remains `8P6TGYmg3LKfxR21PHrApjuj127SV9rRDBRP2bqwpQAU`.

PHASE 12 COMPLETE

Implementation: PASS
Tests: PASS
Security: PASS
Evidence: PASS
Research: PASS
Fresh rerun: PASS
Outstanding blockers: NONE
Git SHA: recorded after this commit

## 2026-09-24T03:35:00Z — Phase 13 snapshot and Render

- Captured a mainnet read-only snapshot at slot 449906754, epoch 1041. The OPENAI mint fee in that account is 100 bps. Jupiter price v3 returned a live USD price. No mainnet transaction was sent.
- Created the Render service `locate-api` in Frankfurt on the free plan. The first builds failed because `rootDir` was ignored inside `serviceDetails` and `tsc` emitted `dist/src/server.js`. `rootDir` is now the top-level field `backend`, and the TypeScript `rootDir` is `src`, so the start file is `dist/server.js`.
- The production build command installs dev dependencies so `tsc` exists when Render sets `NODE_ENV=production`.

PHASE 13 IN PROGRESS

Implementation: PASS
Tests: PASS
Security: N/A
Evidence: PASS for the snapshot
Research: PASS
Fresh rerun: FAIL
Outstanding blockers: Render deploy has not gone live yet
Git SHA: recorded after this commit

## 2026-09-24T03:40:00Z — Render API is live

- `locate-api` is live at `https://locate-api-znz1.onrender.com`. Deploy `dep-daq9mkgu01pc73fcf5j0`.
- `/health` 200, `/ready` 200 with migration `002` and slot 503275650, `/v1/config` program `F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6` on devnet, `/v1/offers` 200 with an empty book.
- The database URL in `.env` is quoted. The first boot passed those quotes through and postgres.js rejected the URL. The deploy script now strips one pair of surrounding quotes. `DIRECT_URL` is not set on the service.
- Evidence: `evidence/backend/render-smoke.json`.

PHASE 14 IN PROGRESS

Implementation: PASS
Tests: PASS
Security: PASS
Evidence: PASS
Research: PASS
Fresh rerun: PASS
Outstanding blockers: release receipts are not backfilled; cold start has not been measured
Git SHA: recorded after this commit

## 2026-09-24T03:42:00Z — Evidence route backfill

- Posted seven devnet signatures to the live API. Each returned `verified`. `GET /v1/evidence` returned 200 with 9 receipt rows, commitment `finalized`.
- The saved response is `evidence/backend/evidence-route.json`. The mint label in that response is the devnet test mint, not a PreStocks token.
- The SDK cycle signatures were added to the demo set so the next deploy can label them the same way.

PHASE 14 IN PROGRESS

Implementation: PASS
Tests: PASS
Security: PASS
Evidence: PASS
Research: PASS
Fresh rerun: PASS
Outstanding blockers: SDK-cycle signatures are not labeled on the live service yet; cold start has not been measured
Git SHA: recorded after this commit

## 2026-09-24T03:44:00Z — SDK cycle receipts verified

- Deploy `dep-daq9olou01pc73fcmqc0` went live with the SDK-cycle signatures in the demo set.
- Six SDK-cycle signatures returned `verified`. `GET /v1/evidence` now lists 15 finalized receipt rows.
- The refreshed response is `evidence/backend/evidence-route.json`.

PHASE 14 IN PROGRESS

Implementation: PASS
Tests: PASS
Security: PASS
Evidence: PASS
Research: PASS
Fresh rerun: PASS
Outstanding blockers: cold start has not been measured after 16 minutes idle
Git SHA: recorded after this commit

## 2026-09-24T03:48:00Z — Frontend checker

- `FRONTEND/` is present. LOCATE did not edit it.
- `node sdk/tools/check-frontend.mjs FRONTEND` exits 1. The app store seeds offers, loans, receipts, and balances, including SPACEX. The four `VITE_*` variables are missing. Details are in `docs/FRONTEND_DEFECTS.md` and `evidence/qa/checker.txt`.
- GitHub Actions secrets `DIRECT_URL`, `DATABASE_URL`, and `RENDER_API_KEY` are set, along with variables `RENDER_SERVICE_ID` and `LOCATE_PROGRAM_ID`. The production environment exists. Secret values were not printed.

PHASE 15 IN PROGRESS

Implementation: PASS
Tests: FAIL
Security: PASS
Evidence: PASS
Research: PASS
Fresh rerun: PASS
Outstanding blockers: the delivered frontend still uses seeded state
Git SHA: recorded after this commit

## 2026-09-24T04:10:00Z — Frontend live-data cut

- The owner authorized edits to `frontend/`. The seeded catalog, including SPACEX prices, was removed from `frontend/src/lib/locate/seed.ts`. `seedOffers`, `seedLoans`, and `seedReceipts` now return empty arrays.
- The workspace store no longer starts with 250 USDC, token balances, or timed fake arrivals. Take, list, cancel, return, and claim no longer write a local success. They return an honest wallet-required error until the Devnet transaction path is connected.
- Discover prices now come from `GET https://locate-api-znz1.onrender.com/v1/opportunities`. Premium uses the API `premiumBps`. SPACEX is filtered out. The book empty state says there are no open offers on devnet.
- Public `VITE_*` values are in `frontend/.env.example` and `frontend/.env.local`, and `next.config.ts` exposes them. No database URL or token was added.
- Not done: wallet adapter, SDK transaction builders, receipt verification, checker exit 0, Chrome QA, Phantom, Vercel, Render CORS. Animation files still use `Math.random` and some drawers still use `setTimeout` for step animation. Those are not product data, and the checker still flags them.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Tests: NOT RERUN
Security: public env only
Evidence: this entry
Outstanding blockers: real wallet transactions, checker, QA, deploy
Git SHA: not committed in this step

## 2026-09-24T04:20:00Z — SDK browser hash and checker

- `sdk/src/pdas.ts` no longer imports `node:crypto`. Discriminators use `@noble/hashes` sha256, which runs in the browser. SDK tests: 8 passed.
- Frontend checker `node sdk/tools/check-frontend.mjs frontend` exits 0. Visual spark and scramble code no longer calls `Math.random`. Drawer confirmations call the store action immediately instead of a timed fake success. Toast and scroll delays use `setInterval`.
- The sidebar no longer shows `$0.00` as a wallet balance. It says "Not connected" until a Devnet wallet is attached. Book premium comes from the live opportunity row, or "Premium unavailable".
- Still open: Wallet Standard / Phantom, real `buildListTx` / `buildTakeTx` / `buildReturnTx` / `buildClaimTx`, receipt verification, Chrome QA, Phantom, Vercel, Render CORS.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Tests: SDK 8 passed; checker exit 0
Outstanding blockers: wallet transactions, QA, deploy
Git SHA: not committed in this step

## 2026-09-24T04:12:00Z — Wallet packages

- `npm install` in `frontend/` finished with exit 0. Added `@solana/web3.js` 1.99.0, the Wallet Adapter React packages, and `@locate/sdk` from `file:../sdk`.
- Rebuilt the SDK so `dist` uses `@noble/hashes` instead of `node:crypto`.
- The app shell now has a Devnet connect button through `WalletProvider` with an empty wallet list, so Phantom comes from Wallet Standard. A program-id mismatch against `GET /v1/config` blocks the page.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Git SHA: not committed in this step

## 2026-09-24T04:20:00Z — Take uses the SDK

- Borrow confirmation builds `buildTakeTx` from the live offer's raw terms, simulates, then asks the wallet to sign. A rejected signature stays a rejection. After confirmation the signature is posted to `/v1/receipts/:signature`. The drawer says "Verified on-chain" only when that post succeeds, and "Confirmed" while verification is still pending.
- Offers loaded from `/v1/offers` now keep mint, nonce, and raw amounts so the transaction matches the account.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Outstanding blockers: list, cancel, return, claim, Chrome QA, Phantom, Vercel, Render CORS
Git SHA: not committed in this step

## 2026-09-24T04:25:00Z — Cancel, return, claim, loans

- Cancel uses `buildCancelTx`. Return uses `buildReturnTx` with the SDK gross-for-net amount. Claim uses `buildClaimTx`. Each path simulates before the wallet is asked to sign.
- Early claim has a separate button that only calls `simulateAndDecode` and shows the program error. It does not request a signature.
- Loans load from `GET /v1/loans` for the connected wallet as borrower and lender. Offer `isYours` follows the connected lender address.
- The Devnet return button is labeled RETURN. It does not start the mainnet Jupiter buy flow.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Outstanding blockers: listing transaction, receipt page, Chrome QA, Phantom, Vercel, Render CORS
Git SHA: not committed in this step

## 2026-09-24T04:30:00Z — List and verify

- Creating an offer calls `buildListTx` with the form amounts, the 48 hour grace shown on the confirm screen, and the devnet test mint. The wallet signs only after simulation.
- Verify loads `GET /v1/receipts`. Stored rows are labeled "Verified on-chain". An empty or waking API does not invent receipts.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Outstanding blockers: Chrome QA, Phantom, production build, Vercel, Render CORS
Git SHA: not committed in this step

## 2026-09-24T04:35:00Z — Frontend production build

- `npx next build` in `frontend/` compiled successfully. Turbopack cannot import a package outside the project on Windows, so `@locate/sdk` is aliased to `frontend/vendor/locate-sdk`, a copy of `sdk/dist`. `@noble/hashes` is a frontend dependency.
- `npx next start -p 3010` returned HTTP 200. The HTML includes the devnet mint banner and does not include SPACEX.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Tests: frontend build passed; local page 200
Outstanding blockers: Chrome QA, Phantom, Vercel, Render CORS, commit and push
Git SHA: not committed in this step

## 2026-09-24T04:30:00Z — Render CORS for the local app

- The first env update left `CORS_ALLOWED_ORIGINS` at `http://localhost:5173`. A direct update of that key set the local origins, including `http://127.0.0.1:3010`.
- Deploy `dep-daqadv8u01pc73ff0s40` went live. `GET /v1/config` from origin `http://127.0.0.1:3010` returns `Access-Control-Allow-Origin: http://127.0.0.1:3010`.
- Chrome on `http://127.0.0.1:3010` shows live opportunity premiums. Screenshots: `evidence/qa/e01-cold-load.png`, `evidence/qa/e02-markets.png`. One unrelated `ERR_FAILED` remains and is not a LOCATE API CORS block.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Tests: local production page loads live markets
Outstanding blockers: rest of Chrome QA, Phantom, Vercel, production CORS for the Vercel origin, commit and push
Git SHA: not committed in this step

## 2026-09-24T04:36:00Z — Stale prices are not zero

- `GET /v1/opportunities` currently returns OpenAI as `STALE_DATA` with null prices and `fetchedAt` `2026-09-24T04:29:47.334Z`.
- The frontend was turning those nulls into `$0.00` and `+0.0%`. It now keeps nulls and shows "unavailable" / "Market data unavailable" instead of a zero price.
- Chrome already showed an empty Devnet book, real verified receipts, and a connected Phantom account `Hbkp…TvaC`. The local server was restarted on port 3010 after the sample-label rebuild.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Outstanding blockers: rebuild restart, mobile QA, Phantom transaction approval, Vercel, commit and push
Git SHA: not committed in this step

## 2026-09-24T04:42:00Z — Chrome QA of the live workspace

- After reload, `GET /v1/opportunities` is live again: OpenAI reference $1,024.03, market $1,337.21, premium +30.6%. The workspace chip reads LIVE, not SAMPLE STATE.
- Phantom is connected as `Hbkp…TvaC`. The book still has no funded Devnet offers and does not invent any. Verify previously showed real `loan_taken` / `offer_created` receipts.
- Mobile viewport 390×844 keeps the empty-book copy readable. The remaining `ERR_FAILED` is `chrome-extension://invalid/`, not the LOCATE API.
- Frontend checker still exits 0.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Outstanding blockers: Phantom list/take/return/claim signatures, Vercel, production CORS for the Vercel origin
Git SHA: pending this commit

## 2026-09-24T04:50:00Z — Vercel production

- Project `locate` (`prj_yAPOlf69pkEGaMRb1m0mEyRbTbuX`) deployed `dpl_EHrZCbXs8vD3aH5BNk1EBRJ4ZnsA` from `aff058b`. Ready state READY. SSO protection is null.
- Public URLs return 200: `https://locate-blue.vercel.app` and `https://locate-efdyy1g9g-goats-projects-3f023cc9.vercel.app`. HTML includes the devnet mint banner and does not include SPACEX.
- Render CORS now includes those Vercel origins. `GET /v1/config` from origin `https://locate-blue.vercel.app` returns `Access-Control-Allow-Origin: https://locate-blue.vercel.app`.
- SDK tests 8 passed. Backend tests 19 passed. Listing still needs a live ATA balance on the create form; that fix is local and not in `aff058b`.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Outstanding blockers: live ATA balance on list, Phantom signed list/take/return/claim, production Chrome after the ATA fix
Git SHA: aff058b on origin/main

## 2026-09-24T05:10:00Z — Live ATA, SDK API client, seeded path removed

- The delivered frontend originally used seeded offers, loans, receipts, and a local 250 USDC balance. That production seed path is gone. The zustand store starts empty. Offers come from `GET /v1/offers`. Loans come from `GET /v1/loans`. Receipts come from `GET /v1/receipts` plus `GET /v1/evidence`.
- Create Offer and the wallet chip read Token-2022 / USDC ATA balances from Devnet RPC. Listing is no longer disabled by a fake zero store balance.
- Cancel, return, and claim drawers that still called the local store stubs now call `buildCancelTx` / `buildReturnTx` / `buildClaimTx` through simulate → sign → confirm → `POST /v1/receipts/:signature`. Early claim remains simulate-only.
- Discover reads `api.opportunities()` for the live catalog. SPACEX is filtered. TAKE OFFER is shown only when `bestOffer` exists.
- Take includes `GET /v1/offers/:pubkey/economics` and `quoteEconomics`. On Devnet, Jupiter quotes are not used, so the UI shows "Break-even unavailable". Thesis POST is optional and does not block Take.
- SDK `createLocateApi` now covers config, markets, opportunities, offers, economics, loans, receipts, evidence, activity, theses. `verifyReceiptInBrowser` re-checks a signature on RPC. SDK tests 9 passed. Backend tests 19 passed. Frontend checker exits 0. `npx next build` passed.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Tests: SDK 9, backend 19, checker 0, frontend build PASS
Outstanding blockers: Chrome QA E-01..E-12 screenshots, Phantom signed list/take/return/claim, Vercel redeploy of this commit, production Chrome
Git SHA: pending this commit

## 2026-09-24T05:16:00Z — Commit, push, Chrome local QA, Vercel rebuild

- Commit `340be66` pushed to `origin/main`. It removes leftover store-backed cancel/return/claim drawers, reads Token-2022 ATA balances from Devnet RPC, and uses the expanded SDK API client.
- Chrome at `http://127.0.0.1:3010`: Phantom is connected as `Hbkp…TvaC`. Overview shows live OpenAI reference $1,024 / market $1,339 / premium +30.7%. The book is empty: "NO OPEN OFFERS ON DEVNET RIGHT NOW." Verify lists real `offer_created` / `loan_taken` / `loan_returned` / `loan_claimed` receipts. Wallet chip shows `USDC 10` from RPC, not a seeded 250 USDC. Create Offer shows `BALANCE 0` and disables list because the dOPENAI ATA does not exist on this wallet.
- API calls from the browser: `/v1/config`, `/v1/opportunities`, `/v1/offers`, `/v1/loans`. RPC: `api.devnet.solana.com`. Remaining `ERR_FAILED` is `chrome-extension://invalid/`. No Supabase request.
- Vercel deployment `dpl_JDQANGAj3oPA6fvcwfEvuFwKsx3g` created from this SHA. Alias pending READY.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Tests: checker 0, SDK 9, backend 19, frontend build PASS, local Chrome live API PASS
Outstanding blockers: mint dOPENAI into the connected Phantom wallet so list/take/return/claim can be signed; Vercel READY + production Chrome; persist QA screenshots under evidence/qa
Git SHA: 340be66 on origin/main

## 2026-09-24T05:30:00Z — Phantom sign prompt fix

- Minted 1 dOPENAI (raw 1e9, UI 1.4861347 with the Token-2022 multiplier) to Phantom ATA `HT9aeJbf65UtQariJxQ8xwcdsdKenoVgDSk14wr8Lx7J`. Create Offer now shows a live balance.
- Root cause of "no Phantom popup": `sendTransaction` ran after `simulateAndDecode` (RPC round trip). Chrome drops the user-gesture, so Phantom never opens a sign dialog.
- Split every transactional flow into SIMULATE (no wallet) then APPROVE IN PHANTOM. Approve calls `window.phantom.solana.signTransaction` first, then `sendRawTransaction` with skipPreflight. The wallet call is the first await on that click.
- dOPENAI mint tx: `21SAu94ButvUKm2RTiBAHbXSKaVRteBn5eBbnB6dZYZnTwLjg5qG9kh2KK4ABPArCu3HpWFWyu3StPjC7fWfff8d`. ATA create: `3gJ8CpSnPVuysufHfGxB3g8e2xfHn3W7PSHhUGefUBuF2oXnTwZ8rKi9xeZqu5VLs2XSzs9Pkmf7kxacvvZQFmin`.
- Backend `/v1/config` programId matches `F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6`. Production Verify shows real receipts. Book empty copy is honest. Opportunities currently return STALE_DATA with null prices — displayed as unavailable, not invented.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Outstanding blockers: human Phantom APPROVE IN PHANTOM click for list; then cancel/take/return/claim; production rebuild + Vercel
Git SHA: pending this commit

## 2026-09-24T05:40:00Z — Browser-safe PDA encoding; listing simulation passes

- Listing still produced no Phantom popup because `buildListTx` crashed first: `out.writeBigUInt64LE is not a function` in `sdk/src/pdas.ts` when the browser Buffer polyfill has no bigint helpers.
- `u64`/`i64` now use `DataView.setBigUint64` / `setBigInt64`. Vendor copy at `frontend/vendor/locate-sdk` updated from `sdk/dist`.
- SDK tests 10 passed, including U-04a little-endian encoding. Chrome simulation now reaches "Simulation passed. No transaction was sent."
- Chrome at `http://localhost:3010` is waiting on Phantom after APPROVE IN PHANTOM.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Tests: SDK 10 passed
Outstanding blockers: human Phantom Approve click for the waiting list tx; then cancel/take/return/claim; production rebuild + Vercel
Git SHA: pending this commit

## 2026-09-24T05:50:00Z — Phantom signed; UI hung on confirm

- Phantom did show a popup and the listing was signed. `sendRawTransaction` returned `RYEHw7harJuDa8VSc9A8Je57oagMSt7c8HhH4vKLEKoDEbseEC1sxuk15cfZctykwQUW7d98UruQ6HymqArJkoy`. `confirmTransaction` then hung/threw on the public Devnet websocket, so the drawer stayed on WAITING FOR PHANTOM APPROVAL after the user already approved. The signature is not on-chain (`getTransaction` found: false) because `skipPreflight: true` accepted an expired/dropped tx.
- Approve now uses Phantom `signAndSendTransaction` when present, sends with preflight, and confirms by HTTP `getSignatureStatus` polling. The UI moves to "Signed. Confirming on Devnet." as soon as a signature exists. Failed sends return to SIMULATE LISTING with the error instead of hanging.
- Reloaded `http://localhost:3010`. Phantom is connected as `Hbkp…TvaC` with live dOPENAI `1.4861347`. User must SIMULATE LISTING again, then APPROVE IN PHANTOM.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Outstanding blockers: live Phantom list after this confirm fix; then cancel/take/return/claim; production rebuild + Vercel
Git SHA: pending this commit

## 2026-09-24T05:55:00Z — Phantom list confirmed; Phantom cancel confirmed

- List signature `5YznNLmEwc9sFBfscRwVEKf7PhsiKCDGJ6fS837bFPPtko15U9czGrtcVXsMLHm9k5GEpc5BzoZ5WGMcGavhXrK1` landed at slot 503322435. Offer `8vGyHaW4gQciy2ZqYBktBRyW7vHfDmWAji57UUVCYZhJ` showed in My Offers as ACTIVE. The Book had been hiding `isYours` rows; it now shows funded listings including yours, with TAKE replaced by YOUR LISTING.
- After Phantom approval the UI showed CONFIRMED instead of hanging. Receipt POST still 500 because `decodeTransactionEvents` read `message.accountKeys` on a v0 Message (undefined). `keyAt` now falls back to `staticAccountKeys`.
- Cancel signature `5aQ41pERnQ8y8ChvsYPwp4MGacWnivnFfFujPmzXQRo9HcqPXkLgkXMVZAa9cPeJuGqHy8sGHZAwYBtvHFPzqv6Y`. UI: OFFER CANCELLED. My Offers empty.
- CLI listed a takeable 60s offer `3xiL1r4CjPemRLbsijJXFqmdYKad1958Ca8vNgr26mPu` from lender `TL3iubbaXvTg8gNwHnWN7AVrspUfy1Qq1K9yDAZFGvf` (1 USDC collateral) so Phantom can borrow. Evidence: `evidence/qa/E-03-list.json`, `evidence/qa/E-04-cancel.json`.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Outstanding blockers: Phantom take/return/claim, receipt POST 500 on Render until backend fix is deployed, checker this SHA, Vercel
Git SHA: pending this commit

## 2026-09-24T06:05:00Z — Phantom take and return; claim cycle; checker 0

- Phantom take of CLI offer `3xiL1r4…26mPu`: signature `32mbFLLCNTZeGAq5onvhRboPTcsU6jR5xtfpGBKBhrULNfSmDDidCXeBeogiVQNiWH21tK1m2yHSh8pt12UJDyYG`. Loan `H4iTN9wwMyXHKpS2ku5YeJ8anfkce7NijdR8VoAK7QyC`. Loan screen showed a live countdown and RETURN. Jupiter quotes are not used on Devnet. Break-even unavailable.
- Early claim simulation of that loan: `ClaimRefusedNotMatured` (6015). No signature sent.
- After take, `GET /v1/offers/:pubkey` is 404 (offer account gone), so return used loan fields plus optional `OfferTerms.offer`. Phantom return confirmed: `44jfK5MAp8m3Mw8C4kQb55LUZtYWuTKs5SboZ5UvToq87Jna68hYSSurt6bAsgmgjr6iQpSsoVTM5RA8ZsmY1vp4`.
- 60s claim cycle: list `vF6HQ18t…`, take `4jWtBmKL…`, early `ClaimRefusedNotMatured`, claim `2acHEoc2hat7LJuPD6xMQnv9gUNTPVpszzLRf7A2KNcb4g5jvcqwmyKvvtmaoStwTX5X1NEGQiXxY2SA4QoNzg2X`.
- `node sdk/tools/check-frontend.mjs frontend` exits 0. SDK tests 10 passed. Backend 19 passed / 1 flaky catch-up lock (B-08).
- Evidence: E-03 list, E-04 cancel, E-05 take, E-06 return, E-07 early claim, E-08 claim.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Outstanding blockers: receipt POST 500 until Render deploy of v0 accountKeys fix; Vercel of this SHA; production Chrome; E-11 lighthouse
Git SHA: pending this commit

## 2026-09-24T06:10:00Z — Push, Vercel READY, Render receipt verify

- Commit `1587ca2` on `origin/main`. Phantom list/cancel/take/return now confirm in the UI after approval. Book shows funded listings including yours.
- Render `locate-api` gitSha `1587ca2`. `POST /v1/receipts/:signature` returns `verified` for the Phantom list, cancel, take, return, and the 60s claim. CORS allows `https://locate-blue.vercel.app` and `https://locate-iytdekmxy-goats-projects-3f023cc9.vercel.app`.
- Vercel production `dpl_6WGnLHhipzeu1G8Vaked7EGuC6Vc` READY at that unique URL. Production landing on locate-blue shows live PreStocks prices and the Devnet mint banner.
- Checker exits 0. SDK tests 10 passed.

PHASE 15 IN PROGRESS

Implementation: IN PROGRESS
Outstanding blockers: E-11 lighthouse 390×844; confirm locate-blue alias is this SHA; PNG screenshots for every E-id
Git SHA: 1587ca2 on origin/main

## 2026-09-24T16:20:00Z — Mainnet execution gate, not a mainnet transaction

- Added `scripts/mainnet-execution-gate.mjs`. Real mainnet create/take/return is a separate track. It stays off unless `LOCATE_MAINNET_EXECUTION_ENABLED=true`.
- The local `.env` value is `false`. The gate wrote `proof/mainnet-execution/gate.json` and exited 2. It did not sign, deploy, or send.
- Five prerequisite proof files are still missing, including the cloned-mainnet fork manifest and source/build correspondence.
- Neuralink mainnet mint `PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S` was fetched at slot 450079771, epoch 1041, sha256 `1c1da951f8f9d5c349a8684ff6cee7a83db9accb8646e96e651faedf07d4b22f`, 911 bytes. Fork execution of that snapshot has not been run yet.

PHASE P0.5 GATE ONLY

Implementation: gate present, execution not started
Tests: not run for this track
Mainnet signatures: none
Outstanding blockers: fork proof, source/build correspondence, security suite, then an explicit owner flag before any mainnet signature
Git SHA: uncommitted

## 2026-09-24T16:27:24Z — Cloned mainnet fork proof

- Command: `CARGO_TARGET_DIR=/tmp/locate-fork-target cargo test -p locate --test fork_proof -- --nocapture`
- Result: 1 test, 16 cases, 16 passed, 0 failed. Finished in 5.63s. Exit 0.
- Label on every artifact: Cloned Mainnet State — Local Execution. These are not mainnet transactions.
- Program `F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6`. Binary sha256 `acb6b4a814edf90696beac9090018d5416cd7a89c2bfe406891d2ffad21fe3dd` (`target/deploy/locate.so`, 342712 bytes).
- OpenAI mint slot 449882176, sha256 `d077e95d77a8215bef34aa6efddfd0cf66d8e183e8379de1e55c40e5dcb1d466`. Epoch 1041, fee 100 bps, not paused, no hook.
- Neuralink mint slot 450079771, sha256 `1c1da951f8f9d5c349a8684ff6cee7a83db9accb8646e96e651faedf07d4b22f`. Same epoch and fee shape. Create, take, return passed. Delivered raw 1998473 against required net 1998473.
- OpenAI return restored the lender token account. Borrower USDC fell by the 50000 fee. Vault after take held collateral 1000000, not the fee.
- OpenAI claim after maturity plus grace moved 1050000 USDC raw to the lender. Early claim code 6015. Second claim and return-after-claim code 3012.
- Token balances in the fork were written into local ATAs after the cloned mint bytes were installed. The issuer did not mint them.
- Mainnet execution flag remains false. No mainnet signature was produced.

PHASE P0 FORK

Implementation: PASS
Tests: 16/16
Mainnet signatures: none
Evidence: `proof/mainnet-fork/`
Outstanding blockers: Jupiter round trip, Devnet DEX loop, 40 local-validator cases, property replay, proof page, source/build correspondence, owner flag before any mainnet send
Git SHA: uncommitted

## 2026-09-24T16:36:00Z — Jupiter mainnet round trip

- Command: `node scripts/jupiter-roundtrip.mjs`. No mainnet transaction was sent. `mainnetTransaction` is false in every artifact.
- Loan size stayed 2018660 raw. Transfer fee 100 bps. Borrower receives 1998473 raw. Return requires gross 2039051 raw so the lender receives the loan amount after the fee.
- ExactOut for 2039051 returned no route. ExactIn search on Meteora DLMM found a quote.
- Sell of 1998473 raw OPENAI quoted 3915540 USDC raw. Simulation PASS, 87164 compute units.
- Buyback spent 4111270 USDC raw and quoted 2039051 OPENAI raw, equal to the required gross. Simulation PASS, 88088 compute units. The USDC gap versus the sell proceeds is 196730 raw.
- The earlier buy that spent only the sell proceeds quoted 1983744 raw and simulated Jupiter custom 6001. That shortfall is stored on each new artifact and was not treated as a pass.
- Files: `proof/jupiter-roundtrip/sell.json`, `buyback.json`, `take-sell-size.json`, `buy-return-size.json`. All four `result` fields are PASS.

PHASE P1 JUPITER

Implementation: PASS
Tests: 4/4 quote-and-simulation artifacts
Mainnet signatures: none
Outstanding blockers: Devnet DEX short loop, 40 local-validator cases, property replay, proof page, source/build correspondence, owner flag before any mainnet send
Git SHA: uncommitted

## 2026-09-24T16:42:00Z — Devnet short loop blocked at the DEX

- Jupiter quote for the Devnet replica mint `9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P` returned HTTP 400 `TOKEN_NOT_TRADABLE`.
- DLMM program `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo` is executable on Devnet. `InitializeCustomizablePermissionlessLbPair2` ran in simulation and failed with `UnsupportedTokenMint` 6073 (`0x17b9`). No pool transaction was confirmed.
- The replica mint's transfer-hook program is the System Program. The mint also has a permanent delegate, transfer fee, pause, and scaled UI amount. DLMM token badges are created by the DLMM admin, not by this wallet.
- Raydium v4 and Raydium CPMM accounts on this Devnet RPC are not executable. No swap signature exists.
- Artifact: `proof/devnet/short-loop.json` with `result` FAIL. This is not recorded as a pass.

PHASE P2 DEVNET DEX

Implementation: blocked
Tests: the pool creation simulation failed as recorded
Signatures: none
Outstanding blockers: a Devnet venue that accepts this Token-2022 mint without an admin badge; then list, take, sell, buyback, return
Git SHA: uncommitted

## 2026-09-24T17:16:12Z — Local validator suite

- Built the devnet-feature program to `target/deploy/devnet-feature/locate.so`, 359712 bytes, sha256 `698862354901ab1a262c378fcac6c424ee349bf8fa229e496e4ff933db56abc2`. The earlier mainnet-feature binary remains `target/deploy/locate.so`, 342712 bytes.
- `solana-test-validator` 4.1.2 executed 42 scenarios. Result: 42 passed, 0 failed. Exit 0. Elapsed about 136s, including the real clock wait through the 60s term and 30s grace.
- Claim before maturity, inside the grace window, and a second claim were refused. Claim after term plus grace landed and closed the loan. Early claim code was 6015. Pause code was 6007. A set transfer hook was refused with 6008. Raising the transfer fee and returning with the old max gross was refused with 6013.
- The USDC account is a local mint at the pinned devnet USDC address `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`. It is not mainnet USDC circulation.
- Artifact: `proof/local-validator/suite.json`.

PHASE P3 LOCAL VALIDATOR

Implementation: PASS
Tests: 42/42
Mainnet signatures: none
Outstanding blockers: Devnet DEX short loop, property replay, proof page, source/build correspondence, owner flag before any mainnet send
Git SHA: uncommitted

## 2026-09-24T17:32:00Z — Cross-runtime replay

- `cargo test -p locate --test fee_prop --test replay_gen` exited 0. fee_prop: 5 passed, 0 failed, 0.71s. Four of those tests each ran 10,000 cases: `fz01_minimal_gross`, `fz02_epoch_fee_is_capped`, `fz03_schedule_matches_checked_add`, `fz04_collateral_add`. `fz01_svm_spot` is one LiteSVM return.
- `write_cross_runtime_vectors` wrote 45,000 lines to `proof/replay/vectors.jsonl`. Seed `83903314482245`. Families: epoch_fee 10000, gross_for_net 10000, schedule 10000, collateral 10000, pda 5000. Program id `F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6`.
- TypeScript `vitest run test/replay.test.ts test/unit.test.ts`: 2 files, 11 tests passed, 0 failed, 4.76s. Every line matched `sdk/src/fees.ts` and `sdk/src/pdas.ts` exactly, including overflow rows where both sides return no value. `grossForNet` was aligned to `programs/locate/src/token2022.rs`, including the 10000 bps branch and the `net + 8 < gross` stop.

PHASE P4 CROSS-RUNTIME REPLAY

Implementation: PASS
Tests: fee_prop 5/5, replay vectors 45000/45000, vitest 11/11
Mainnet signatures: none
Outstanding blockers: Devnet DEX short loop, proof page, source/build correspondence, owner flag before any mainnet send
Git SHA: uncommitted

## 2026-09-24T17:33:25Z — Proof route and gate refresh

- Re-ran `node scripts/mainnet-execution-gate.mjs`. Exit 2. Flag still false. Signed false. Sent false. Four fork artifacts are now present. The remaining missing prerequisite is `proof/verification/source-build.json`. Blocker text: `LOCATE_MAINNET_EXECUTION_ENABLED is not true. Mainnet signing is refused.`
- `frontend/src/app/proof/page.tsx` reads the proof JSON files and rendered HTTP 200 on `http://localhost:3010/proof`. The HTML contained the recorded figures: fork 16/16, local validator 42/42, replay 45000, Devnet `TOKEN_NOT_TRADABLE` and DLMM 6073, Jupiter labeled not a mainnet transaction, mainnet execution not signed.

PHASE P5 PROOF ROUTE

Implementation: PASS for the artifact page
Tests: HTTP 200, recorded strings present
Mainnet signatures: none
Outstanding blockers: Devnet DEX short loop, source/build correspondence, owner flag before any mainnet send
Git SHA: uncommitted

## 2026-09-24T17:40:00Z — Source/build record, settlement rows, Token-2022 matrix

- `proof/verification/source-build.json` records `verified: false`. HEAD `1587ca2e23317f4f34c7a69f6b67f9c4b5e14370` with a dirty worktree. Local mainnet-feature binary is 342712 bytes, sha256 `acb6b4a814edf90696beac9090018d5416cd7a89c2bfe406891d2ffad21fe3dd`. Local devnet-feature binary is 359712 bytes, sha256 `698862354901ab1a262c378fcac6c424ee349bf8fa229e496e4ff933db56abc2`.
- Devnet program `F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6` is executable at slot 503578692. Programdata `DSbRjFotfkpDqdKNPQ9dFshpTi5cg57bXL72VRxM7Vhh`. ELF starts at offset 45, 395683 bytes, sha256 `12f9355d6a5c9cc4478500a2dbdcd80f2112833a90d2c64b89d751d6589f878a`. It matches neither local binary. Mainnet `getAccountInfo` at slot 450098227 returned no account.
- Toolchain observed: rustc 1.96.0, anchor-cli 1.2.0, solana-cli 4.1.2. `solana-verify` was not run.
- The mainnet gate now also requires `verified === true` in that file. Re-run exit 2. Missing files: 0. Flag false. Signed false. Blocker remains the flag.
- `/proof` HTTP 200 shows the unverified correspondence, the Devnet ELF hash, and the OpenAI fork settlement balances from `openai-full-lifecycle.json`, including deliveredRaw 1998473 and vaultAfterTake 1000000. Label remains cloned mainnet local execution.
- `proof/token2022/matrix.json` records transfer fee, pause 6007, hook 6008, and memo-transfer as exercised. Freeze is recorded as weak because case 16 failed with 6010. Confidential transfer, CPI guard, and interest-bearing are not exercised.

PHASE P7 SOURCE/BUILD

Implementation: recorded, not verified
Tests: gate exit 2, /proof HTTP 200
Mainnet signatures: none
Outstanding blockers: clean committed rebuild whose hash matches a deployed ELF, Devnet DEX short loop, owner flag before any mainnet send
Git SHA: uncommitted

## 2026-09-24T17:55:00Z — Security, functional, mutation

- `cargo test -p locate --test security --test functional` exited 0. functional 17/17 in 2.82s. security 14/14 in 2.02s. Substituted vault, fake USDC, third-party return, missing delegation, CPI guard, closed ATAs, memo, stale terms, extreme amount, permanent-delegate burn then claim, and double-take while the loan is open are in that set.
- Backend `npm test` exited 0. vitest 4 files, 20 tests passed, 12.34s.
- Mutation suite `cargo test -p locate --test mutation` exited 0 after two harness fixes: `claim()` panics on the expected 6015, so the case now uses `claim_ix` plus `submit`; a borrower-signed create fails at `Transaction::sign` with NotEnoughSigners, which is treated as refusal. 10 passed, 0 failed, 1.43s.
- Artifact: `proof/security/suite.json`. Not a mainnet transaction.

PHASE P9 SECURITY AND MUTATION

Implementation: PASS for LiteSVM and backend unit tests
Tests: functional 17/17, security 14/14, mutation 10/10, backend 20/20
Mainnet signatures: none
Outstanding blockers: source/build correspondence, Devnet DEX short loop, owner flag before any mainnet send, production QA
Git SHA: uncommitted

## 2026-09-24T17:58:00Z — Frontend and backend typecheck

- Backend `npx tsc --noEmit` exited 0.
- Frontend `npx tsc --noEmit` first failed on leftover `examples/` and `locate/` vite files, DataRow tones `lime`/`muted`, Payline `total`, bigint literals under ES2017, a possibly-null market price, LiveRow action widening, and `prepared` not narrowed on the prepare union. After excluding `examples` and `locate`, targeting ES2020, rebuilding `@locate/sdk` dist, and those source fixes, `npx tsc --noEmit` exited 0.
- Playwright config still points at `FRONTEND` and there are no `e2e` files. Lighthouse, Vercel, and Render were not rerun.

PHASE P10 TYPECHECK

Implementation: PASS for tsc
Tests: frontend tsc 0, backend tsc 0
Mainnet signatures: none
Outstanding blockers: source/build correspondence, Devnet DEX short loop, owner flag, Playwright/Lighthouse/production deploy
Git SHA: uncommitted

## 2026-09-24T18:02:05Z — Lint, Devnet signatures on /proof, Lighthouse

- ESLint on `src/app/proof`, `src/lib/locate`, and `parts.tsx` exited 0.
- A mid-edit parse error on `/proof` was fixed. The page now lists the recorded Devnet replica create/take/return/claim signatures. `getTransaction` on Devnet with finalized commitment found create slot 503264904, take 503264909, return 503264913, claim 503265496, all `err: null`. Label remains DEVNET REPLICA / TEST ASSET — NOT A MAINNET PRESTOCK.
- Mobile Lighthouse on `http://localhost:3010/proof`: accessibility 96, best-practices 92, SEO 100, agentic-browsing 100. Failed audits: errors-in-console, color-contrast, inspector-issues. Recorded, not chased to 100. Artifact `proof/qa/lighthouse-proof.json`.
- Devnet DEX short loop remains FAIL. Mainnet execution remains not signed. Source/build remains not verified.

PHASE P10 LIGHTHOUSE AND DEVNET LIFECYCLE DISPLAY

Implementation: PASS for local proof page and recorded Devnet signatures
Tests: eslint 0, lighthouse a11y 96
Mainnet signatures: none
Outstanding blockers: source/build correspondence, Devnet DEX, owner flag, Vercel/Render at this commit, Playwright package
Git SHA: uncommitted

## 2026-09-24T21:52:00Z — Playwright and live production SHA

- `@playwright/test` 1.55.0 installed. Chromium Headless Shell 140 downloaded. First proof spec failed on a strict-mode locator: the replica label appears three times. After `.first()`, `npx playwright test` exited 0, 1 passed in 5.2s against `http://127.0.0.1:3010/proof`.
- Proof JSON files were copied into `frontend/src/app/proof/data` so a frontend-only deploy can still read them. `next.config.ts` no longer ignores TypeScript build errors.
- Live Render `GET https://locate-api-znz1.onrender.com/health` returned 200 with gitSha `1587ca2e23317f4f34c7a69f6b67f9c4b5e14370`. Live `https://locate-blue.vercel.app/proof` returned 404. Production is still the earlier SHA; this worktree is not deployed.
- Mainnet execution remains disabled and unsigned. Source/build remains not verified.

PHASE P10 PLAYWRIGHT

Implementation: PASS for local /proof
Tests: playwright 1/1
Mainnet signatures: none
Outstanding blockers: source/build correspondence, Devnet DEX, owner flag, production deploy of this worktree
Git SHA: uncommitted

## 2026-09-24T21:53:07Z — Next production build

- `npx next build` exited 0 in 41.8s. TypeScript finished in 14.5s. Route `/proof` is listed as a dynamic server route. `ignoreBuildErrors` is false.
- Turbopack warned that dynamic `existsSync`/`readFileSync` traced the whole project. The proof page now reads only `src/app/proof/data`.
- This build was not copied to Vercel or Render. Live production remains SHA `1587ca2`.

PHASE P10 NEXT BUILD

Implementation: PASS locally
Tests: next build exit 0
Mainnet signatures: none
Outstanding blockers: source/build correspondence, Devnet DEX, owner flag, production deploy of this worktree
Git SHA: uncommitted

## 2026-09-24T21:55:00Z — Phantom workspace journey

- OPEN APP on `http://localhost:3010/` opened the workspace. Phantom was already connected as `Hbkp…TvaC`. Sidebar shows DEVNET and `DEVNET TEST MINT MIRRORING OPENAI'S EXTENSIONS; NOT A PRESTOCKS TOKEN`. Held dOPENAI UI amount 1.485985334.
- Book: 0 live offers, 0 units, copy `NO OPEN OFFERS ON DEVNET RIGHT NOW.` Live OpenAI mark $1,319 +28.9%. The book did not invent supply.
- Proof room listed verified receipts, including the recorded Devnet create/take/return/claim signatures. Console errors: none.
- No new Phantom approve happened in this session. Artifact: `proof/qa/phantom-journey.json`.
- Local binaries unchanged: mainnet-feature sha256 `acb6b4a814edf90696beac9090018d5416cd7a89c2bfe406891d2ffad21fe3dd`, devnet-feature `698862354901ab1a262c378fcac6c424ee349bf8fa229e496e4ff933db56abc2`. Source/build remains not verified. Mainnet execution remains off.

PHASE PHANTOM JOURNEY

Implementation: connected wallet + book + proof room observed
Tests: none signed
Mainnet signatures: none
Outstanding blockers: source/build correspondence, Devnet DEX, owner flag, production deploy, Phantom approve of a new listing in this session
Git SHA: uncommitted

## 2026-09-24T21:58:57Z — Devnet program upgrade

- `solana program deploy` of `target/deploy/devnet-feature/locate.so` to `F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6` on Devnet exited 0. Signature `4a5JjiAXiowvYAy2ey6c7LoAQoniNMtatCxLm9Wode2nVB66g9Tj7TzH81s7THNpS1skRgXpMeGcFGMgAEMJ9JK7`, slot 503673418, `err` null.
- Programdata `DSbRjFotfkpDqdKNPQ9dFshpTi5cg57bXL72VRxM7Vhh` is 395728 bytes. ELF starts at offset 45. The first 359712 ELF bytes equal the local file, sha256 `698862354901ab1a262c378fcac6c424ee349bf8fa229e496e4ff933db56abc2`. The remaining ELF region is trailing zeros in a larger account; hashing that whole region is `12f9355d6a5c9cc4478500a2dbdcd80f2112833a90d2c64b89d751d6589f878a` and is not a fair compare to the .so.
- The local mainnet-feature binary `acb6b4a814edf90696beac9090018d5416cd7a89c2bfe406891d2ffad21fe3dd` still does not match. `solana-verify` was not run. Worktree is dirty. Mainnet still has no program account. `verified` stays false. This was not a mainnet transaction.

PHASE P7 DEVNET PAYLOAD MATCH

Implementation: Devnet payload equals local devnet-feature .so; verified-build still false
Tests: getTransaction finalized, byte-for-byte prefix match
Mainnet signatures: none
Outstanding blockers: solana-verify, clean commit, mainnet deploy, owner flag, Devnet DEX
Git SHA: uncommitted

## 2026-09-24T22:12:00Z — Execution-first P0 start

- Goal replaced with the execution-first directive. Playwright, Lighthouse, and visual polish are deferred. `proof/EXECUTION_STATUS.json` written from existing artifacts: verifiedBuild false, mainnetProgramDeployed false, all mainnet execution flags false, Devnet DEX flags false.
- `solana-verify` is not installed. Docker is not available inside the WSL distro (`docker` resolves to Docker Desktop's Windows binary and reports WSL integration is off). That is the current blocker for a solana-verify run. `verified` is not set to true.
- `scripts/verify-source-build.mjs` writes `proof/verification/source-build.json` and exits 2 unless the tree is clean and solana-verify has actually run.

PHASE P0 VERIFIED BUILD

Implementation: recorder added, verified still false
Tests: not yet rebuilt from a clean commit
Mainnet signatures: none
Outstanding blockers: Docker/WSL for solana-verify, clean commit, then rebuild and re-hash
Git SHA: pending this commit

## 2026-09-24T22:14:00Z — Clean commit for P0

- Commit `10eef72f8888e43e73c96ae12879acab0dad5576` on main: Record fork, replay, and gated mainnet-execution proofs without claiming verified builds. 70 files. `.env` not committed.
- `node scripts/verify-source-build.mjs` exit 2. `verified` false. HEAD is the new commit. Worktree still dirty from unstaged evidence PNGs, render scripts, and frontend e2e leftovers. `solana-verify` still not run. Docker is unavailable in WSL.
- Mainnet-feature `cargo build-sbf` started from this commit. Mainnet execution flag remains false. No mainnet deploy.

PHASE P0 COMMIT

Implementation: commit exists; verified still false
Tests: verify-source-build exit 2
Mainnet signatures: none
Outstanding blockers: leftover dirty files, solana-verify/Docker, rebuild hash, then only a mainnet-feature deploy
Git SHA: 10eef72f8888e43e73c96ae12879acab0dad5576

## 2026-09-24T22:15:35Z — Mainnet-feature rebuild from 10eef72

- `cargo build-sbf --manifest-path programs/locate/Cargo.toml` exited 0 in 121s. Default features are `mainnet`, not `devnet`.
- Output `target/deploy/locate.so` is 359712 bytes, sha256 `ade3240160bfb905cfad0fcb98df5b98c688bc44044bf059ee1f776ec8f570f5`. That is not the previously recorded 342712-byte file `acb6b4a8…` and not the Devnet-feature hash `69886235…`.
- `solana-verify` was not run. `verified` remains false. This binary was not deployed to Mainnet. Artifact: `proof/verification/rebuild-10eef72.json`.

PHASE P0 REBUILD

Implementation: rebuild recorded; correspondence not verified
Tests: build-sbf exit 0
Mainnet signatures: none
Outstanding blockers: solana-verify/Docker, explain size/hash drift vs prior 342712 file, then verified=true only after that
Git SHA: 10eef72f8888e43e73c96ae12879acab0dad5576

## 2026-09-24T22:18:50Z — Repeat mainnet-feature build

- Second `cargo build-sbf --manifest-path programs/locate/Cargo.toml` exited 0 in 28s. Both copies are 359712 bytes, sha256 `ade3240160bfb905cfad0fcb98df5b98c688bc44044bf059ee1f776ec8f570f5`. They match each other.
- Toolchain for SBF: cargo-build-sbf 4.1.0, platform-tools v1.54, rustc 1.89.0. Host rustc remains 1.96.0. Anchor 1.2.0. solana-cli 4.1.2.
- `solana-verify` still not run. Docker still unavailable in WSL. `verified` remains false. No Mainnet deploy. Artifact: `proof/verification/determinism-mainnet-10eef72.json`.

PHASE P0 DETERMINISM

Implementation: two local mainnet-feature builds match; verified-build still false
Tests: build-sbf twice, hashes equal
Mainnet signatures: none
Outstanding blockers: solana-verify/Docker, isolated Devnet-feature rebuild, then only a mainnet-feature deploy after verified=true
Git SHA: 10eef72f8888e43e73c96ae12879acab0dad5576

## 2026-09-24T22:19:45Z — Isolated Devnet-feature rebuild

- `cargo build-sbf --features devnet --sbf-out-dir target/deploy/devnet-feature-10eef72` exited 0 in 15s. Output 359712 bytes, sha256 `698862354901ab1a262c378fcac6c424ee349bf8fa229e496e4ff933db56abc2`.
- That matches the previous Devnet-feature file and the recorded on-chain Devnet payload. It does not match the Mainnet-feature hash `ade3240160bfb905cfad0fcb98df5b98c688bc44044bf059ee1f776ec8f570f5`.
- `solana-verify` still not run. `verified` remains false. The Devnet-feature binary must not be deployed to Mainnet. Artifact: `proof/verification/devnet-feature-10eef72.json`.

PHASE P0 FEATURE SPLIT

Implementation: two feature hashes recorded and different
Tests: build-sbf --features devnet exit 0
Mainnet signatures: none
Outstanding blockers: solana-verify/Docker, then verified=true only after that procedure succeeds
Git SHA: 10eef72f8888e43e73c96ae12879acab0dad5576

## 2026-09-24T23:02:00Z — Live Mainnet OpenAI funded; DEX sell waiting for Phantom

- Connected Phantom `Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC`. Live Mainnet RPC slot 450170159 epoch 1042: SOL lamports `10293479`, OpenAI raw `943162`, USDC raw `0`. Mint `PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF` Token-2022 9 decimals.
- Smallest Jupiter ExactIn sell with a route is 1000 raw OpenAI (amount 1 returned no routes). Quote: out `1982`, min `1963`, route Meteora DLMM x2, price impact 0. Node simulation PASS, 116224 CU, Jupiter program match, no LOCATE program id. Not a Mainnet transaction.
- Frontend Mainnet DEX lab reads those live balances. State is WAITING FOR WALLET after server-side compile+simulate. Owner must approve the Phantom popup. No signature sent.
- Fork proof `p0_cloned_mainnet_fork_proof` 24/24 local execution. `mainnetLocateDeployment` false. `mainnetLocateTransactions` false.
- SDK tests 31. Backend tests 21. Frontend checker 0.

PHASE P1 MAINNET DEX

Implementation: live balances + smallest quote + simulation + frontend waiting for wallet
Tests: sdk 31, backend 21, fork_proof 24/24, checker 0, node sell simulation PASS
Mainnet signatures: none
Outstanding blockers: owner Phantom approval for the 1000-raw OpenAI sell; buyback blocked until USDC exists after sell
Git SHA: 10eef72f8888e43e73c96ae12879acab0dad5576

## 2026-09-24T23:05:30Z — Mainnet DEX sell verified on chain

- Phantom approved. Finalized signature `2C4CND6FqBiTgPzgNQojHKa6KzL221gd2Zm4BiyP7WCRnmichUF3m9ptF9xs7pDgTVaa9GMm6eYtqmUnQMbqmuzr` slot 450171723, `err` null. Transaction includes Jupiter, does not include the LOCATE program. Not a LOCATE protocol transaction.
- Balances from finalized RPC: SOL `10293479` → `6949444` (delta `-3344035`, tx fee `367155` plus new USDC ATA rent/priority). OpenAI `943162` → `942162` (delta `-1000`). USDC `0` → `1982` (delta `+1982`, equals quoted out).
- Buyback blocked: ExactOut 1000 OpenAI no route. ExactIn of all 1982 USDC quotes 978 OpenAI, below the 1000 sold. Wallet was not funded. Artifacts: `proof/mainnet-dex/sell.json` PASS, `buyback.json` BLOCKED.
- `mainnetLocateDeployment` false. `mainnetLocateTransactions` false. `mainnetExternalDexSell` true.

PHASE P1 MAINNET DEX SELL

Implementation: real frontend + Phantom + Mainnet DEX sell verified from chain
Tests: finalized RPC getTransaction err null, raw deltas match quote
Mainnet signatures: 2C4CND6FqBiTgPzgNQojHKa6KzL221gd2Zm4BiyP7WCRnmichUF3m9ptF9xs7pDgTVaa9GMm6eYtqmUnQMbqmuzr (external DEX only)
Outstanding blockers: buyback needs more USDC than 1982 raw to reacquire 1000 OpenAI
Git SHA: 10eef72f8888e43e73c96ae12879acab0dad5576

## 2026-09-24T23:11:20Z — Buyback ExactOut/ExactIn refuse; Devnet extra venues FAIL

PHASE P1 BUYBACK REFUSE + DEVNET VENUE PROBE

What ran: Chrome BUY BACK on localhost:3010 against live Mainnet quotes. ExactOut 1000 OpenAI returned no route. ExactIn 1982 USDC quoted 978 OpenAI. Lab stayed READY, no Phantom prompt, no send. Live RPC wallet still SOL 6949444, OpenAI 942162, USDC 1982. Devnet extra-venue probe wrote proof/devnet/dex.json: Phoenix program account absent, Whirlpool and Pump AMM executable with no replica pool created, Jupiter TOKEN_NOT_TRADABLE and DLMM 6073 reused not retried. No swap sent. LOCATE Mainnet deploy remains refused.

Implementation: ExecutionLab buyback ExactOut then ExactIn with minOut 1000; quote APIs accept swapMode; backend quote forwards swapMode

Tests: sdk 31, backend 21, checker 0, fork_proof unchanged 24/24

Mainnet signatures: none new (sell remains 2C4CND6FqBiTgPzgNQojHKa6KzL221gd2Zm4BiyP7WCRnmichUF3m9ptF9xs7pDgTVaa9GMm6eYtqmUnQMbqmuzr)

Outstanding blockers: Mainnet buyback needs more than 1982 raw USDC to reacquire 1000 OpenAI; Devnet replica mint has no working DEX venue

Git SHA: 10eef72f8888e43e73c96ae12879acab0dad5576

## 2026-09-24T23:16:16Z — External Mainnet DEX sell-2 and buyback verified

PHASE P1 MAINNET DEX BUYBACK

What ran: Chrome SELL then BUY BACK on localhost:3010 with Phantom. Second sell 1000 OpenAI → 1982 USDC (wallet USDC 3964). Buyback ExactIn 3964 USDC quoted 1957 OpenAI, min 1938, chain delta +1956 OpenAI, USDC to 0. Both txs finalized, Jupiter present, LOCATE absent. Fork DEX CPI still not executed. Devnet DEX remains FAIL. LOCATE was not deployed to Mainnet.

Implementation: live frontend + Phantom + /api/dex quote-swap-send; ExactOut then ExactIn buyback with minOut 1000

Tests: sdk 31, backend 21, checker 0

Mainnet signatures: 4FmrxJKrUUaauhd7tksKFZK1xhJTFB7C6AjYq8dcVv7tnArQZY5woCEBzTeKCuKH1AbzRs3mQcwaGTKD6pVPcKSw (sell-2), 5cHQQxCByufmPazGRqKPgfdPDVJHMvCVFkz3NdutoPjrjc1p6RhboJXcjzMmQRgcQ8KoqkQNH8NJSGnpPRQZgR6F (buyback). Prior sell 2C4CND6FqBiTgPzgNQojHKa6KzL221gd2Zm4BiyP7WCRnmichUF3m9ptF9xs7pDgTVaa9GMm6eYtqmUnQMbqmuzr

Outstanding blockers: Devnet replica mint has no working DEX venue; cloned-fork DEX CPI not executable in LiteSVM without Jupiter/DLMM program dumps

Git SHA: 10eef72f8888e43e73c96ae12879acab0dad5576

## 2026-09-24T23:40:00Z — Product story on the dashboard

PHASE PRODUCT NARRATIVE

What changed: Overview now leads with “Lend the PreStock. Let someone short it.” Live Mainnet market context is labeled as not a settlement oracle. The flow is LEND, BORROW, SHORT, RETURN, SETTLE, with SHORT marked external. Short supply, active loans, and deterministic settlement sit under that. Mainnet DEX nav is Execution / Market execution. Proof and Verify group Devnet protocol, cloned Mainnet state, external DEX, and security. Execution trace links real Devnet and Mainnet receipts. Role action on the connected wallet was LEND THIS PRESTOCK because the Devnet replica balance is non-zero.

Chrome: localhost:3010 app, wallet Hbkp…TvaC connected, dOPENAI 1.485985334. Book reported no funded Devnet offers while the API status was waking. No new protocol transaction was sent.

Tests: frontend checker 0. New view files typecheck. Pre-existing AddressLookupTableAccount errors in dex swap routes remain.

Outstanding blockers: API waking, so create/take/return/claim was not re-run this step. Devnet DEX remains FAIL.

Git SHA: a8c81a3

## 2026-09-24T23:45:00Z — Devnet listing attempted from the dashboard

PHASE LENDER CREATE

What ran: Chrome create-offer for 0.005 dOPENAI, collateral 12.50 Devnet USDC, fee 0.35, term 7 days, grace 48h, expiry 48h. Wallet Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC. Simulation passed. Two Phantom approvals returned signatures that are absent on both Devnet and Mainnet: ECvDaUc1K8Ufa1DurWsfLriqMX3NmoR3jYGo6nx1RacuiHeyyvbJHrTX8Zaox9xyMbNskb4CmkrctPyYbrG4cZo and 2QZjbc5Bwj8obpXy39zkrRsjvYbofe9aTSf7ibQ2UwefPxuogzvaywtaEfqtbxumjpuhycfm3dthtzpu95nphzvq. Book remains empty. No LOCATE Mainnet transaction.

Root cause: the prepared blockhash aged out during Phantom approval, and sign-and-send used Phantom's sender instead of the app Devnet connection. A later attempt hit Devnet RPC 429 before a signature existed.

Fix: refresh the blockhash immediately before signing, keep polling until the confirmation window ends, retry one 429 on the blockhash fetch, and send the signed transaction through the app Devnet connection.

Blocker: the same wallet cannot take its own offer. Take refuses self-take. Borrow, return, and claim still need a second Devnet wallet. Devnet DEX remains FAIL.

Git SHA: a8c81a3

## 2026-09-24T23:52:00Z — Devnet offer listed from the dashboard

PHASE LENDER CREATE

What ran: same form, Phantom sign, then send through the app Devnet connection. Confirmed. err null. Slot 503713393. Signature 2PrXLPkMsdn14iqSBowcYj5oqEFkAGDoep6JtuqFxUzDNoZNReoDB32hPGCYJARYq29VzxMw67tdpNnhmkUDH4b9. Offer Gxs3bCKMnrB4RRxP8Kq4rH76TRxR7NVaKp5z143VKMHy is ACTIVE in My Offers and the Book count is 1. Amount 0.005 dOPENAI. Collateral 12.50. Fee 0.35. Term 7 days. Wallet dOPENAI balance unchanged at 1.485985334 because tokens stay with the lender until take.

Network: Devnet. Mint 9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P. Not a Mainnet LOCATE transaction.

Next: a second wallet must take. This wallet is refused as borrower of its own offer.

Git SHA: a8c81a3

## 2026-09-24T23:58:00Z — Second wallet took the Devnet offer; return simulation refused

PHASE BORROWER TAKE

Network: Devnet. Not a Mainnet LOCATE transaction. Program F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6.

Wallet: CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX (borrower). Lender remains Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC. Mint 9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P. Offer Gxs3bCKMnrB4RRxP8Kq4rH76TRxR7NVaKp5z143VKMHy. Loan vault 4HfFgpHfyqY2StzQw7voUMH9JyKyuz19ixKFag6H2RXN.

Take signature 2dv9sbvrxdZUZmP4vtdjooxDUvTjk5AG8rnQhWcyw3TqcNE5PuFcwt3PP9ApZztjP7CYFfQffHqymoE4b2MqNB3g. Slot 503715155. err null. Fee 155000 lamports.

Balances from the transaction:
- Lender dOPENAI raw 999899494 → 994899494 (delta −5000000 gross).
- Borrower dOPENAI raw 0 → 4950000 (received net 0.00495 after the 100 bps transfer fee).
- Borrower Devnet USDC raw 20000000 → 7150000 (delta −12850000 = 12.50 collateral + 0.35 fee).
- Lender Devnet USDC raw 9950000 → 10300000 (delta +350000 fee).
- Collateral account raw 12500000 (12.50) locked.

UI after take: Book count cleared. My Loans shows 1, phase RETURN READY, about 6d 23h remaining. Chrome wallet was CpTx…RkgX.

PHASE RETURN

Simulation only. No return transaction was sent. Custom 1 — Program log: Error: insufficient funds. Borrower holds raw 4950000. Required return gross is about 0.005051. Shortfall about 0.000101. The Token-2022 fee makes the received net smaller than the gross that must be sent back. Devnet DEX remains FAIL, so nothing on Devnet fills that shortfall. Claim is not reachable in this session: term is 7 days plus 48h grace, and this wallet is the borrower.

Display fix in the same step: Token-2022 jsonParsed uiAmountString reported 0.007356366 for raw 4950000. The sidebar, create form, overview role check, and return drawer now use raw amount and decimals. Fee lines show six decimals so 0.00495 is not rounded to 0.005. Return copy no longer says the shortfall is filled at market.

Next: return still needs the gross shortfall from a real venue or an already-held balance. Claim waits for maturity plus grace. Do not mark Devnet DEX as pass.

Git SHA: a8c81a3

## 2026-09-25T00:10:00Z — Short claim term is available; lender wallet is not selected

PHASE CLAIM PREP

The deployed Devnet program was built with the devnet feature. Minimum term is 60 seconds. Minimum grace is 30 seconds. Create offer now has a 1 MIN choice that sends termSecs 60 and graceSecs 30 through the existing create_offer instruction. Book, My Offers, and the take drawer format those durations from the chain values instead of rounding them up to 1 day or 0 hours.

No new transaction. Phantom is still CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX. That wallet holds raw 4950000 dOPENAI and 7.15 Devnet USDC. It cannot list the short offer because it does not hold a spare balance, and it cannot claim the open loan because it is the borrower. The lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC is not the selected Phantom account. The extension popup cannot be opened from this browser session.

Return on loan 4HfFgpHfyqY2StzQw7voUMH9JyKyuz19ixKFag6H2RXN remains unsent. Simulation: Custom 1, insufficient funds. Held 0.00495. Required gross about 0.005051. Devnet DEX remains FAIL.

Sidebar now shows both balances from raw amounts: dOPENAI 0.00495, USDC 7.15.

Next: select the lender account in Phantom, list a 1 MIN offer, take it from CpTx, refuse the early claim, then claim after 60 seconds plus 30 seconds of grace.

Git SHA: a8c81a3

## 2026-09-25T00:20:00Z — Live market prices render when the offer API is stale

PHASE MARKET CONTEXT

The offer API returned STALE_DATA with null prices, so the dashboard said market data was unavailable. The mark batch now returns an object with markPrice, and the local market proxy treated that as empty. The proxy reads both a bare number and markPrice. The dashboard publishes those prices before it waits on the offer API.

Chrome on localhost:3010 showed OpenAI reference $1,023.61, market $1,332.10, premium +30.1%. No new chain transaction. Phantom remains CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX. Return and claim are unchanged: insufficient gross for return, and the lender account is not selected for a 1 MIN claim loan.

Git SHA: a8c81a3

## 2026-09-25T00:25:00Z — One-minute offer listed; early claim refused

PHASE LENDER CREATE

Network: Devnet. Wallet Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC. Mint 9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P.

Signature 2ocNgsJrwtCwcR65AXeqQc83K1DX6NoEeC5KedD9a1ZLSZM2QWorVcceemNZJkdqquLtNcJkNhp3L5LfAYiSMwgC. Slot 503722504. err null. Instruction CreateOffer. Offer 96RP66nAg4E5uZYmZyMs2JCmEp5KgsTUbz1Suqq5RPC7 is ACTIVE. Amount 0.001 dOPENAI. Collateral 1.00 Devnet USDC. Fee 0.05. Term 60 seconds. Grace 30 seconds. Listing expiry 48 hours. Lender dOPENAI stayed 0.994899494 because tokens stay in the wallet until take. Devnet USDC stayed 10.3.

PHASE EARLY CLAIM

Loan 4HfFgpHfyqY2StzQw7voUMH9JyKyuz19ixKFag6H2RXN. Simulation only. No claim transaction was sent. Result ClaimRefusedNotMatured. About 6d 23h remained before maturity. The claim button stayed disabled.

Next: switch Phantom to CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX and take offer 96RP66nAg4E5uZYmZyMs2JCmEp5KgsTUbz1Suqq5RPC7. Collateral plus fee is 1.05 Devnet USDC. After take, wait 60 seconds plus 30 seconds of grace, switch back to the lender, and claim.

Git SHA: a8c81a3

## 2026-09-25T00:19:16Z — Borrower took the one-minute offer

PHASE BORROWER TAKE

Network: Devnet. Borrower CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX. Lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC. Offer 96RP66nAg4E5uZYmZyMs2JCmEp5KgsTUbz1Suqq5RPC7. Mint 9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P.

Signature 45Yj8EMD82v8oLaMt36f6gL8Sz8UGCik1y5dNbzsGK7MPy2AL2myqpubGDmr56ifyYAHdQMi2yaoavyajenzEjUJ. Slot 503724179. err null. Block time 1790295556 (2026-09-25T00:19:16Z).

Balances:
- Lender dOPENAI raw 994899494 → 993899494 (delta −1000000 gross).
- Borrower dOPENAI raw 4950000 → 5940000 (delta +990000, received net 0.00099).
- Borrower Devnet USDC raw 7150000 → 6100000 (delta −1050000 = 1.00 collateral + 0.05 fee).
- Lender Devnet USDC raw 10300000 → 10350000 (delta +50000 fee).
- Collateral account FU7wNF9W4pCa3d8syBTHcZfMNNo5aDTUeg5RRd6jaHD6 raw 1000000.

Claim is allowed after block time plus 60 seconds plus 30 seconds of grace: 2026-09-25T00:20:46Z. The borrower wallet was still selected at confirmation, so the lender must be selected again before claim.

Git SHA: a8c81a3

## 2026-09-25T00:21:00Z — Short loan is claimable; lender wallet is not selected

PHASE CLAIM WINDOW

The grace window for offer 96RP66nAg4E5uZYmZyMs2JCmEp5KgsTUbz1Suqq5RPC7 passed. My Loans on CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX shows loan FU7wNF9W4pCa3d8syBTHcZfMNNo5aDTUeg5RRd6jaHD6 as CLAIMABLE, with next action await lender claim. No claim transaction was sent. Phantom is still the borrower.

The card had labeled that loan SETTLED and shown grace as 0.0083 hours. CLAIMABLE now stays claimable, and grace renders as 30S.

Next: select Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC and claim loan FU7wNF9W4pCa3d8syBTHcZfMNNo5aDTUeg5RRd6jaHD6. Collateral to claim is 1.00 Devnet USDC.

Git SHA: a8c81a3

## 2026-09-25T00:28:00Z — Lender claimed the one-minute loan

PHASE CLAIM

Network: Devnet. Wallet Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC. Loan FU7wNF9W4pCa3d8syBTHcZfMNNo5aDTUeg5RRd6jaHD6. Offer 96RP66nAg4E5uZYmZyMs2JCmEp5KgsTUbz1Suqq5RPC7. Borrower CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX. Mint 9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P.

The loans API returned 500 because its Devnet RPC call was rate limited, so the My Loans screen could not list the loan. A direct account read still saw the loan. Simulation of claim_collateral returned err null. Phantom signed. The signed transaction was sent on Devnet.

Signature 44tmkCp24ctT6dYc4xK4Q1UDQ4BtRCgjQ5QXVMh8VxA5pCn3sKkZjwyurGrH9ZHurdB4uBiW8CpHsWrD5dtuuE5C. Slot 503728891. err null.

Devnet USDC:
- Collateral account FU7wNF9W raw 1000000 before, account absent after.
- Lender raw 10350000 → 11350000 (delta +1000000, the 1.00 collateral).

Not a Mainnet LOCATE transaction. The 7-day loan 4HfFgpHfyqY2StzQw7voUMH9JyKyuz19ixKFag6H2RXN remains active and was refused early as ClaimRefusedNotMatured. Return of that loan remains blocked by the Token-2022 gross shortfall. Devnet DEX remains FAIL.

Git SHA: a8c81a3

## 2026-09-25T00:38:00Z — Borrower returned the 7-day loan

PHASE RETURN

Network: Devnet. Borrower CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX. Lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC. Loan 4HfFgpHfyqY2StzQw7voUMH9JyKyuz19ixKFag6H2RXN. Mint 9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P.

The borrower held raw 5940000 after the one-minute loan delivered 990000 net. Required return gross was 5050506. The wallet covered it. No Devnet DEX fill was used. Simulation passed. Phantom signed.

Signature 4FUqtNoxVjN3E2tJoSKeN8K9awDV9fU1GQ5AZH9yfKbS9FhULGYRgK4pB4zC7nwsGroSbHXv2n4uGp1JNshYDa7t. Slot 503731052. err null.

Balances:
- Borrower dOPENAI raw 5940000 → 889494 (delta −5050506 gross).
- Lender dOPENAI raw 993899494 → 998899494 (delta +5000000, the required net).
- Collateral account 4HfFgpHfyqY2StzQw7voUMH9JyKyuz19ixKFag6H2RXN raw 12500000 before, absent after.
- Borrower Devnet USDC raw 6100000 → 18600000 (delta +12500000, the 12.50 collateral).

My Loans reads loan accounts from the Devnet RPC when the loans API returns none. Devnet DEX remains FAIL. Not a Mainnet LOCATE transaction.

Git SHA: a8c81a3

## 2026-09-25T00:45:00Z — Settled loans stay visible from receipts

PHASE UI

The return receipt is verified by the API: kind loan_returned, commitment finalized, grossRaw 5050506, netReceivedRaw 5000000, collateralReleased 12500000. The claim receipt for the 60-second loan is also finalized.

Closed loan accounts disappear from getProgramAccounts. My Loans now adds terminal receipts for the connected wallet. Open accounts still win when both exist. The return receipt has no upfront fee and no term, so those fields stay unlabeled instead of showing zero. The claim row uses the paired take receipt, including the 30-second grace.

Chrome, borrower CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX: dOPENAI 0.000889494, Devnet USDC 18.6. RETURNED lists only 4HfFgpHfyqY2StzQw7voUMH9JyKyuz19ixKFag6H2RXN. CLAIMED lists FU7wNF9W4pCa3d8syBTHcZfMNNo5aDTUeg5RRd6jaHD6. Devnet DEX remains FAIL. Not a Mainnet LOCATE transaction.

Git SHA: a8c81a3

## 2026-09-25T00:50:00Z — Pushed the lifecycle UI

PHASE GIT

Pushed main a8c81a3..cb0926e. The commit records the dashboard lifecycle, the receipt-backed settled loans, and the later wallet return and claim. Devnet DEX remains FAIL. Not a Mainnet LOCATE transaction.

Git SHA: cb0926e

## 2026-09-25T01:05:00Z — Proof page is four sections

PHASE PROOF

The public proof page repeated the same artifacts as Layer 2, Layer 3, a flat results list, and a second signature list. Those duplicates are gone. The page is now A Devnet protocol, B cloned Mainnet state, C external Mainnet DEX, D security and consistency. Devnet DEX stays the recorded failure. mainnetLocateDeployment and mainnetLocateTransactions stay false. `GET /proof` returned 200 and the HTML contains the four headings.

A missing Devnet token account still counts as zero. An RPC error no longer counts as zero, so the overview does not pick LEND or BORROW from a failed read. The execution screen label is EXTERNAL MAINNET DEX.

Not pushed in this step.

Git SHA: e33133b

## 2026-09-25T01:10:00Z — In-app proof shows the recorded artifacts

PHASE PROOF

The Verify view’s four cards were descriptions only. They now render the proof JSON: Devnet create/take/return/claim and early-claim code 6015, fork 24/24, OpenAI and Neuralink mints, external DEX sell and buyback with locateProtocol false, Devnet DEX FAIL, mainnetLocateDeployment false, mainnetLocateTransactions false, local validator 42/42, functional 17, security 14, mutation 10, replay 45000.

Chrome on the borrower wallet showed those lines, plus the later wallet return and claim receipts. No new transaction.

Not pushed in this step.

Git SHA: e33133b

## 2026-09-25T01:15:00Z — Closed offers come from lender receipts

PHASE OFFERS

Taken and cancelled offers leave no account, so My Offers only showed live listings. Closed offers for the connected lender now come from finalized receipts when the create or take receipt includes amount, collateral, and fee. Open offers stay ACTIVE and are not duplicated.

Checked against lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC receipts: Gxs3bCKMnrB4RRxP8Kq4rH76TRxR7NVaKp5z143VKMHy SETTLED amount 5000000 collateral 12500000 fee 350000 term 604800; 96RP66nAg4E5uZYmZyMs2JCmEp5KgsTUbz1Suqq5RPC7 SETTLED amount 1000000 collateral 1000000 fee 50000 term 60; 8vGyHaW4gQciy2ZqYBktBRyW7vHfDmWAji57UUVCYZhJ CANCELLED from its own create receipt, same 5000000 / 12500000 / 350000.

Chrome wallet is the borrower CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX. My Offers correctly says NO OFFERS HERE. Phantom was not switched to the lender. No new transaction. Devnet DEX remains FAIL.

Not pushed in this step.

Git SHA: e33133b

## 2026-09-25T01:20:00Z — One lifecycle on Overview, lender offers visible

PHASE UI

Overview now has one HOW IT WORKS chain: lender to offer, collateral to borrower, external sell, buy back, return, then collateral back. The default path is offer, take, maturity, grace, claim, USDC to the lender.

Phantom is the lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC. Sidebar dOPENAI 0.998899494 and Devnet USDC 11.35, matching the post-return balances. Primary action is LEND THIS PRESTOCK. Short supply says NO OPEN OFFERS. My Offers shows Gxs3 SETTLED 0.005 / $12.50 / $0.35, 96RP SETTLED 0.001 / $1.00 / $0.05 / 60S, and 8vGy CANCELLED. My Loans shows 4HfF as YOU LENT RETURNED and FU7w as YOU LENT CLAIMED. No new transaction.

Not pushed in this step.

Git SHA: e33133b

## 2026-09-25T01:25:00Z — Book is empty, issuer brand removed from the shell

PHASE UI

Lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC on the Book sees “No open offers on Devnet right now.” No sample rows. Sidebar now says the replica is not a Mainnet PreStock. The proof page names the failed Devnet venue as an execution benchmark and a pool venue, not by product name. No new transaction. Devnet DEX remains FAIL.

Not pushed in this step.

Git SHA: e33133b

## 2026-09-25T01:30:00Z — Pushed the receipt-backed lifecycle

PHASE GIT

Pushed main e33133b..d350504. The commit includes the four-section proof page, receipt-backed closed loans and offers, the single how-it-works chain, and the lender Chrome check. Devnet DEX remains FAIL. mainnetLocateDeployment and mainnetLocateTransactions stay false. The local-validator, fork, replay, functional, security, and mutation suites were not re-run; the program instructions were not changed.

Git SHA: d350504

## 2026-09-25T01:35:00Z — SDK replay and backend tests re-run

PHASE REGRESSION

`npm test` in sdk: 3 files, 31 tests passed in 3.28s. The cross-runtime replay test still requires 10,000 epoch-fee, 10,000 gross-for-net, 10,000 schedule, 10,000 collateral, and 5,000 PDA vectors.

`npm test` in backend: 5 files, 21 tests passed in 3.61s.

The fork matrix, local-validator suite, functional, security, and mutation program suites were not re-executed. The five LOCATE instructions were not changed. Devnet DEX remains FAIL. No new chain transaction.

Not pushed in this step.

Git SHA: 7a0b8ba

## 2026-09-25T01:40:00Z — Functional, security, and mutation re-run

PHASE REGRESSION

`cargo test -p locate --test functional --test security --test mutation` exited 0. functional 17 passed, 0 failed, 0.79s. security 14 passed, 0 failed, 0.59s. mutation 10 passed, 0 failed, 0.48s. Compile finished in 1m 16s. These are local LiteSVM runs, not Mainnet transactions.

The fork matrix and the local-validator suite were not re-executed. The five LOCATE instructions were not changed. Devnet DEX remains FAIL.

Not pushed in this step.

Git SHA: eb1f4ea

## 2026-09-25T01:45:00Z — Cloned Mainnet fork proof re-run

PHASE REGRESSION

`cargo test -p locate --test fork_proof -- --nocapture` exited 0. `p0_cloned_mainnet_fork_proof` passed in 5.45s. The manifest still reads 24 passed, 0 failed, 24 total. Program sha256 prefix ade3240160bfb905. This is local execution against cloned Mainnet account bytes, not a Mainnet transaction.

The test rewrote failure-matrix logs with different compute units and a new missing-account address. Those files were restored. The pass/fail result did not change. The local-validator suite was not re-executed. Devnet DEX remains FAIL.

Not pushed in this step.

Git SHA: 9ced578

## 2026-09-25T01:55:00Z — Local validator suite re-run

PHASE REGRESSION

`node scripts/local-validator.mjs` exited 0. Validator `http://172.21.142.55:18999`. Result `{"passed":42,"failed":0,"total":42}`. Local mint at the pinned Devnet USDC address. Not Mainnet USDC and not a Mainnet transaction. Program sha256 stayed `698862354901ab1a262c378fcac6c424ee349bf8fa229e496e4ff933db56abc2`.

The script rewrote `proof/local-validator/suite.json` with a new ephemeral mint and different compute units. That file was restored. The pass count did not change. Devnet DEX remains FAIL. The five LOCATE instructions were not changed.

Not pushed in this step.

Git SHA: f36b557

## 2026-09-25T02:05:00Z — User-facing venue names removed

PHASE COPY

Comments and error text that named the market catalog host or the swap program were changed to “live market” and “execution benchmark.” The catalog request still uses the existing host, because that is how live prices are fetched. The program-id mismatch code is unchanged so the existing guard test still matches. Devnet DEX remains FAIL. No new transaction.

Not pushed in this step.

Git SHA: 57e44d9

## 2026-09-25T04:45:00Z — App reads as one lifecycle

PHASE PRODUCT

Navigation is Market, Positions, and Proof. Market is the Devnet book. Positions combines lending and borrowing. The loan page leads with a settlement rail whose steps come from receipt signatures. A missing receipt stays waiting. The Devnet short and buyback steps stay blocked, because the Devnet venue result is FAIL and those Mainnet signatures belong to a different surface. One environment control explains that dOPENAI is a Devnet replica. Display type is Geist. The serif accent is gone. The blue accent stays. Lookup-table accounts on the external swap path are typed, so that compile error is gone. Offer rows from the API and from receipts share one string record before they reach the screen.

Not a new instruction. Devnet DEX remains FAIL. Mainnet deployment remains false. Fork short-leg, source verification, and pipeline tests are still open.

Pushed as 3a0c397.

## 2026-09-25T05:10:00Z — Wallet re-check and four proof layers

PHASE EXECUTION

Before Phantom is asked to sign, the client re-reads the accounts in the instruction and simulates again. If the accounts changed, the refusal is TERMS_CHANGED and no signature is requested. Program errors map to typed refusals, including NOT_CLAIMABLE_YET for code 6015. After confirmation, token balance deltas are read from the transaction. Return, claim, cancel, and take all show the same six steps. Proof opens as four layers, each with a headline, one metric from the proof files, and expandable lines.

Devnet DEX remains FAIL. Mainnet deployment remains false. The five instructions were not changed.

Pushed as 72d0b4a.

## 2026-09-25T05:20:00Z — Public proof matches the four layers

PHASE PROOF

The public proof page now opens as the same four layers as the app: Devnet lifecycle, cloned Mainnet state, external market, and replay coverage. Each layer shows one metric from the artifact files, and the signatures, slots, and hashes stay behind the disclosure. The open items still say the source build is not verified, Devnet DEX is FAIL, and Mainnet deployment is false. Refusal mapping has a 6-case check. A loan’s advanced details show the upfront fee from the receipt in USDC units.

Pushed as dc2bbea.

## 2026-09-25T05:30:00Z — Local validator proof no longer rewrites itself

PHASE PROOF

The local validator writer now records a localnet label, a relative program path, and an ephemeral mint marker instead of the validator address and a fresh mint pubkey. Refusal logs drop compute-unit counts, and the grace-wait duration is not stored. The committed suite was normalized the same way. Pass count stays 42/42. A later run will not dirty the artifact when only those fields change.

The short leg on cloned Mainnet state is still not executed. Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as 9e4d5d2.

## 2026-09-25T05:40:00Z — Listing uses the same six steps

PHASE EXECUTION

Create offer now shows Prepare, Review, Simulate, Approve, Confirm, and Verify, the same sequence as take, return, claim, and cancel. The account re-check and the post-confirmation token deltas apply here too, because listing goes through the same prepared transaction. There is no cloned pool fixture, so the short leg on cloned Mainnet state was not executed and is not marked passed.

Devnet DEX remains FAIL. Mainnet deployment remains false. The five instructions were not changed.

Pushed as 3c13093.

## 2026-09-25T05:50:00Z — Wallet amounts label scaled balances

PHASE PRODUCT

The Devnet wallet panel uses the shared amount formatter. When the RPC scaled amount differs from the raw integer divided by decimals, the panel shows the scaled figure and labels it. A failed balance read says unavailable instead of a number. solana-verify is not installed on this machine, so source correspondence stays unverified.

Devnet DEX remains FAIL. Mainnet deployment remains false. The short leg on cloned Mainnet state is still not executed.

Pushed as 3de36f3.

## 2026-09-25T06:05:00Z — OpenAI USDC pool account cloned

PHASE FORK

The Mainnet pool account `4HTy7aTjPm5PTSEws2yWRDPX6gjWM6sC2dV5mv9u8JsH` was read at slot 450211911 and saved as `tests/fixtures/mainnet/openai_usdc_pool.json`. It is 904 bytes, owned by the DLMM program, sha256 `34b099babce812026d0cae72f11150a074e9034854d11e2fab8b1bf8bb2b553b`. The swap program and bin arrays are not in the fixture, so no CPI was sent and the short leg is not passed. The fork note says that explicitly.

Devnet DEX remains FAIL. Mainnet deployment remains false. The five instructions were not changed.

Pushed as ff48b0e.

## 2026-09-25T06:15:00Z — Pool reserves cloned

PHASE FORK

The pool account names its two reserves. Both were read at slot 450212574. OpenAI reserve `CiGhjdnp4ARJt79ZRzCW72AQuQRMteKymCR4D6wsTFdB` is 191 bytes. USDC reserve `9d3aURGUgCkj3bRFYtnyhQ4D37VgGFWwGUoS5DziR4RF` is 165 bytes. Hashes match the saved fixtures. The DLMM program data account is 2,229,821 bytes and was not stored. Bin arrays were not stored. No swap was executed.

Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as ef6a328.

## 2026-09-25T06:25:00Z — Active bin array cloned

PHASE FORK

The pool header has active id 145 and bin step 50. That maps to bin array index 2, account `By1xEHvXdYq2obytSAd3HXeXyrnoopWqdijggUYHCeN5`, read at slot 450213158. The account is 10,136 bytes and the saved sha256 matches. The swap program remains about 2.2 MB and is not stored. No swap was executed.

Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as ca846d4.

## 2026-09-25T06:35:00Z — Swap program ELF cloned

PHASE FORK

The DLMM program data account `HZcJwcJ2njPDxZtpPoKnF8v2w9QAx2rS7TdJPSRkbEhu` was read at slot 450213515. The ELF starts at byte 45 and is 2,229,776 bytes. It is saved as `tests/fixtures/mainnet/dlmm.so` with sha256 `d296c6771cec945601027613ca637c1be6721044c5859009d41c453477844c1f`. No swap instruction was built or executed.

Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as 1316602.

## 2026-09-25T07:20:00Z — Local swap on the cloned pool

PHASE FORK

`cloned_pool_swap_attempt` loaded the cloned pool, both reserves, the active bin array, the oracle, and the swap program, then sent swap2 for 1000 raw OpenAI. The local machine credited 2013 raw USDC. `dexSellExecution` is true in `proof/mainnet-fork/dex-attempt.json` and `lifecycle.json`. Buyback was not run. This was not a mainnet transaction. Fork suite: 2 passed.

Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as 4574c0e. The history line itself was recorded in b0bf04e.

## 2026-09-25T07:30:00Z — Local buyback on the cloned pool

PHASE FORK

After the local sell of 1000 raw OpenAI for 2013 raw USDC, the same test swapped those 2013 raw USDC back. The OpenAI balance moved from 999999999000 to 999999999963. `dexBuybackExecution` is true in `proof/mainnet-fork/dex-buyback.json`. This was not a mainnet transaction.

Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as 57c9f1b. The history line itself was recorded in 02f2dce.

## 2026-09-25T07:45:00Z — Stable fork logs and pipeline checks

PHASE PROOF

The fork writer now drops compute-unit counts and fresh account ids from saved logs. Two consecutive runs of `p0_cloned_mainnet_fork_proof` wrote the same `failure-matrix.json`. Pass count is unchanged.

`pipeline.ts` checks the pre-sign account stamp and pairs token balances. A moved stamp is `TERMS_CHANGED`. A missing post balance is recorded as 0. `node --experimental-strip-types src/lib/locate/pipeline.test.ts` printed `pipeline 5/5`. Frontend `tsc --noEmit` passed.

Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as d99c3ed. The history line itself was recorded in b3612d1.

## 2026-09-25T07:55:00Z — Loan fee uses the take record

PHASE POSITIONS

The gross to return and the transfer-fee line now use the fee in basis points stored on the loan at take. A missing receipt field stays blank. It is not filled from the asset card and it is not shown as zero. The upfront fee still comes from the take receipt. `pipeline 10/10`. Frontend `tsc --noEmit` passed.

Devnet DEX remains FAIL. Mainnet deployment remains false. solana-verify was not run.

Pushed as 9ab911d. The history line itself was recorded in b995d99.

## 2026-09-25T08:10:00Z — Fork swap shown on the proof page

PHASE PROOF

The cloned-state layer now reads `dexSellExecution` and `dexBuybackExecution` from the fork lifecycle. Those lines stay on the local-execution layer. The Mainnet DEX layer is unchanged. `node scripts/verify-source-build.mjs` exited 2. `verified` is false. `solana-verify` is not installed, and Docker in WSL did not start. Frontend `tsc --noEmit` passed.

Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as 0211721. The history line itself was recorded in 14c7ba7.

## 2026-09-25T08:20:00Z — solana-verify build failed on the image toolchain

PHASE PROOF

`solana-verify` 0.5.2 ran `build --library-name locate` in the Solana 3.0.1 image `solanafoundation/solana-verifiable-build@sha256:b970a392e4ad5170680f7d1b37b1f25c75675f095e8309b5cb0a7d18bc314eec`. Cargo inside that image is 1.84.0. It stopped on `block-buffer` 0.12.1 because that crate needs Cargo edition 2024. `verified` stays false.

Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as b25d449. The history line itself was recorded in e8fca59.

## 2026-09-25T09:25:00Z — Verifier image set to the installed Solana CLI

PHASE PROOF

`solana-verify` 0.5.2 is the current crates.io release. Its image map includes Solana 4.1.2 at digest `sha256:2e0b78f44ee76612e9260c7c988570c5e14de6fbd93e0ab07115ec7054473b4f`. Cargo on that image PATH is 1.95.0. The installed CLI is `solana-cli 4.1.2`. The workspace metadata now selects that image instead of the lockfile crate 3.0.1, whose image Cargo is 1.84.0. Dependencies were not changed. `verified` stays false until two builds produce the same executable hash.

Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as d64ac63.

## 2026-09-25T03:42:00Z — Reproducible build and Devnet ELF match

PHASE PROOF

`solana-verify` 0.5.2 `build --library-name locate` used image `solanafoundation/solana-verifiable-build@sha256:2e0b78f44ee76612e9260c7c988570c5e14de6fbd93e0ab07115ec7054473b4f` (Solana 4.1.2, container Cargo 1.95.0, platform-tools v1.54). The first run compiled, then `find` under `target/deploy` returned several `locate.so` copies and the tool exited 2. Those extra copies were moved aside. Two following builds wrote the same `target/deploy/locate.so`: 359712 bytes, sha256 `ade3240160bfb905cfad0fcb98df5b98c688bc44044bf059ee1f776ec8f570f5`. The tool digest, which drops trailing zero bytes, was `1bd7ae124c8374a6e020d4d682c34d2497681126e78ac712e1aecb799d2671cc` both times. Source commit `51311195a77927f318f05da8196fc9b92a4904c8`. Recorded in `proof/verification/reproducible-build.json`.

The same image built `--features devnet` to `target/devnet-feature-verify/locate.so`, sha256 `698862354901ab1a262c378fcac6c424ee349bf8fa229e496e4ff933db56abc2`, 359712 bytes. `solana program dump` of `F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6` on Devnet is 395683 bytes. The first 359712 bytes match that ELF. The remaining 35971 bytes are zero allocation padding. Programdata `DSbRjFotfkpDqdKNPQ9dFshpTi5cg57bXL72VRxM7Vhh`, ELF offset 45. Recorded in `proof/verification/devnet-deployed-binary.json`.

`verified` stays false. This is not a Mainnet verified program. Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as 5a1e1b8.

## 2026-09-25T03:51:00Z — Market split and suite rerun

PHASE MARKET

The market page now keeps the live Mainnet OpenAI price in its own card. Devnet offers sit under a separate short-supply heading and are labeled as the dOPENAI replica. An empty book says 0 borrowable. The public proof page reads the Devnet ELF payload hash and no longer treats a missing field as the executable hash. Confirmed receipts stay pending until finalized. A claim whose collateral delta does not match is rejected.

SDK 31/31. Backend 21/21, then receipt checks 5/5. Pipeline 11/11. Refusals 9/9. Program suites: fork 2/2, functional 17/17, security 14/14, mutation 10/10, replay writer passed. Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as 75a6866.

## 2026-09-25T03:56:00Z — Local validator rerun

PHASE VALIDATION

`node scripts/local-validator.mjs` exited 0. The suite printed `{"passed":42,"failed":0,"total":42}`. Saved logs now drop the compute-unit counts that still differed between runs. Devnet DEX remains FAIL. Mainnet deployment remains false.

Pushed as 4a09721.

## 2026-09-25T04:35:00Z — Quote age is checked before the wallet

PHASE EXECUTION

The external-market quote gate was stamping the quote as fresh at the moment of the check, so an old quote could not expire. It now uses the quote response time, and the same check runs again immediately before the wallet is asked to sign. A quote older than 20 seconds returns STALE_QUOTE and is not signed. Position cards now lead with the next action (Return, Claim, or Claim opens after grace) instead of a raw fee sentence. No new protocol instruction. No Mainnet LOCATE deployment. Devnet DEX remains FAIL.

Files: frontend/src/components/locate/app/views/ExecutionLab.tsx, frontend/src/components/locate/app/views/MyLoans.tsx, frontend/src/lib/locate/loanPhase.ts.

Pushed as c690a88.

## 2026-09-25T04:40:00Z — Settlement rail uses receipt evidence

PHASE POSITIONS

A loan step is marked done only when its receipt signature is present. A missing receipt says Not verified and has no transaction link. Maturity and grace follow the clock and do not reuse the take signature. The default path is Taken, Maturity, Grace, Claimable, Claimed. The return path adds Collateral released only when the return receipt exists. Short and buyback stay blocked on a Devnet loan. `node sdk/tools/check-frontend.mjs frontend` printed frontend check passed. proofCenterIntegrity and productionDeployment stay false. Devnet DEX remains FAIL. Mainnet deployment remains false.

Files: frontend/src/components/locate/app/views/LoanDetail.tsx, proof/EXECUTION_STATUS.json.

Pushed as 352ddbc.

## 2026-09-25T04:42:00Z — Production build passes on Windows

PHASE BUILD

`npm run build` compiled, then failed because the script called `cp`, which this shell does not provide. The copy of the standalone static files and public folder now uses Node. A second `npm run build` exited 0. Routes include `/` and `/proof`. The recorded Devnet return-cycle and claim-cycle signatures were re-read as finalized with `err` null, and the return transaction includes the LOCATE program. productionDeployment stays false. Devnet DEX remains FAIL. Mainnet deployment remains false.

Files: frontend/package.json.

Pushed as ab38f30.

## 2026-09-25T04:50:00Z — Market action and amount labels

PHASE PRODUCT

The market empty state now has a LEND action. The wallet strip shows the Token-2022 wallet amount and, when it differs, the chain amount. The lend form uses the chain amount and says so. Proof opens on the four result lines. Receipt signatures stay inside Receipts. Chrome on localhost:3010 showed wallet 1.484499199 and chain 0.998899494 for Hbkp…TvaC, and Proof showed 28 receipts without listing signatures first. `node sdk/tools/check-frontend.mjs frontend` printed frontend check passed.

UTC 2026-09-25T04:50:00Z. Network: Devnet read. Wallet role: lender, connected, no new signature. Mint: dOPENAI 9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P. Amount: none. Signature: none. Slot: none. Before balance: chain 0.998899494, wallet 1.484499199. After balance: unchanged. Delta: 0. Program: F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6. Route: none. Result: labels match one account. Failure: none. Root cause: the scaled wallet amount and the chain amount were shown as if they were different balances, and proof listed signatures in the first view. Fix: label both amounts and collapse receipts. Remaining blocker: fresh Devnet create, take, return, and claim with owner approval; proofCenterIntegrity; productionDeployment. Next action: open the real wallet flow for a short Devnet offer. Devnet DEX remains FAIL. Mainnet deployment remains false.

Files: frontend/src/components/locate/app/AppShell.tsx, frontend/src/components/locate/app/views/Book.tsx, frontend/src/components/locate/app/views/CreateOffer.tsx, frontend/src/components/locate/app/views/Verify.tsx.

Commit 00c7c60 contains that change. Its subject line was left over from the previous message file. Pushed through afd4e63.

## 2026-09-25T04:58:00Z — Devnet offer listed from the connected wallet

PHASE EXECUTION

Chrome on localhost:3010, lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC. Simulated, then Phantom approved. Signature 2LmWm8igo7LfDKWeKpQmR6o9ZZfjGHCZ5bBzuMSh18fqVB76tvLko9DWm938Ryz6wTjeKa1V8a9vBM5ZRguCBSv3, slot 503824247, finalized, err null. Program F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6, instruction CreateOffer. Offer Fp68AVmuxwC8xmtSXmq55bEZLXFpJoHTZGQBaSJTJbZ9. Mint 9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P. Chain amount before 998899494, after 998899494, delta 0. Delegate set for 1000000 raw. Collateral 1000000, fee 100000, term 60, grace 30. Receipt POST returned verified, kind offer_created. Market shows 0.001 borrowable as this wallet’s listing. The visible status line was CSS-uppercased, so a copied signature would not match the chain. Signatures in the confirm line now keep their original case.

Take, return, and claim still need the borrower wallet CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX. Reconnecting Phantom returned the lender. Devnet DEX remains FAIL. Mainnet deployment remains false.

Files: frontend/src/components/locate/app/views/CreateOffer.tsx, frontend/src/components/locate/app/drawers/TakeOfferDrawer.tsx, frontend/src/components/locate/app/drawers/BuyReturnDrawer.tsx, frontend/src/components/locate/app/drawers/CancelOfferDrawer.tsx, frontend/src/components/locate/app/drawers/ClaimDrawer.tsx.

Pushed as fe28430.

## 2026-09-25T05:08:00Z — Devnet take and return

PHASE EXECUTION

Borrower CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX took offer Fp68AVmuxwC8xmtSXmq55bEZLXFpJoHTZGQBaSJTJbZ9. The first approve returned TERMS_CHANGED and was not signed. A fresh simulation passed and Phantom approved. Take signature 61NgvpBToGqvHpwkrbA9oGProjZG5CjioL1m1TGRBWQF8c9tsaSJScPTuDY5iwceS7HJvMMKrDk3Mw87aE5xLfcT, slot 503826986, finalized, err null. Lender dOPENAI 998899494 to 997899494. Borrower dOPENAI 889494 to 1879494 (net 990000). Borrower USDC 18600000 to 17500000. Lender USDC 11350000 to 11450000 (fee only). Receipt loan_taken verified. Loan APjJDEXXhf4jLvz3D8Xmq1FY7fSvNXG4X3reeRnunf9y.

Return during grace. Gross shown 0.00101. Signature 5PHRuUXGaj5bKWybJYt9EwUxBbmBa1GjYviM1MWDTnW39kQfegS9ZtvpPivDtYeMyCCLs2szHpKfRadjDgzFKHHP, slot 503827662, finalized, err null. Borrower dOPENAI 1879494 to 869392 (gross 1010102). Lender dOPENAI 997899494 to 998899494 (net 1000000). Borrower USDC 17500000 to 18500000 (collateral 1000000 released). Receipt loan_returned verified, feeBps 100. Early claim and claim were not run on this loan because it was returned. They still need a second short offer and the lender wallet. Chain audit of 12 signatures failed 0. proofCenterIntegrity stays false. Devnet DEX remains FAIL. Mainnet deployment remains false.

Files: scripts/audit-proof-chain.mjs, proof/verification/chain-audit.json.

Pushed as 6eea78c.

## 2026-09-25T05:09:00Z — Program suites rerun

PHASE VALIDATION

SDK 31/31. Backend 23/23. Frontend `tsc --noEmit` exited 0. Pipeline 11/11. Refusals 9/9. `node sdk/tools/check-frontend.mjs frontend` printed frontend check passed. `cargo test` functional 17/17, security 14/14, mutation 10/10, fork_proof 2/2, fee_prop 5/5, exit 0. No new signature. Borrower wallet was still connected, so early claim and claim were not started. Local validator and the 45000 replay were not part of this run. Devnet DEX remains FAIL. Mainnet deployment remains false.

## 2026-09-25T05:13:00Z — Local validator and replay

PHASE VALIDATION

`node scripts/local-validator.mjs` exited 0 and printed `{"passed":42,"failed":0,"total":42}`. `cargo test --test replay_gen` passed. `proof/replay/manifest.json` total remains 45000. The validator rewrote `tests/fixtures/local/usdc.json`; those bytes were restored and not committed. No new signature. Devnet DEX remains FAIL. Mainnet deployment remains false.

## 2026-09-25T05:14:00Z — Production build

PHASE BUILD

`npm run build` in `frontend` exited 0. Routes include `/` and `/proof`. The local app at localhost:3010 still rendered after the build. productionDeployment stays false. The connected wallet is still the borrower, so early claim and claim have not started. Devnet DEX remains FAIL. Mainnet deployment remains false.

## 2026-09-25T05:16:00Z — Short offer listed for the claim path

PHASE EXECUTION

Lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC listed a 60-second offer. Signature x5xL7wjduwWhZtkbe9uvV1j1kBf1kzW5Z13o1w4yxvDonWW5aiYC9gz5z1MvvBkJzzp9qWNTwuMyDt8r8rRV8QU, slot 503831696, finalized, err null. Offer 4igJGLucK9F7yLqjvrENp8pfxQ47Z4QJY1Q1jV9sM3Pf. Chain amount stayed 998899494. Delegate holds 1000000 raw. Collateral 1000000, fee 100000, grace 30. Receipt offer_created verified. Take, early claim, and claim still need the borrower to take this offer. Devnet DEX remains FAIL. Mainnet deployment remains false.

## 2026-09-25T05:22:00Z — Borrower took the short offer

PHASE EXECUTION

Borrower CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX took offer 4igJGLucK9F7yLqjvrENp8pfxQ47Z4QJY1Q1jV9sM3Pf. Signature 5tCumUozhPqcZonmzqZoW78QHmT3h3KM8uTiYyo7Ruf7rDcAUeU7WGRCZpcpUFv3A3WtfBXP3EPNtXhWhq74ebVn, slot 503832748, finalized, err null. Loan AaTkPse9CNP2uk75sXzHbfAMhi4Wa59HQQ6RRmTncwn3. Lender dOPENAI 998899494 to 997899494. Borrower dOPENAI 869392 to 1859392. Borrower USDC 18500000 to 17400000. Lender USDC 11450000 to 11550000. Receipt loan_taken verified. The borrower stayed connected through maturity and grace, so an early claim was not sent. The position now says CLAIMABLE and the next action is for the lender to claim. Devnet DEX remains FAIL. Mainnet deployment remains false.

## 2026-09-25T05:25:00Z — Lender claimed the short loan

PHASE EXECUTION

Lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC claimed loan AaTkPse9CNP2uk75sXzHbfAMhi4Wa59HQQ6RRmTncwn3 after grace. Signature 4TbTczrhivm4Gq9eFA9i8s9B1E4o4Yqr4cnyzgp2HEK5zqF4iUtXszEsRhvYxxmTWBvCxqMKQFaC5hABoobFhA9G, slot 503834342, finalized, err null. Instruction ClaimCollateral. Program F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6. USDC vault 1000000 to 0. Lender USDC 11550000 to 12550000. Delta 1000000. Receipt loan_claimed verified. The loan page shows CLAIMED with that signature and no second claim action. Early claim was not sent on this loan. Devnet DEX remains FAIL. Mainnet deployment remains false.

## 2026-09-25T05:40:00Z — Production deploy

PHASE PRODUCTION

The first frontend deploy failed because the local validator suite was ignored, then because the SDK declarations are not in git. The suite is tracked, and the production build now builds the SDK first. Vercel deployment dpl_9f7kBecEFWisTMgJRcmCeo2AHNfN is READY and aliased to https://locate-blue.vercel.app. Chrome on that origin connected Hbkp…TvaC, showed chain dOPENAI 0.997899494 and USDC 12.55, and 0 borrowable. /proof returned 200. API health gitSha ecb27482b7b8abf906b6344249d5300d80aa85a1. CORS allows https://locate-blue.vercel.app. A follow-up deploy records productionDeployment true. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.




## 2026-09-25T06:18:41Z — Live catalog is the market allowlist

PHASE MARKET

The market proxy no longer names symbols itself. It reads the live PreStocks catalog and drops any row without a mint and both prices. xAI is not in that catalog, so it is not requested. A catalog symbol that the upstream returns, including the one previously stripped by name, stays in the market list. Market now leads with the live OpenAI mark and price, then the other catalog rows, then Devnet borrowable supply. Backend economics tests 11/11. No new signature. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

Files: frontend/src/app/api/prestocks/route.ts, frontend/src/lib/locate/useLiveMarket.ts, frontend/src/components/locate/app/views/Book.tsx, frontend/src/components/locate/landing/LogoMarquee.tsx, backend/src/market/prestocks.ts, backend/src/market/opportunities.ts, backend/test/economics.test.ts. Removed the unused preview app under frontend/locate, which carried illustrative prices.

## 2026-09-25T06:21:00Z — Scoreboard

PHASE STATUS

Chrome on localhost:3010 opened Market. OpenAI showed ,343, mark ,024, +31.2%. The other live catalog rows were listed under it. Borrowable supply showed 0. The connected wallet was Hbkp…TvaC, chain dOPENAI 0.997899494, USDC 12.55. proof/FINAL_STATUS.json records that. chromeWalletVerification stays false because early claim was not sent. productionBuild stays false because this commit is not deployed. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

## 2026-09-25T06:28:00Z — Mint fee is read, not assumed

PHASE EXECUTION

The live OpenAI mint at epoch 1042 has an active transfer fee of 100 bps. The same account schedules 300 bps at epoch 1043. The external-market balance read now parses that config. A missing fee is not treated as 100 bps, and a fee that changes before signing is refused. A return with no fee stored on the loan is refused. The SpaceX catalog row notes the issuer conversion date 12 Mar 2027. Mint fee tests 2/2. Frontend tsc passed. No new signature. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

Files: frontend/src/lib/locate/mintFee.ts, frontend/src/lib/locate/mintFee.test.ts, frontend/src/app/api/dex/balances/route.ts, frontend/src/components/locate/app/views/ExecutionLab.tsx, frontend/src/lib/locate/tx.ts, frontend/src/components/locate/app/views/Book.tsx, frontend/src/components/locate/app/views/Overview.tsx.

## 2026-09-25T06:32:00Z — Short offer listed for early claim

PHASE EXECUTION

Chrome on localhost:3010, lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC. Amount 0.001 chain units, collateral 1.00 Devnet USDC, fee 0.10, term 60 seconds, grace 30 seconds. Simulation passed. Phantom approved. Signature 65P8SnZezfKhuP5fhJb5zpAckHmye9tHorCdBbJxRcZ36TJVfNFzLPwxakBshDeJmLLKmvX6AkWttfCLbXTgE5Z7, slot 503858589, finalized, err null. Instructions ApproveChecked and CreateOffer. Mint 9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P. Lender dOPENAI stayed 997899494. Lender USDC stayed 12550000. Early claim still needs the borrower to take this offer before maturity. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

## 2026-09-25T06:36:00Z — Borrower took the short offer

PHASE EXECUTION

Borrower CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX took the 60-second offer. Simulation passed. Phantom approved. Signature 3NxZ3QXQk1gbCiRppmW66S94pASM9MTyKJZvTYq2gTLPaiNdcFJGNnkor4jVBPsJf67Y7JrXnRveL5nAeEpG5Q1M, slot 503859363, finalized, err null. Instruction TakeOffer. Loan 9zDhiTn7u6xh2eYrUNDvvQtNuYBwVmDJKLfHxtXdHhb6. Mint 9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P. Lender dOPENAI 997899494 to 996899494. Borrower dOPENAI 1859392 to 2849392, net 990000. Borrower USDC 17400000 to 16300000. Lender USDC 12550000 to 12650000, the 100000 fee. Vault USDC 1000000. The borrower stayed connected, so early claim was not sent. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

## 2026-09-25T06:40:00Z — Lender claimed after grace

PHASE EXECUTION

Lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC claimed loan 9zDhiTn7u6xh2eYrUNDvvQtNuYBwVmDJKLfHxtXdHhb6 after grace. The screen showed CLAIMABLE and Claimed as Not verified before the signature. Simulation passed. Phantom approved. Signature 4WXs3ooiToSrL5KFGJ58413ga2WhzVjaMoUM5wpmnqY1AHMwe361FZkPhfauHgqsqn6mZqGBskZ4MmqHritaS3cw, slot 503860398, finalized, err null. Instruction ClaimCollateral. Program F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6. Vault USDC 1000000 to 0. Lender USDC 12650000 to 13650000. Delta 1000000. The wallet then showed USDC 13.65. Early claim was not sent on this loan because the lender was not connected before maturity. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

## 2026-09-25T06:42:00Z — Production matches the claimed tree

PHASE PRODUCTION

Vercel deployment dpl_4wc97ckG4fUcUhcQSHgh3TW9SfaX is READY. API health gitSha ca94d688095cb38e061b7b0036261ced0ae521c0. CORS allows https://locate-blue.vercel.app. /proof returned 200 and shows Devnet, cloned Mainnet state, external market, and 45000 replay, with source build verified false, Devnet DEX FAIL, and both Mainnet LOCATE flags false. The live catalog returned eight PreStocks and did not include xAI. Chrome on that proof URL showed the same lines. Early claim was not sent. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

## 2026-09-25T06:50:00Z — Seven-day loan is active

PHASE EXECUTION

Lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC listed 0.001 chain units, collateral 1.00, fee 0.10, term 7 days, grace 2 days. Signature 2PgsmjwxPmVTAPktsNhFp13xZr2kdFPDdDFzVs7WGahU6KwejfkGftCuqeKxN6J5BXBrgG7Xz2UPyknNKjRp7eGB, slot 503863268, finalized, err null. CreateOffer. Lender dOPENAI stayed 996899494.

Borrower CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX took it. Signature 4vtXFRpvbLBeneBSHf5LzsKP9FvGim2DkGfkaZHLPAPDJ7RUnNRuq4c9Q8ub6vM6AUtRLt86FzZHsnzb1re6iV5W, slot 503863794, finalized, err null. TakeOffer. Loan 4U3UUMfK9QdJt2tm2S2NtTvFrBxX15L9JVvVgb2JDqnF. Lender dOPENAI 996899494 to 995899494. Borrower dOPENAI 2849392 to 3839392, net 990000. Borrower USDC 16300000 to 15200000. Lender USDC 13650000 to 13750000. Vault USDC 1000000. The position shows 6d 23h remaining. The borrower stayed connected, so early claim was not sent. The lender can still attempt it before maturity. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

## 2026-09-25T06:55:00Z — Twenty signatures match the chain

PHASE PROOF

The chain audit checked 20 signatures, including the seven-day list and take. failed 0. Each one was finalized with err null, and the recorded slot matched. Cloned-state execution has no cluster signature, so proofCenterIntegrity stays false. The take drawer and the loan title no longer force the account id through uppercase text. Frontend tsc passed. No new signature. Early claim was not sent. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

Files: scripts/audit-proof-chain.mjs, proof/verification/chain-audit.json, frontend/src/components/locate/app/drawers/TakeOfferDrawer.tsx, frontend/src/components/locate/app/views/LoanDetail.tsx, frontend/src/components/locate/app/parts.tsx.

## 2026-09-25T06:55:00Z — Product source has no non-catalog pre-IPO mint

PHASE SCAN

Source search of the program, SDK, frontend, backend, and scripts found the live OpenAI and Neuralink mints and the Devnet replica. The expired mint that is not in the current catalog is not referenced in that source. A test asserts an extra symbol is not invented. The landing still labels sample offer terms as illustrative, so the fake-data flag stays false. Chrome still has the borrower connected on loan 4U3UUMfK9QdJt2tm2S2NtTvFrBxX15L9JVvVgb2JDqnF with about 6d 23h remaining. Early claim was not sent. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

## 2026-09-25T06:58:12Z — Early claim refused before maturity

PHASE EXECUTION

Lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC connected in Chrome on localhost:3010. Loan 4U3UUMfK9QdJt2tm2S2NtTvFrBxX15L9JVvVgb2JDqnF was ACTIVE with 6d 23h 50m remaining. Chain dOPENAI 0.995899494. USDC 13.75. The screen offered SIMULATE EARLY CLAIM and kept the claim button disabled. The simulation returned ClaimRefusedNotMatured. The screen then showed NOT_CLAIMABLE_YET. No wallet approval was requested. The latest signature on the lender and on the loan is still the take 4vtXFRpvbLBeneBSHf5LzsKP9FvGim2DkGfkaZHLPAPDJ7RUnNRuq4c9Q8ub6vM6AUtRLt86FzZHsnzb1re6iV5W, slot 503863794, finalized, err null. The loan was not returned. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

Files: frontend/src/lib/locate/tx.ts, proof/FINAL_STATUS.json, proof/EXECUTION_STATUS.json, frontend/src/app/proof/data/EXECUTION_STATUS.json.

## 2026-09-25T07:11:21Z — Landing uses recorded evidence

PHASE PRODUCT

Chrome on localhost:3010 showed the landing after the sample receipts were removed. OpenAI market $1,335.57, mark $1,023.71, premium +30.5%. The borrower card showed 0 borrowable. The return card showed Devnet signature 5YJGkxd9wtZ8PA114v8m53QgbMsbdBuS7LH2BDBWTMk4reP5mgcJyPsidbD5MwcvtLhP986m8L1Xs6MyuZb85f2h, slot 503264913, gross raw 2039051. The refusal card showed NOT_CLAIMABLE_YET and no signature. The chain audit checked 22 signatures, including the later wallet return and claim. failed 0. proofCenterIntegrity stays false because cloned-state execution has no cluster signature. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

Files: frontend/src/components/locate/landing/Proof.tsx, frontend/src/components/locate/landing/UIPreviews.tsx, frontend/src/components/locate/landing/Token2022.tsx, frontend/src/components/locate/landing/Mechanism.tsx, frontend/src/components/locate/landing/Lifecycle.tsx, frontend/src/components/locate/app/views/CreateOffer.tsx, frontend/src/lib/locate/executionFacts.ts, scripts/audit-proof-chain.mjs, proof/verification/chain-audit.json, proof/FINAL_STATUS.json.

## 2026-09-25T14:52:56Z — Listing receipt shows on the active loan

PHASE EXECUTION

The settlement rail asked for receipts by the borrower wallet, so the lender's create receipt was missing and Listed stayed Not verified. The loan screen now loads receipts by loan and by offer. Chrome on localhost:3010, lender Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC, loan 4U3UUMfK9QdJt2tm2S2NtTvFrBxX15L9JVvVgb2JDqnF. Listed shows 2PgsmjwxPmVTAPktsNhFp13xZr2kdFPDdDFzVs7WGahU6KwejfkGftCuqeKxN6J5BXBrgG7Xz2UPyknNKjRp7eGB. Taken shows 4vtXFRpvbLBeneBSHf5LzsKP9FvGim2DkGfkaZHLPAPDJ7RUnNRuq4c9Q8ub6vM6AUtRLt86FzZHsnzb1re6iV5W. Returned and collateral released stay Not verified. Short and buy back stay blocked: Devnet venue FAIL, not this loan. About 6d 15h remaining. No new signature. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

Files: frontend/src/components/locate/app/views/LoanDetail.tsx.

## 2026-09-25T14:56:45Z — Production serves the current tree

PHASE PRODUCTION

Vercel deployment dpl_J8bnSAYmLBXTgHmf2g8YegX6Lwet is READY. Alias https://locate-blue.vercel.app. gitSha db8540ba30f0d2a8a5a17e1944ae3aae896026a2. /proof returned the flags source build verified false, Devnet DEX FAIL, mainnetLocateDeployment false, and mainnetLocateTransactions false. The 24 proof JSON files copied into the frontend match the proof directory. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

Files: evidence/qa/vercel-deploy.json, proof/FINAL_STATUS.json.

## 2026-09-25T15:01:26Z — Proof artifacts match the headline counts

PHASE PROOF

The artifact audit found no problems. Cloned Mainnet matrix 24/24 PASS. Local validator 42/42 result PASS, including 34 expected refusals where the instruction failed and the case still passed. Replay families sum to 45000. Security, functional, and mutation failed counts are 0. Chain audit 22 signatures, failed 0. The 24 frontend proof copies match the proof directory. Reproducible build equality is true and it is not a Mainnet verified program. Devnet DEX result remains FAIL with no signed transactions. Cloned execution remains a local manifest with no cluster signature. proofCenterIntegrity is true on that basis. Devnet DEX remains FAIL. Mainnet LOCATE deployment remains false.

Files: scripts/audit-proof-artifacts.mjs, scripts/audit-proof-chain.mjs, proof/verification/artifact-audit.json, proof/EXECUTION_STATUS.json, frontend/src/app/proof/data/EXECUTION_STATUS.json.

## 2026-09-25T15:16:20Z — Proof wording matches the architecture

PHASE PRODUCT

The proof page no longer prints the reproducible build as an open failure. It now says reproducible build PASS, Devnet deployed binary correspondence PASS, Mainnet LOCATE deployment not deployed by design, and Devnet external venue unavailable. The loan rail uses the same venue wording. Frontend tsc passed. No new signature. The suites were not rerun. Devnet DEX remains an external venue blocker. Mainnet LOCATE deployment remains false.

Files: frontend/src/app/proof/page.tsx, frontend/src/lib/locate/executionFacts.ts, frontend/src/components/locate/app/views/LoanDetail.tsx.

## 2026-09-25T15:22:57Z — Production smoke and the replica label

PHASE PRODUCTION

Chrome on https://locate-blue.vercel.app, commit 9cb36be. Phantom connected as Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC. Chain dOPENAI 0.995899494. USDC 13.75. Market showed OpenAI $1,323, mark $1,025, +29.2%, and 0 borrowable Devnet supply. Loan 4U3UUMfK9QdJt2tm2S2NtTvFrBxX15L9JVvVgb2JDqnF showed Listed 2PgsmjwxPmVTAPktsNhFp13xZr2kdFPDdDFzVs7WGahU6KwejfkGftCuqeKxN6J5BXBrgG7Xz2UPyknNKjRp7eGB and Taken 4vtXFRpvbLBeneBSHf5LzsKP9FvGim2DkGfkaZHLPAPDJ7RUnNRuq4c9Q8ub6vM6AUtRLt86FzZHsnzb1re6iV5W. Short said the Devnet venue is unavailable. Returned and collateral released stayed Not verified. About 6d 15h remained. Proof showed 24/24, external sell PASS 2C4CND6FqBiTgPzgNQojHKa6KzL221gd2Zm4BiyP7WCRnmichUF3m9ptF9xs7pDgTVaa9GMm6eYtqmUnQMbqmuzr, buyback PASS 5cHQQxCByufmPazGRqKPgfdPDVJHMvCVFkz3NdutoPjrjc1p6RhboJXcjzMmQRgcQ8KoqkQNH8NJSGnpPRQZgR6F, Devnet external venue unavailable, and Mainnet LOCATE deployment not deployed by design. API health gitSha 9cb36bec3770e38cf82a2378ec43292304e3a967. The loan card named the replica OpenAI PreStock. This commit labels that card dOPENAI · Devnet replica. No new signature. Devnet DEX remains an external venue blocker. Mainnet LOCATE deployment remains false.

Files: frontend/src/components/locate/app/views/LoanDetail.tsx, proof/FINAL_STATUS.json, evidence/qa/vercel-deploy.json, evidence/backend/render-create.json.

## 2026-09-25T15:28:09Z — The loan names the Devnet replica

PHASE PRODUCT

Production dpl_8HWNUCy3GXgU9PQdKWgg958XdApS is READY for 9938e59 and aliased to https://locate-blue.vercel.app. Chrome on that loan showed the card title dOPENAI · Devnet replica. The amount lines still said OPENAI. This commit uses dOPENAI for those lines when the mint is the Devnet replica. No new signature. Devnet DEX remains an external venue blocker. Mainnet LOCATE deployment remains false.

Files: frontend/src/components/locate/app/views/LoanDetail.tsx.

