# LOCATE

LOCATE lends a Token-2022 PreStock for a fixed time. The borrower posts USDC collateral and can sell the borrowed tokens. Settlement is time, delivery, and USDC collateral. A price move does not liquidate the loan. There is no oracle, no protocol fee, and no admin instruction.

The program has five instructions: `create_offer`, `cancel_offer`, `take_offer`, `return_loan`, and `claim_collateral`.

This repository is a Tier B deployment. The program is live on devnet. Mainnet work is read-only: quotes, account reads, and `simulateTransaction`. No mainnet protocol transaction has been sent.

## Devnet and the test mint

Program: `F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6`

Devnet USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

The mint `9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P` is a devnet test mint mirroring OPENAI's extensions; not a PreStocks token.

The upgrade authority is the devnet deployer `Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC`. The on-chain ELF matches the local release binary. See `evidence/devnet/release-hash.json`. Tag: `v1.0.0-rc`.

## What a loan does

A lender approves an amount on their own token account and creates an offer. The tokens stay in the lender's wallet until someone takes the offer. The borrower pays the USDC fee to the lender and locks the USDC collateral in a vault owned by the loan account. Taking the offer transfers the tokens, minus the Token-2022 transfer fee. The lender's received balance is the net delivery.

Returning the loan requires the lender's balance to increase by at least the original amount. The borrower approves a gross amount large enough to cover the fee. If the tokens come back, the collateral is released. If the term and grace expire, anyone can claim the collateral for the lender. A claim before maturity is refused. A paused mint or an active transfer hook defers the claim.

## Prices are not settlement

The issuer reference price and the Jupiter price are context. They are not instruction arguments. Break-even figures are illustrative. A quote older than 20 seconds is not used. If a quote cannot prove the buy size, the break-even is unavailable.

At slot 449906754, epoch 1041, the real mainnet OPENAI mint `PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF` had an active transfer fee of 100 bps (scheduled at epoch 1039). Jupiter reported an OPENAI price of about 1328.95 USD and an issuer stock price of about 1024.25 USD. Those numbers are a snapshot in `evidence/live-data/`, not a protocol input.

## Proof

| Claim | Evidence |
|---|---|
| Devnet program matches the release binary | `evidence/devnet/release-hash.json` |
| Create, take, return, and claim landed | `evidence/integration/devnet-sdk-cycle.json` |
| Early claim is a simulation, error 6015 | same file, `earlyClaimSimulation` |
| Take plus sell fits in one versioned transaction | `evidence/integration/tx-sizes.json`, 822 bytes |
| Sell simulation succeeded and was not sent | same file, `simulationErr: null` |
| Buy simulation failed with Jupiter error 6001 | same file, `buyLeg` |
| ExactOut is unavailable for OPENAI | HTTP 400 in the same file |

The devnet signatures were created by the project wallets. They are a self-originated demo.

## Issuer powers

The real OPENAI mint can carry a permanent delegate, a pause authority, a transfer hook, and a transfer fee. LOCATE refuses a new take while the mint is paused, hooked, or waiting on a fee change. Those issuer powers still apply to anyone holding the token. The protocol does not remove them.

## Demand

Nothing in this repository shows that anyone other than the project wallets wants to borrow a PreStock. Empty offer books are empty. The API does not invent offers.

## Layout

- `programs/locate` is the Anchor program.
- `sdk` is `@locate/sdk`.
- `backend` is the read-only API. It does not hold a signing key and it does not move funds.
- `docs/FRONTEND_INTEGRATION.md` is the contract for the separately owned frontend. This repository does not contain that frontend.
- `evidence` is produced by the scripts under `scripts/`.

## Run the tests

The program tests run with `cargo test -p locate` after `cargo-build-sbf --features devnet`. The SDK and backend tests run with `npm test` in `sdk` and `backend`.
