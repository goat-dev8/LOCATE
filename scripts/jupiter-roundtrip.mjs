/**
 * Mainnet Jupiter quotes and simulations for a LOCATE-sized OPENAI round trip.
 * No mainnet transaction is sent. Comparisons use raw integers only.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OPENAI = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const LOAN_RAW = 2_018_660n;
const FEE_BPS = 100;
const MAX_FEE = (1n << 64n) - 1n;
const DECIMALS = 9;
const USDC_DECIMALS = 6;
const QUOTE_TTL_MS = 30_000;
const MAX_QUOTES = 24;
const MAX_USDC = 100_000_000n;

function envValue(name) {
  const text = readFileSync(join(root, ".env"), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim();
  }
  throw new Error("missing " + name);
}

function epochFee(bps, maxFee, amount) {
  if (bps === 0 || amount === 0n) return 0n;
  const raw = (amount * BigInt(bps) + 9999n) / 10000n;
  return raw < maxFee ? raw : maxFee;
}

function grossForNet(bps, maxFee, net) {
  if (net === 0n || bps === 0) return net;
  const denom = 10000n - BigInt(bps);
  let gross = net + (net * BigInt(bps) + denom - 1n) / denom;
  if (gross - net > maxFee) gross = net + maxFee;
  for (let i = 0; i < 3; i++) {
    if (gross - epochFee(bps, maxFee, gross) >= net) break;
    gross += 1n;
  }
  while (gross > net) {
    const prev = gross - 1n;
    if (prev - epochFee(bps, maxFee, prev) >= net) gross = prev;
    else break;
  }
  return gross;
}

function ui(raw, decimals) {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const frac = (raw % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac.length === 0 ? whole.toString() : whole.toString() + "." + frac;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const base = envValue("JUPITER_API_BASE").replace(/\/$/, "");
let quotesUsed = 0;

async function quote(params) {
  if (quotesUsed >= MAX_QUOTES) throw new Error("quote budget exhausted");
  quotesUsed += 1;
  const started = Date.now();
  const query = new URLSearchParams({ ...params, dexes: "Meteora DLMM" });
  const response = await fetch(base + "/swap/v1/quote?" + query);
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { unparsed: text.slice(0, 400) };
  }
  return {
    status: response.status,
    fetchedAt: new Date(started).toISOString(),
    ageMs: Date.now() - started,
    body,
  };
}

function fresh(row) {
  return Date.now() - Date.parse(row.fetchedAt) <= QUOTE_TTL_MS;
}

function routeOf(body) {
  const hops = body?.routePlan ?? [];
  return hops.map((hop) => ({
    label: hop.swapInfo?.label ?? null,
    amm: hop.swapInfo?.ammKey ?? null,
    inputMint: hop.swapInfo?.inputMint ?? null,
    outputMint: hop.swapInfo?.outputMint ?? null,
    inAmount: hop.swapInfo?.inAmount ?? null,
    outAmount: hop.swapInfo?.outAmount ?? null,
  }));
}

function ix(raw) {
  if (!raw) return null;
  return new TransactionInstruction({
    programId: new PublicKey(raw.programId),
    keys: raw.accounts.map((account) => ({
      pubkey: new PublicKey(account.pubkey),
      isSigner: account.isSigner,
      isWritable: account.isWritable,
    })),
    data: Buffer.from(raw.data, "base64"),
  });
}

async function simulate(connection, user, quoteBody) {
  let swapResponse = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(2000 + attempt * 1500);
    swapResponse = await fetch(base + "/swap/v1/swap-instructions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quoteBody,
        userPublicKey: user,
        wrapAndUnwrapSol: false,
        dynamicComputeUnitLimit: true,
      }),
    });
    if (swapResponse.status !== 429) break;
  }
  if (!swapResponse.ok) {
    return { simulation: "FAIL", swapStatus: swapResponse.status, error: "swap-instructions " + swapResponse.status };
  }
  const swap = await swapResponse.json();
  const swapIx = ix(swap.swapInstruction);
  if (!swapIx || swapIx.programId.toBase58() !== JUPITER) {
    return { simulation: "FAIL", error: "swap program mismatch" };
  }
  const alts = [];
  for (const address of swap.addressLookupTableAddresses ?? []) {
    const table = await connection.getAddressLookupTable(new PublicKey(address));
    if (table.value) alts.push(table.value);
  }
  const instructions = [
    ...(swap.computeBudgetInstructions ?? []).map(ix),
    ...(swap.setupInstructions ?? []).map(ix),
    swapIx,
    ix(swap.cleanupInstruction),
  ].filter(Boolean);
  const message = new TransactionMessage({
    payerKey: new PublicKey(user),
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions,
  }).compileToV0Message(alts);
  const sim = await connection.simulateTransaction(new VersionedTransaction(message), {
    sigVerify: false,
    replaceRecentBlockhash: true,
  });
  return {
    simulation: sim.value.err ? "FAIL" : "PASS",
    error: sim.value.err,
    unitsConsumed: sim.value.unitsConsumed,
    messageBytes: message.serialize().length,
    logTail: (sim.value.logs ?? []).slice(-8),
    note: "simulateTransaction only. No mainnet transaction was sent.",
  };
}

const receivedNet = LOAN_RAW - epochFee(FEE_BPS, MAX_FEE, LOAN_RAW);
const returnGross = grossForNet(FEE_BPS, MAX_FEE, LOAN_RAW);
if (returnGross - epochFee(FEE_BPS, MAX_FEE, returnGross) < LOAN_RAW) {
  throw new Error("gross does not cover the loan");
}

const connection = new Connection(envValue("SOLANA_RPC_URL_MAINNET"), "confirmed");
const holder = "5CEbueQnq1Ym2uSSx2xXds3jQAqT1BDnkA59RZobSPAG";

const sell = await quote({
  inputMint: OPENAI,
  outputMint: USDC,
  amount: receivedNet.toString(),
  slippageBps: "100",
  maxAccounts: "40",
});
if (sell.status !== 200) throw new Error("sell quote " + sell.status);
const sellOut = BigInt(sell.body.outAmount);
const sellIn = BigInt(sell.body.inAmount);

await sleep(1200);
const exactOut = await quote({
  inputMint: USDC,
  outputMint: OPENAI,
  amount: returnGross.toString(),
  slippageBps: "100",
  swapMode: "ExactOut",
  maxAccounts: "40",
});

const attempts = [];
let accepted = null;
let mode = null;
if (exactOut.status === 200 && fresh(exactOut) && BigInt(exactOut.body.outAmount) >= returnGross) {
  accepted = exactOut;
  mode = "ExactOut";
} else {
  mode = "ExactIn";
  let budget = sellOut > 0n ? sellOut : 1n;
  let previousOut = 0n;
  let monotonic = true;
  for (let step = 0; step < 16 && quotesUsed < MAX_QUOTES; step++) {
    if (budget > MAX_USDC) budget = MAX_USDC;
    await sleep(1100);
    const row = await quote({
      inputMint: USDC,
      outputMint: OPENAI,
      amount: budget.toString(),
      slippageBps: "100",
      maxAccounts: "40",
    });
    const out = row.status === 200 ? BigInt(row.body.outAmount) : 0n;
    if (out < previousOut) monotonic = false;
    previousOut = out;
    attempts.push({ usdcIn: budget.toString(), status: row.status, outAmount: out.toString(), fresh: fresh(row) });
    if (row.status === 200 && fresh(row) && out >= returnGross) {
      accepted = row;
      break;
    }
    if (budget === MAX_USDC) break;
    const next = out === 0n ? budget * 2n : (budget * returnGross) / out + 1n;
    budget = next > budget ? next : budget + 1n;
  }
  if (accepted) accepted.monotonic = monotonic;
}

const buyOut = accepted ? BigInt(accepted.body.outAmount) : 0n;
const buyIn = accepted ? BigInt(accepted.body.inAmount) : 0n;
const quotePass = accepted !== null && buyOut >= returnGross && fresh(accepted);

await sleep(1200);
const sellSim = sell.status === 200 ? await simulate(connection, holder, sell.body) : { simulation: "FAIL", error: "no sell quote" };
const buySim = accepted ? await simulate(connection, holder, accepted.body) : { simulation: "FAIL", error: "no accepted buy quote" };

const common = {
  cluster: "mainnet-beta",
  mint: OPENAI,
  usdcMint: USDC,
  quoteSource: "jupiter /swap/v1/quote",
  decimals: DECIMALS,
  usdcDecimals: USDC_DECIMALS,
  feeBps: FEE_BPS,
  maxFee: MAX_FEE.toString(),
  loanAmountRaw: LOAN_RAW.toString(),
  loanAmountUi: ui(LOAN_RAW, DECIMALS),
  receivedNetRaw: receivedNet.toString(),
  requiredReturnGrossRaw: returnGross.toString(),
  timestamp: new Date().toISOString(),
  mainnetTransaction: false,
  priorBuyback: {
    note: "Earlier ExactIn buy spending only the sell proceeds quoted fewer OPENAI raw units than were sold, and that simulation failed.",
    soldRaw: "2018660",
    usdcIn: "3987285",
    quotedOutRaw: "1983744",
    shortfallVsSoldRaw: "34916",
    simulation: "Jupiter custom 6001",
  },
};

const sellDoc = {
  ...common,
  id: "openai-sell",
  test: "OPENAI to USDC",
  quoteStatus: sell.status,
  quoteTimestamp: sell.fetchedAt,
  inputAmountRaw: sellIn.toString(),
  inputAmountUi: ui(sellIn, DECIMALS),
  outputAmountRaw: sellOut.toString(),
  outputAmountUi: ui(sellOut, USDC_DECIMALS),
  otherAmountThreshold: sell.body.otherAmountThreshold ?? null,
  route: routeOf(sell.body),
  priceImpactPct: sell.body.priceImpactPct ?? null,
  contextSlot: sell.body.contextSlot ?? null,
  simulation: sellSim,
  result: sell.status === 200 && sellOut > 0n && sellSim.simulation === "PASS" ? "PASS" : "FAIL",
};
const buyDoc = {
  ...common,
  id: "openai-buyback",
  test: "USDC to enough OPENAI",
  exactOutStatus: exactOut.status,
  exactOutError: exactOut.status === 200 ? null : exactOut.body,
  mode,
  attempts,
  quoteTimestamp: accepted?.fetchedAt ?? null,
  inputAmountRaw: buyIn.toString(),
  inputAmountUi: ui(buyIn, USDC_DECIMALS),
  outputAmountRaw: buyOut.toString(),
  outputAmountUi: ui(buyOut, DECIMALS),
  minimumAcceptableRaw: returnGross.toString(),
  otherAmountThreshold: accepted?.body.otherAmountThreshold ?? null,
  route: accepted ? routeOf(accepted.body) : [],
  priceImpactPct: accepted?.body.priceImpactPct ?? null,
  contextSlot: accepted?.body.contextSlot ?? null,
  usdcGapVsSellProceeds: (buyIn - sellOut).toString(),
  simulation: buySim,
  result: quotePass && buySim.simulation === "PASS" ? "PASS" : "FAIL",
  simulationResult: buySim.simulation,
};
const takeSell = {
  ...common,
  id: "take-sell-size",
  test: "take delivery then sell that net amount",
  takeDeliversRaw: receivedNet.toString(),
  sellInputRaw: sellIn.toString(),
  sellOutputUsdcRaw: sellOut.toString(),
  amountsMatch: sellIn === receivedNet,
  result: sellDoc.result === "PASS" && sellIn === receivedNet && sellSim.simulation === "PASS" ? "PASS" : "FAIL",
};
const buyReturn = {
  ...common,
  id: "buy-return-size",
  test: "buy at least the gross required to return the loan",
  requiredDeliveryRaw: returnGross.toString(),
  quotedOutputRaw: buyOut.toString(),
  coversReturn: buyOut >= returnGross,
  lenderReceivesAtLeastLoan: returnGross - epochFee(FEE_BPS, MAX_FEE, returnGross) >= LOAN_RAW,
  result: quotePass && buySim.simulation === "PASS" ? "PASS" : "FAIL",
};

const dir = join(root, "proof", "jupiter-roundtrip");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "sell.json"), JSON.stringify(sellDoc, null, 2));
writeFileSync(join(dir, "buyback.json"), JSON.stringify(buyDoc, null, 2));
writeFileSync(join(dir, "take-sell-size.json"), JSON.stringify(takeSell, null, 2));
writeFileSync(join(dir, "buy-return-size.json"), JSON.stringify(buyReturn, null, 2));
console.log(JSON.stringify({
  sell: sellDoc.result,
  sellOut: sellOut.toString(),
  buy: buyDoc.result,
  buyMode: mode,
  buyIn: buyIn.toString(),
  buyOut: buyOut.toString(),
  required: returnGross.toString(),
  sellSim: sellSim.simulation,
  buySim: buySim.simulation,
  quotesUsed,
}));
