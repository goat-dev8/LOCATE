import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  AddressLookupTableProgram,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim();
  }
  throw new Error("missing " + name);
}

const PROGRAM = new PublicKey("F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6");
const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const SYSTEM = new PublicKey("11111111111111111111111111111111");
const USDC = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const MINT = new PublicKey("9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P");
const EVENT = PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], PROGRAM)[0];

const secret = execFileSync("wsl", ["-u", "devmo", "cat", "/home/devmo/.config/solana/locate/deployer.json"], { encoding: "utf8" });
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
const connection = new Connection(envValue("SOLANA_RPC_URL_DEVNET"), "confirmed");
const slot = await connection.getSlot("confirmed");
const [createIx, table] = AddressLookupTableProgram.createLookupTable({
  authority: payer.publicKey,
  payer: payer.publicKey,
  recentSlot: slot - 1,
});
const extendIx = AddressLookupTableProgram.extendLookupTable({
  payer: payer.publicKey,
  authority: payer.publicKey,
  lookupTable: table,
  addresses: [PROGRAM, EVENT, TOKEN_2022, TOKEN, ATA, MEMO, SYSTEM, USDC, MINT],
});
const createSig = await sendAndConfirmTransaction(connection, new Transaction().add(createIx), [payer]);
const extendSig = await sendAndConfirmTransaction(connection, new Transaction().add(extendIx), [payer]);
const info = await connection.getAddressLookupTable(table);
const evidence = {
  cluster: "devnet",
  lookupTable: table.toBase58(),
  authority: payer.publicKey.toBase58(),
  createSignature: createSig,
  extendSignature: extendSig,
  addresses: (info.value?.state.addresses ?? []).map((key) => key.toBase58()),
  slot: await connection.getSlot("confirmed"),
  fetchedAt: new Date().toISOString(),
  mintLabel: "devnet test mint mirroring OPENAI's extensions; not a PreStocks token",
};
mkdirSync(new URL("../evidence/integration/", import.meta.url), { recursive: true });
writeFileSync(new URL("../evidence/integration/devnet-alt.json", import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ lookupTable: evidence.lookupTable, addresses: evidence.addresses.length }));
