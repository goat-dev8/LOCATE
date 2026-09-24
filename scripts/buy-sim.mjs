import { readFileSync, writeFileSync } from "node:fs";
import { Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

const OPENAI = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const HOLDER = "5CEbueQnq1Ym2uSSx2xXds3jQAqT1BDnkA59RZobSPAG";
const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

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
    keys: raw.accounts.map((account) => ({ pubkey: new PublicKey(account.pubkey), isSigner: account.isSigner, isWritable: account.isWritable })),
    data: Buffer.from(raw.data, "base64"),
  });
}

const connection = new Connection(envValue("SOLANA_RPC_URL_MAINNET"), "confirmed");
const base = envValue("JUPITER_API_BASE").replace(/\/$/, "");
const quoteResponse = await fetch(base + "/swap/v1/quote?" + new URLSearchParams({
  inputMint: USDC,
  outputMint: OPENAI,
  amount: "3987285",
  slippageBps: "100",
  maxAccounts: "40",
}));
if (!quoteResponse.ok) throw new Error("buy quote " + quoteResponse.status);
const quote = await quoteResponse.json();
await new Promise((resolve) => setTimeout(resolve, 2000));
const swapResponse = await fetch(base + "/swap/v1/swap-instructions", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ quoteResponse: quote, userPublicKey: HOLDER, wrapAndUnwrapSol: false, dynamicComputeUnitLimit: true }),
});
if (!swapResponse.ok) throw new Error("buy swap " + swapResponse.status);
const swap = await swapResponse.json();
const swapIx = ix(swap.swapInstruction);
if (swapIx.programId.toBase58() !== JUPITER) throw new Error("unexpected swap program");
const alts = [];
for (const address of swap.addressLookupTableAddresses ?? []) {
  const table = await connection.getAddressLookupTable(new PublicKey(address));
  if (table.value) alts.push(table.value);
}
const instructions = [...(swap.computeBudgetInstructions ?? []).map(ix), ...(swap.setupInstructions ?? []).map(ix), swapIx, ix(swap.cleanupInstruction)].filter(Boolean);
const holder = new PublicKey(HOLDER);
const message = new TransactionMessage({
  payerKey: holder,
  recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
  instructions,
}).compileToV0Message(alts);
const sim = await connection.simulateTransaction(new VersionedTransaction(message), { sigVerify: false, replaceRecentBlockhash: true });
const evidencePath = new URL("../evidence/integration/tx-sizes.json", import.meta.url);
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
evidence.buyLeg = {
  simulation: true,
  usdcIn: "3987285",
  outAmount: quote.outAmount,
  otherAmountThreshold: quote.otherAmountThreshold,
  messageBytes: message.serialize().length,
  swapProgramId: swapIx.programId.toBase58(),
  err: sim.value.err,
  unitsConsumed: sim.value.unitsConsumed,
  logTail: (sim.value.logs ?? []).slice(-6),
  note: "simulateTransaction only. No mainnet transaction was sent.",
};
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ out: quote.outAmount, bytes: evidence.buyLeg.messageBytes, err: sim.value.err, units: sim.value.unitsConsumed }));
