import { writeFileSync, readFileSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}

const signature = "2C4CND6FqBiTgPzgNQojHKa6KzL221gd2Zm4BiyP7WCRnmichUF3m9ptF9xs7pDgTVaa9GMm6eYtqmUnQMbqmuzr";
const wallet = "Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC";
const OPENAI = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ATA = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const LOCATE = "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6";
const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

function ata(owner, mint, program) {
  return PublicKey.findProgramAddressSync(
    [new PublicKey(owner).toBuffer(), new PublicKey(program).toBuffer(), new PublicKey(mint).toBuffer()],
    new PublicKey(ATA),
  )[0];
}

const rpc = envValue("SOLANA_RPC_URL_MAINNET");
const connection = new Connection(rpc, "confirmed");
const before = JSON.parse(readFileSync(new URL("../proof/mainnet-dex/balance-before.json", import.meta.url), "utf8"));

const tx = await connection.getTransaction(signature, {
  commitment: "finalized",
  maxSupportedTransactionVersion: 0,
});
if (!tx) throw new Error("transaction not found");
const serialized = JSON.stringify(tx);
const [sol, openai, usdc] = await Promise.all([
  connection.getBalance(new PublicKey(wallet), "finalized"),
  connection.getTokenAccountBalance(ata(wallet, OPENAI, TOKEN_2022), "finalized"),
  connection.getTokenAccountBalance(ata(wallet, USDC, TOKEN), "finalized"),
]);

const after = {
  network: "mainnet",
  locateProtocol: false,
  label: "External Mainnet DEX balances after sell. Not a LOCATE protocol transaction.",
  wallet,
  mint: OPENAI,
  usdcMint: USDC,
  solLamports: String(sol),
  openaiRaw: openai.value.amount,
  usdcRaw: usdc.value.amount,
  slot: tx.slot,
  fetchedAt: new Date().toISOString(),
  source: "finalized RPC after signature " + signature,
};

const solDelta = BigInt(after.solLamports) - BigInt(before.solLamports);
const openaiDelta = BigInt(after.openaiRaw) - BigInt(before.openaiRaw);
const usdcDelta = BigInt(after.usdcRaw) - BigInt(before.usdcRaw);
const fee = tx.meta?.fee ?? null;

const sell = {
  network: "mainnet",
  locateProtocol: false,
  label: "External Mainnet DEX sell. Not a LOCATE protocol transaction.",
  result: tx.meta?.err == null && openaiDelta === -1000n && usdcDelta === 1982n ? "PASS" : "FAIL",
  mainnetTransaction: true,
  signature,
  slot: tx.slot,
  blockTime: tx.blockTime,
  err: tx.meta?.err ?? null,
  wallet,
  mint: OPENAI,
  amountRaw: "1000",
  quoteOutRaw: "1982",
  minOutRaw: "1963",
  actualOutRaw: usdcDelta.toString(),
  route: ["Meteora DLMM", "Meteora DLMM"],
  containsLocate: serialized.includes(LOCATE),
  containsJupiter: serialized.includes(JUPITER),
  txFeeLamports: fee,
  solDelta: solDelta.toString(),
  openaiDelta: openaiDelta.toString(),
  usdcDelta: usdcDelta.toString(),
  timestamp: new Date().toISOString(),
};

const receipts = {
  network: "mainnet",
  locateProtocol: false,
  label: "External Mainnet DEX receipts. Not LOCATE protocol receipts.",
  receipts: [
    {
      kind: "external_dex_sell",
      signature,
      slot: tx.slot,
      err: tx.meta?.err ?? null,
      commitment: "finalized",
    },
  ],
};

writeFileSync(new URL("../proof/mainnet-dex/balance-after.json", import.meta.url), JSON.stringify(after, null, 2));
writeFileSync(new URL("../proof/mainnet-dex/sell.json", import.meta.url), JSON.stringify(sell, null, 2));
writeFileSync(new URL("../proof/mainnet-dex/receipts.json", import.meta.url), JSON.stringify(receipts, null, 2));
console.log(JSON.stringify({
  err: tx.meta?.err ?? null,
  slot: tx.slot,
  fee,
  containsLocate: sell.containsLocate,
  containsJupiter: sell.containsJupiter,
  before: { sol: before.solLamports, openai: before.openaiRaw, usdc: before.usdcRaw },
  after: { sol: after.solLamports, openai: after.openaiRaw, usdc: after.usdcRaw },
  delta: { sol: solDelta.toString(), openai: openaiDelta.toString(), usdc: usdcDelta.toString() },
  result: sell.result,
}, null, 2));
