import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const sell = JSON.parse(readFileSync("proof/mainnet-dex/sell.json", "utf8"));
const sell2 = JSON.parse(readFileSync("proof/mainnet-dex/sell-2.json", "utf8"));
const buy = JSON.parse(readFileSync("proof/mainnet-dex/buyback.json", "utf8"));
const before = JSON.parse(readFileSync("proof/mainnet-dex/balance-before.json", "utf8"));
const afterSell = JSON.parse(readFileSync("proof/mainnet-dex/balance-after.json", "utf8"));
const after = JSON.parse(readFileSync("proof/mainnet-dex/balance-after-buyback.json", "utf8"));

const openaiBefore = BigInt(before.openaiRaw);
const openaiAfter = BigInt(after.openaiRaw);
const usdcBefore = BigInt(before.usdcRaw);
const usdcAfter = BigInt(after.usdcRaw);
const preBuyback = BigInt(buy.actualOpenAiAfter) - BigInt(buy.openaiDeltaFromPreBuyback);

const body = {
  network: "mainnet",
  locateProtocol: false,
  statement: "External market execution; LOCATE protocol remains Devnet/fork-only.",
  wallet: sell.wallet,
  inputMint: sell.mint,
  usdcMint: before.usdcMint,
  finalized: sell.err === null && buy.err === null && sell.result === "PASS" && buy.result === "PASS",
  error: null,
  token2022: {
    feeBpsOnClonedMintAtEpoch1041: 100,
    sellInputRaw: sell.amountRaw,
    scheduleFeeRaw: "10",
    walletDebitRaw: sell.openaiDelta,
    note: "Wallet delta is the gross debit recorded on the sell. The 10-raw fee is 100 bps of 1000 from the cloned mint schedule, not a second on-chain measurement.",
  },
  sell: {
    signature: sell.signature,
    slot: sell.slot,
    inputRaw: sell.amountRaw,
    outputRaw: sell.actualOutRaw,
    minOutRaw: sell.minOutRaw,
    quoteOutRaw: sell.quoteOutRaw,
    quoteTimestamp: sell.timestamp,
    route: sell.route,
    err: sell.err,
  },
  fundingSell: {
    signature: sell2.signature,
    slot: sell2.slot,
    inputRaw: sell2.amountRaw,
    quoteOutRaw: sell2.quoteOutRaw,
    err: sell2.err,
    note: "Second sell. Buyback input equals the two recorded 1982 USDC quotes.",
  },
  buyback: {
    signature: buy.signature,
    slot: buy.slot,
    inputRaw: buy.inAmountUsdcRaw,
    outputRaw: buy.openaiDeltaFromPreBuyback,
    minOutRaw: buy.minOutRaw,
    quoteOutRaw: buy.quoteOutRaw,
    quoteTimestamp: buy.timestamp,
    route: buy.route,
    err: buy.err,
  },
  before: {
    solLamports: before.solLamports,
    openaiRaw: before.openaiRaw,
    usdcRaw: before.usdcRaw,
    slot: before.slot,
  },
  afterFirstSell: {
    openaiRaw: afterSell.openaiRaw,
    usdcRaw: afterSell.usdcRaw,
    slot: afterSell.slot,
  },
  after: {
    solLamports: after.solLamports,
    openaiRaw: after.openaiRaw,
    usdcRaw: after.usdcRaw,
  },
  deltas: {
    openaiRaw: (openaiAfter - openaiBefore).toString(),
    usdcRaw: (usdcAfter - usdcBefore).toString(),
    openaiRawBeforeBuyback: preBuyback.toString(),
    sellUsdcRaw: sell.usdcDelta,
    buybackOpenAiRaw: buy.openaiDeltaFromPreBuyback,
  },
};

if (sell.locateProtocol !== false || buy.locateProtocol !== false) {
  throw new Error("locate protocol flag");
}
if (BigInt(sell.actualOutRaw) + BigInt(sell2.quoteOutRaw) !== BigInt(buy.inAmountUsdcRaw)) {
  throw new Error("sell outputs do not fund the buyback");
}

mkdirSync("proof/mainnet-dex", { recursive: true });
writeFileSync("proof/mainnet-dex/execution-case.json", JSON.stringify(body, null, 2) + "\n");
console.log(JSON.stringify({ finalized: body.finalized, openaiDelta: body.deltas.openaiRaw, usdcDelta: body.deltas.usdcRaw }));
