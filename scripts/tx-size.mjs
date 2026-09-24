import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Connection, Keypair, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { buildTakeTx } from "../sdk/dist/builders.js";
import { MAINNET_USDC } from "../sdk/dist/constants.js";

const OPENAI = new PublicKey("PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF");
const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const AMOUNT = "2018660";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim();
  }
  throw new Error("missing " + name);
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

const connection = new Connection(envValue("SOLANA_RPC_URL_MAINNET"), { commitment: "confirmed", disableRetryOnRateLimit: false });
await new Promise((resolve) => setTimeout(resolve, 3000));
const base = envValue("JUPITER_API_BASE").replace(/\/$/, "");
async function largestOnce(url) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenLargestAccounts", params: [OPENAI.toBase58()] }),
  });
  const body = await response.json();
  if (body.error) throw new Error("largest " + body.error.message);
  return body.result.value[0].address;
}
let holder = null;
let holderError = null;
let holderSource = null;
try {
  const holderAtaAddress = await largestOnce(envValue("SOLANA_RPC_URL_MAINNET"));
  const parsed = await connection.getParsedAccountInfo(new PublicKey(holderAtaAddress));
  holder = new PublicKey(parsed.value.data.parsed.info.owner);
  holderSource = "getTokenLargestAccounts";
} catch (error) {
  holderError = error.message;
  const sigs = await connection.getSignaturesForAddress(OPENAI, { limit: 8 });
  let best = null;
  for (const row of sigs) {
    let tx = null;
    try {
      tx = await connection.getTransaction(row.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    } catch {
      continue;
    }
    for (const balance of tx?.meta?.postTokenBalances ?? []) {
      if (balance.mint !== OPENAI.toBase58() || !balance.owner) continue;
      const amount = BigInt(balance.uiTokenAmount.amount);
      if (!best || amount > best.amount) best = { owner: balance.owner, amount };
    }
  }
  if (!best) throw new Error("no holder in recent mint transactions");
  holder = new PublicKey(best.owner);
  holderSource = "largest postTokenBalance in recent mint transactions after getTokenLargestAccounts was rate limited";
}

const exactOut = await fetch(base + "/swap/v1/quote?" + new URLSearchParams({
  inputMint: USDC.toBase58(),
  outputMint: OPENAI.toBase58(),
  amount: AMOUNT,
  slippageBps: "100",
  swapMode: "ExactOut",
}));

await new Promise((resolve) => setTimeout(resolve, 2000));
const quoteResponse = await fetch(base + "/swap/v1/quote?" + new URLSearchParams({
  inputMint: OPENAI.toBase58(),
  outputMint: USDC.toBase58(),
  amount: AMOUNT,
  slippageBps: "100",
  maxAccounts: "40",
}));
if (!quoteResponse.ok) throw new Error("quote " + quoteResponse.status);
const quote = await quoteResponse.json();

let bytes = null;
let composedBytes = null;
let composedError = null;
let swapProgramId = null;
let simulationErr = null;
let unitsConsumed = null;
let logTail = [];
if (holder) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const swapResponse = await fetch(base + "/swap/v1/swap-instructions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quoteResponse: quote, userPublicKey: holder.toBase58(), wrapAndUnwrapSol: false, dynamicComputeUnitLimit: true }),
  });
  if (!swapResponse.ok) throw new Error("swap-instructions " + swapResponse.status);
  const swap = await swapResponse.json();
  const swapIx = ix(swap.swapInstruction);
  if (swapIx.programId.toBase58() !== JUPITER) throw new Error("unexpected swap program");
  swapProgramId = swapIx.programId.toBase58();
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
    payerKey: holder,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions,
  }).compileToV0Message(alts);
  bytes = message.serialize().length;
  const takeTerms = {
    lender: Keypair.generate().publicKey,
    mint: OPENAI,
    usdcMint: MAINNET_USDC,
    nonce: 1n,
    amountRaw: BigInt(AMOUNT),
    collateralUsdc: 1_000_000n,
    feeUsdc: 50_000n,
    termSecs: 3600n,
    graceSecs: 30n,
    expiresAt: 2_000_000_000n,
    decimals: 9,
  };
  try {
    const composed = new TransactionMessage({
      payerKey: holder,
      recentBlockhash: message.recentBlockhash,
      instructions: [...buildTakeTx(holder, takeTerms), ...instructions],
    }).compileToV0Message(alts);
    composedBytes = composed.serialize().length;
  } catch (error) {
    composedError = error.message;
  }
  const sim = await connection.simulateTransaction(new VersionedTransaction(message), { sigVerify: false, replaceRecentBlockhash: true });
  simulationErr = sim.value.err;
  unitsConsumed = sim.value.unitsConsumed;
  logTail = (sim.value.logs ?? []).slice(-8);
}

const evidence = {
  kind: "mainnet-simulation",
  cluster: "mainnet-beta",
  mint: OPENAI.toBase58(),
  holder: holder ? holder.toBase58() : null,
  holderSource,
  holderError,
  amountRaw: AMOUNT,
  exactOutStatus: exactOut.status,
  quoteOutAmount: quote.outAmount,
  otherAmountThreshold: quote.otherAmountThreshold,
  swapProgramId,
  messageBytes: bytes,
  takePlusSellBytes: composedBytes,
  takePlusSellError: composedError,
  decision: composedBytes !== null && composedBytes <= 1112 ? "atomic" : "two-transaction",
  headroomLimit: 1112,
  fitsAtomicHeadroom: composedBytes === null ? null : composedBytes <= 1112,
  simulationErr,
  unitsConsumed,
  logTail,
  fetchedAt: new Date().toISOString(),
  note: holder ? "simulateTransaction only. No mainnet transaction was sent." : "Holder lookup was rate limited. Quote recorded. No simulation was claimed.",
};
mkdirSync(new URL("../evidence/integration/", import.meta.url), { recursive: true });
writeFileSync(new URL("../evidence/integration/tx-sizes.json", import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ bytes, composedBytes, decision: composedBytes !== null && composedBytes <= 1112 ? "atomic" : "two-transaction", exactOut: exactOut.status, holder: Boolean(holder), err: simulationErr, units: unitsConsumed }));
