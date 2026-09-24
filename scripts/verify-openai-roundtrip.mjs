import { writeFileSync, readFileSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}

const wallet = "Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC";
const OPENAI = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ATA = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const LOCATE = "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6";
const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const sell1 = "2C4CND6FqBiTgPzgNQojHKa6KzL221gd2Zm4BiyP7WCRnmichUF3m9ptF9xs7pDgTVaa9GMm6eYtqmUnQMbqmuzr";
const sell2 = "4FmrxJKrUUaauhd7tksKFZK1xhJTFB7C6AjYq8dcVv7tnArQZY5woCEBzTeKCuKH1AbzRs3mQcwaGTKD6pVPcKSw";
const buyback = "5cHQQxCByufmPazGRqKPgfdPDVJHMvCVFkz3NdutoPjrjc1p6RhboJXcjzMmQRgcQ8KoqkQNH8NJSGnpPRQZgR6F";

function ata(owner, mint, program) {
  return PublicKey.findProgramAddressSync(
    [new PublicKey(owner).toBuffer(), new PublicKey(program).toBuffer(), new PublicKey(mint).toBuffer()],
    new PublicKey(ATA),
  )[0];
}

const rpc = envValue("SOLANA_RPC_URL_MAINNET");
const connection = new Connection(rpc, "confirmed");

async function loadTx(signature) {
  const tx = await connection.getTransaction(signature, {
    commitment: "finalized",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) throw new Error("missing " + signature);
  const text = JSON.stringify(tx);
  return {
    signature,
    slot: tx.slot,
    blockTime: tx.blockTime,
    err: tx.meta?.err ?? null,
    fee: tx.meta?.fee ?? null,
    containsLocate: text.includes(LOCATE),
    containsJupiter: text.includes(JUPITER),
    programIds: [
      ...new Set((tx.transaction.message.staticAccountKeys ?? []).map((k) => k.toBase58())),
    ].filter((id) => id === LOCATE || id === JUPITER),
  };
}

const [sol, openai, usdc, s1, s2, buy] = await Promise.all([
  connection.getBalance(new PublicKey(wallet), "finalized"),
  connection.getTokenAccountBalance(ata(wallet, OPENAI, TOKEN_2022), "finalized"),
  connection.getTokenAccountBalance(ata(wallet, USDC, TOKEN), "finalized"),
  loadTx(sell1),
  loadTx(sell2),
  loadTx(buyback),
]);

const after = {
  network: "mainnet",
  locateProtocol: false,
  label: "External Mainnet DEX balances after buyback. Not a LOCATE protocol transaction.",
  wallet,
  mint: OPENAI,
  usdcMint: USDC,
  solLamports: String(sol),
  openaiRaw: openai.value.amount,
  usdcRaw: usdc.value.amount,
  fetchedAt: new Date().toISOString(),
  source: "finalized RPC after buyback " + buyback,
};

const sell2Proof = {
  network: "mainnet",
  locateProtocol: false,
  label: "External Mainnet DEX second sell to obtain USDC for buyback. Not a LOCATE protocol transaction.",
  result: s2.err == null && !s2.containsLocate && s2.containsJupiter ? "PASS" : "FAIL",
  mainnetTransaction: true,
  ...s2,
  wallet,
  mint: OPENAI,
  amountRaw: "1000",
  quoteOutRaw: "1982",
  timestamp: new Date().toISOString(),
};

const openaiAfterBuy = BigInt(after.openaiRaw);
const buyProof = {
  network: "mainnet",
  locateProtocol: false,
  label: "External Mainnet DEX buyback. Not a LOCATE protocol transaction.",
  result: buy.err == null && !buy.containsLocate && buy.containsJupiter && openaiAfterBuy >= 942162n ? "PASS" : "FAIL",
  mainnetTransaction: true,
  ...buy,
  wallet,
  mint: OPENAI,
  inAmountUsdcRaw: "3964",
  quoteOutRaw: "1957",
  minOutRaw: "1938",
  actualOpenAiAfter: after.openaiRaw,
  openaiDeltaFromPreBuyback: (openaiAfterBuy - 941162n).toString(),
  usdcAfter: after.usdcRaw,
  requiredOpenAiRaw: "1000",
  swapMode: "ExactIn",
  route: ["Meteora DLMM", "Meteora DLMM"],
  timestamp: new Date().toISOString(),
};

const receipts = {
  network: "mainnet",
  locateProtocol: false,
  label: "External Mainnet DEX receipts. Not LOCATE protocol receipts.",
  receipts: [
    { kind: "external_dex_sell", signature: sell1, slot: s1.slot, err: s1.err, commitment: "finalized" },
    { kind: "external_dex_sell", signature: sell2, slot: s2.slot, err: s2.err, commitment: "finalized" },
    { kind: "external_dex_buyback", signature: buyback, slot: buy.slot, err: buy.err, commitment: "finalized" },
  ],
};

writeFileSync(new URL("../proof/mainnet-dex/balance-after-buyback.json", import.meta.url), JSON.stringify(after, null, 2));
writeFileSync(new URL("../proof/mainnet-dex/sell-2.json", import.meta.url), JSON.stringify(sell2Proof, null, 2));
writeFileSync(new URL("../proof/mainnet-dex/buyback.json", import.meta.url), JSON.stringify(buyProof, null, 2));
writeFileSync(new URL("../proof/mainnet-dex/receipts.json", import.meta.url), JSON.stringify(receipts, null, 2));
console.log(JSON.stringify({
  sell1: { err: s1.err, slot: s1.slot, locate: s1.containsLocate, jupiter: s1.containsJupiter },
  sell2: { err: s2.err, slot: s2.slot, locate: s2.containsLocate, jupiter: s2.containsJupiter, result: sell2Proof.result },
  buyback: { err: buy.err, slot: buy.slot, locate: buy.containsLocate, jupiter: buy.containsJupiter, result: buyProof.result },
  after,
}, null, 2));
