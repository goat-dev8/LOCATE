import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { buildClaimTx } from "../sdk/src/builders.ts";
import { DEVNET_USDC, LOCATE_PROGRAM_ID } from "../sdk/src/constants.ts";

const MINT = new PublicKey("9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P");
const BORROWER = new PublicKey("Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC");

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}
function loadKey(name) {
  const raw = execFileSync("wsl", ["-u", "devmo", "cat", `/home/devmo/.config/solana/locate/${name}.json`], { encoding: "utf8" });
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

const connection = new Connection(envValue("SOLANA_RPC_URL_DEVNET"), "confirmed");
const lender = loadKey("devnet-lender");
const terms = {
  lender: lender.publicKey,
  mint: MINT,
  usdcMint: DEVNET_USDC,
  nonce: 1790229337488n,
  amountRaw: 5_000_000n,
  collateralUsdc: 1_000_000n,
  feeUsdc: 50_000n,
  termSecs: 60n,
  graceSecs: 30n,
  expiresAt: 0n,
  decimals: 9,
};
const tx = new Transaction().add(...buildClaimTx(lender.publicKey, BORROWER, terms, LOCATE_PROGRAM_ID));
tx.feePayer = lender.publicKey;
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
tx.sign(lender);
const sim = await connection.simulateTransaction(tx);
const logs = sim.value.logs ?? [];
const hit = logs.some((l) => l.includes("ClaimRefusedNotMatured") || l.includes("6000") || l.includes("not matured") || l.includes("ClaimRefused"));
console.log(JSON.stringify({ err: sim.value.err, hit, logs: logs.filter((l) => /Claim|Error|failed/i.test(l)).slice(0, 12) }, null, 2));
if (sim.value.err == null) process.exit(2);
