import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { buildClaimTx, buildListTx, buildTakeTx } from "../sdk/src/builders.ts";
import { simulateAndDecode } from "../sdk/src/simulate.ts";
import { DEVNET_USDC, LOCATE_PROGRAM_ID } from "../sdk/src/constants.ts";
import { offerPda, loanPda } from "../sdk/src/pdas.ts";

const MINT = new PublicKey("9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P");

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
const borrower = loadKey("devnet-borrower");
const now = BigInt(Math.floor(Date.now() / 1000));
const nonce = BigInt(Date.now());
const terms = {
  lender: lender.publicKey,
  mint: MINT,
  usdcMint: DEVNET_USDC,
  nonce,
  amountRaw: 5_000_000n,
  collateralUsdc: 1_000_000n,
  feeUsdc: 50_000n,
  termSecs: 60n,
  graceSecs: 30n,
  expiresAt: now + 3600n,
  decimals: 9,
};
const listSig = await sendAndConfirmTransaction(connection, new Transaction().add(...buildListTx(terms, LOCATE_PROGRAM_ID)), [lender], { commitment: "confirmed" });
const takeSig = await sendAndConfirmTransaction(connection, new Transaction().add(...buildTakeTx(borrower.publicKey, terms, LOCATE_PROGRAM_ID)), [borrower], { commitment: "confirmed" });
const offer = offerPda(terms.lender, terms.mint, terms.nonce, LOCATE_PROGRAM_ID);
const loan = loanPda(offer, LOCATE_PROGRAM_ID);
const early = await simulateAndDecode(connection, lender.publicKey, buildClaimTx(lender.publicKey, borrower.publicKey, terms, LOCATE_PROGRAM_ID));
console.log(JSON.stringify({ listSig, takeSig, offer: offer.toBase58(), loan: loan.toBase58(), early: early.name ?? early.err ?? null, waitUntil: Number(now) + 90 }, null, 2));
await new Promise((r) => setTimeout(r, 95_000));
const claimSig = await sendAndConfirmTransaction(connection, new Transaction().add(...buildClaimTx(lender.publicKey, borrower.publicKey, terms, LOCATE_PROGRAM_ID)), [lender], { commitment: "confirmed" });
const out = { listSig, takeSig, claimSig, offer: offer.toBase58(), loan: loan.toBase58(), early: early.name ?? String(early.err ?? ""), utc: new Date().toISOString() };
writeFileSync(new URL("../evidence/qa/E-08-claim.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
