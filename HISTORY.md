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
Git SHA: pending this commit
