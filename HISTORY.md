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
