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
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ATA = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const wallet = "Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC";
const base = envValue("JUPITER_API_BASE").replace(/\/$/, "");
const rpc = envValue("SOLANA_RPC_URL_MAINNET");

function ata(owner, mint, program) {
  return PublicKey.findProgramAddressSync(
    [new PublicKey(owner).toBuffer(), new PublicKey(program).toBuffer(), new PublicKey(mint).toBuffer()],
    new PublicKey(ATA),
  )[0];
}

const connection = new Connection(rpc, "confirmed");
const [sol, openai, usdc] = await Promise.all([
  connection.getBalance(new PublicKey(wallet), "confirmed"),
  connection.getTokenAccountBalance(ata(wallet, OPENAI, TOKEN_2022), "confirmed"),
  connection.getTokenAccountBalance(ata(wallet, USDC, TOKEN), "confirmed"),
]);
const usdcIn = usdc.value.amount;

async function quote(swapMode) {
  const params = new URLSearchParams({
    inputMint: USDC,
    outputMint: OPENAI,
    amount: swapMode === "ExactOut" ? "1000" : usdcIn,
    slippageBps: "100",
    dexes: "Meteora DLMM",
    maxAccounts: "40",
    swapMode,
  });
  const response = await fetch(base + "/swap/v1/quote?" + params);
  const body = await response.json();
  return {
    swapMode,
    status: response.status,
    inAmount: body.inAmount ?? null,
    outAmount: body.outAmount ?? null,
    error: body.error ?? body.errorCode ?? null,
    route: (body.routePlan ?? []).map((hop) => hop.swapInfo?.label).filter(Boolean),
  };
}

const exactOut = await quote("ExactOut");
const exactIn = await quote("ExactIn");
const outAmount = BigInt(exactIn.outAmount ?? "0");
const blocked = exactOut.status !== 200 && outAmount < 1000n;
const out = {
  network: "mainnet",
  locateProtocol: false,
  label: "External Mainnet DEX buyback. Not a LOCATE protocol transaction.",
  result: blocked ? "BLOCKED" : (exactOut.status === 200 || outAmount >= 1000n ? "QUOTED" : "BLOCKED"),
  mainnetTransaction: false,
  signature: null,
  wallet,
  walletSolLamports: String(sol),
  walletOpenAiRaw: openai.value.amount,
  walletUsdcRaw: usdcIn,
  requiredOpenAiRaw: "1000",
  exactOut,
  exactIn,
  reason: blocked
    ? ("MAINNET DEX EXECUTION BLOCKED reason: ExactOut for 1000 raw OpenAI has no sufficient route. Spending the entire "
      + usdcIn
      + " raw USDC ExactIn quotes "
      + (exactIn.outAmount ?? "0")
      + " raw OpenAI, below 1000. Wallet was not funded automatically.")
    : "Buyback quote is executable. Awaiting owner wallet approval.",
  timestamp: new Date().toISOString(),
};
writeFileSync(new URL("../proof/mainnet-dex/buyback-probe.json", import.meta.url), JSON.stringify(out, null, 2));
writeFileSync(new URL("../proof/mainnet-dex/buyback.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
