import { readFileSync, writeFileSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}

const OPENAI = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const wallet = "Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC";
const base = envValue("JUPITER_API_BASE").replace(/\/$/, "");
const rpc = envValue("SOLANA_RPC_URL_MAINNET");

async function quote(amount) {
  const params = new URLSearchParams({
    inputMint: OPENAI,
    outputMint: USDC,
    amount: String(amount),
    slippageBps: "100",
    dexes: "Meteora DLMM",
    maxAccounts: "40",
  });
  const started = Date.now();
  const response = await fetch(base + "/swap/v1/quote?" + params);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { unparsed: text.slice(0, 300) };
  }
  return {
    amount: String(amount),
    status: response.status,
    ms: Date.now() - started,
    inAmount: body.inAmount ?? null,
    outAmount: body.outAmount ?? null,
    otherAmountThreshold: body.otherAmountThreshold ?? null,
    error: body.error ?? body.errorCode ?? null,
    route: (body.routePlan ?? []).map((hop) => hop.swapInfo?.label).filter(Boolean),
    priceImpactPct: body.priceImpactPct ?? null,
    swapMode: body.swapMode ?? null,
  };
}

const connection = new Connection(rpc, "confirmed");
const [mint, epoch] = await Promise.all([
  connection.getAccountInfo(new PublicKey(OPENAI)),
  connection.getEpochInfo("confirmed"),
]);
const rows = [];
for (const amount of ["1", "1000", "10000", "100000", "943162"]) {
  rows.push(await quote(amount));
  await new Promise((resolve) => setTimeout(resolve, 800));
}
const out = {
  network: "mainnet",
  locateProtocol: false,
  wallet,
  mint: OPENAI,
  decimals: mint ? mint.data[44] : null,
  owner: mint ? mint.owner.toBase58() : null,
  epoch: epoch.epoch,
  slot: epoch.absoluteSlot,
  quotes: rows,
  timestamp: new Date().toISOString(),
};
writeFileSync(new URL("../proof/mainnet-dex/quotes-probe.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
