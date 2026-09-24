# Frontend integration

The frontend is owned outside this repository until it is placed in `FRONTEND/`. LOCATE does not create or edit that folder.

Public environment variables:

- `VITE_API_BASE_URL`
- `VITE_SOLANA_CLUSTER=devnet`
- `VITE_SOLANA_RPC_URL=https://api.devnet.solana.com`
- `VITE_LOCATE_PROGRAM_ID`

If `VITE_LOCATE_PROGRAM_ID` differs from `GET /v1/config` `programId`, the app blocks.

Install the SDK with `npm i ../sdk/locate-sdk-0.1.0.tgz`. Builders: `buildListTx`, `buildCancelTx`, `buildTakeTx`, `buildTakeAndSellTx`, `buildReturnTx`, `buildBuyAndReturnTx`, `buildClaimTx`. `buildTakeAndSellTx` throws on devnet. Every builder must be simulated with `simulateAndDecode` before a wallet signature.

The devnet mint is a devnet test mint mirroring OPENAI's extensions; not a PreStocks token. Show that sentence as a persistent banner. Prices show source and age. A stale market renders as stale, with null numbers. Scenarios use the SDK label that begins with "Illustrative." Refusals are labeled "simulation — not a transaction".

Discover reads `api.opportunities()`. A take action exists only when `bestOffer` is present. Economics come from `GET /v1/offers/:pubkey/economics` and `quoteEconomics`. Thesis skip does not change transaction bytes. Receipts are posted after confirmation and shown as verified only after the backend reports finalized.

Run `node sdk/tools/check-frontend.mjs FRONTEND` before a frontend deploy.
