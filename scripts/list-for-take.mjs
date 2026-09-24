import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { buildListTx } from "../sdk/src/builders.ts";
import { DEVNET_USDC, LOCATE_PROGRAM_ID } from "../sdk/src/constants.ts";
import { offerPda } from "../sdk/src/pdas.ts";

const MINT = new PublicKey("9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P");
const PHANTOM = "Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}

function loadKey(name) {
  const raw = execFileSync("wsl", ["-u", "devmo", "cat", `/home/devmo/.config/solana/locate/${name}.json`], {
    encoding: "utf8",
  });
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

const connection = new Connection(envValue("SOLANA_RPC_URL_DEVNET"), "confirmed");
const lender = loadKey("devnet-lender");
if (lender.publicKey.toBase58() === PHANTOM) {
  throw new Error("CLI lender is the Phantom wallet; take would be a self-take.");
}
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
const ixs = buildListTx(terms, LOCATE_PROGRAM_ID);
const tx = new Transaction().add(...ixs);
const sig = await sendAndConfirmTransaction(connection, tx, [lender], { commitment: "confirmed", skipPreflight: false });
const offer = offerPda(terms.lender, terms.mint, terms.nonce, LOCATE_PROGRAM_ID);
console.log(JSON.stringify({
  lender: lender.publicKey.toBase58(),
  offer: offer.toBase58(),
  nonce: nonce.toString(),
  signature: sig,
  collateralUsdc: "1.00",
  termSecs: 60,
  graceSecs: 30,
}, null, 2));
