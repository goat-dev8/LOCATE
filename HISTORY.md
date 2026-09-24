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
