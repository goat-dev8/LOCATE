import { readFileSync, writeFileSync } from "node:fs";
import { Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}

const OPENAI = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const LOCATE = "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6";
const wallet = "Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC";
const base = envValue("JUPITER_API_BASE").replace(/\/$/, "");
const rpc = envValue("SOLANA_RPC_URL_MAINNET");
const amount = "1000";

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

const params = new URLSearchParams({
  inputMint: OPENAI,
  outputMint: USDC,
  amount,
  slippageBps: "100",
  dexes: "Meteora DLMM",
  maxAccounts: "40",
});
const quoteResponse = await fetch(base + "/swap/v1/quote?" + params);
const quote = await quoteResponse.json();
if (!quoteResponse.ok) {
  writeFileSync(new URL("../proof/mainnet-dex/sell-sim.json", import.meta.url), JSON.stringify({ network: "mainnet", result: "FAIL", quote }, null, 2));
  console.log(JSON.stringify({ quoteStatus: quoteResponse.status, error: quote.error ?? quote }));
  process.exit(1);
}

const swapResponse = await fetch(base + "/swap/v1/swap-instructions", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    quoteResponse: quote,
    userPublicKey: wallet,
    wrapAndUnwrapSol: false,
    dynamicComputeUnitLimit: true,
  }),
});
const swap = await swapResponse.json();
if (!swapResponse.ok) {
  writeFileSync(new URL("../proof/mainnet-dex/sell-sim.json", import.meta.url), JSON.stringify({ network: "mainnet", result: "FAIL", swapStatus: swapResponse.status, swap }, null, 2));
  console.log(JSON.stringify({ swapStatus: swapResponse.status }));
  process.exit(1);
}

const connection = new Connection(rpc, "confirmed");
const swapIx = ix(swap.swapInstruction);
const programIds = [
  ...(swap.computeBudgetInstructions ?? []),
  ...(swap.setupInstructions ?? []),
  swap.swapInstruction,
  swap.cleanupInstruction,
].filter(Boolean).map((row) => row.programId);
const locateForbidden = JSON.stringify(swap).includes(LOCATE) || programIds.includes(LOCATE);
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
const latest = await connection.getLatestBlockhash("confirmed");
const message = new TransactionMessage({
  payerKey: new PublicKey(wallet),
  recentBlockhash: latest.blockhash,
  instructions,
}).compileToV0Message(alts);
const tx = new VersionedTransaction(message);
const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
const out = {
  network: "mainnet",
  locateProtocol: false,
  label: "External Mainnet DEX simulation. Not a LOCATE protocol transaction. No transaction was sent.",
  mainnetTransaction: false,
  wallet,
  mint: OPENAI,
  amountRaw: amount,
  quote: {
    inAmount: quote.inAmount,
    outAmount: quote.outAmount,
    otherAmountThreshold: quote.otherAmountThreshold,
    route: (quote.routePlan ?? []).map((hop) => hop.swapInfo?.label).filter(Boolean),
    priceImpactPct: quote.priceImpactPct,
  },
  swapProgram: swapIx ? swapIx.programId.toBase58() : null,
  jupiterMatch: swapIx ? swapIx.programId.toBase58() === JUPITER : false,
  locateForbidden,
  messageBytes: message.serialize().length,
  simulation: sim.value.err ? "FAIL" : "PASS",
  error: sim.value.err ?? null,
  unitsConsumed: sim.value.unitsConsumed ?? null,
  logTail: (sim.value.logs ?? []).slice(-8),
  timestamp: new Date().toISOString(),
};
writeFileSync(new URL("../proof/mainnet-dex/sell-sim.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  simulation: out.simulation,
  jupiterMatch: out.jupiterMatch,
  locateForbidden: out.locateForbidden,
  inAmount: quote.inAmount,
  outAmount: quote.outAmount,
  minOut: quote.otherAmountThreshold,
  unitsConsumed: out.unitsConsumed,
  error: out.error,
}, null, 2));
