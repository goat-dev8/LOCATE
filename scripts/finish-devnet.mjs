import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { createHash } from "node:crypto";

const PROGRAM_ID = new PublicKey("F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6");
const MINT = new PublicKey("9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P");
const USDC = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const SYSTEM = new PublicKey("11111111111111111111111111111111");
const N = 2_018_660n;
const K = 1_000_000n;
const FEE = 50_000n;
const env = readFileSync("d:/route/sol/LOCATE/.env", "utf8");
const rpc = env.split(/\n/).find((l) => l.startsWith("SOLANA_RPC_URL_DEVNET=")).split("=").slice(1).join("=").trim();
const connection = new Connection(rpc, "confirmed");

function loadKey(name) {
  const raw = execFileSync("wsl", ["-u", "devmo", "cat", `/home/devmo/.config/solana/locate/${name}.json`], { encoding: "utf8" });
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}
function u64(n) { const b = Buffer.alloc(8); b.writeBigUInt64LE(n); return b; }
function i64(n) { const b = Buffer.alloc(8); b.writeBigInt64LE(n); return b; }
function disc(name) { return createHash("sha256").update("global:" + name).digest().subarray(0, 8); }
function ata(owner, mint, tokenProgram) {
  return PublicKey.findProgramAddressSync([owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()], ATA)[0];
}
const lender = loadKey("devnet-lender");
const borrower = loadKey("devnet-borrower");
const offer = PublicKey.findProgramAddressSync([Buffer.from("offer"), lender.publicKey.toBuffer(), MINT.toBuffer(), u64(3n)], PROGRAM_ID)[0];
const loan = PublicKey.findProgramAddressSync([Buffer.from("loan"), offer.toBuffer()], PROGRAM_ID)[0];
const eventAuth = PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], PROGRAM_ID)[0];
const take = new TransactionInstruction({
  programId: PROGRAM_ID,
  data: Buffer.concat([disc("take_offer"), u64(N), u64(K), u64(FEE), i64(60n)]),
  keys: [
    { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
    { pubkey: lender.publicKey, isSigner: false, isWritable: true },
    { pubkey: offer, isSigner: false, isWritable: true },
    { pubkey: MINT, isSigner: false, isWritable: false },
    { pubkey: ata(lender.publicKey, MINT, TOKEN_2022), isSigner: false, isWritable: true },
    { pubkey: ata(borrower.publicKey, MINT, TOKEN_2022), isSigner: false, isWritable: true },
    { pubkey: loan, isSigner: false, isWritable: true },
    { pubkey: ata(loan, USDC, TOKEN), isSigner: false, isWritable: true },
    { pubkey: USDC, isSigner: false, isWritable: false },
    { pubkey: ata(borrower.publicKey, USDC, TOKEN), isSigner: false, isWritable: true },
    { pubkey: ata(lender.publicKey, USDC, TOKEN), isSigner: false, isWritable: true },
    { pubkey: MEMO, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
    { pubkey: TOKEN, isSigner: false, isWritable: false },
    { pubkey: ATA, isSigner: false, isWritable: false },
    { pubkey: SYSTEM, isSigner: false, isWritable: false },
    { pubkey: eventAuth, isSigner: false, isWritable: false },
    { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
  ],
});
const tx = new Transaction().add(take);
tx.feePayer = borrower.publicKey;
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
tx.sign(borrower);
const sim = await connection.simulateTransaction(tx);
console.log("PAUSED_TAKE_ERR", JSON.stringify(sim.value.err));
const hit = (sim.value.logs || []).some((l) => l.includes("paused") || l.includes("6008") || l.includes("TakeRefused"));
console.log("PAUSED_LOG_HIT", hit);
if (sim.value.err == null) process.exit(2);

const labeled = [
  ["create", "2PgXCZhh2HiGDguNVFka1JKhjoPxyGeBoWv4acS5uNB3vMiGHnLVHjqJFf2DfcHyAczEa6tWSgcrvQEikqVstyTi"],
  ["take", "5dE2AyTW8quE1hjKjJZrHjBTocmRb9HnSommsF9toyjraF27TdvtzKnKgw4K3cFmq6gkajz9Get5KhnyvcxHyq4w"],
  ["return", "2of8HQPVcY2XpjJCHcs95uho9W5UuACwonPCDDdAJuWYco6JPKM9kF2q4t6NAST2nFRyeuphytcHYY2hxH5hXEP7"],
  ["create-claim-cycle", "eepbfCzTp2YsHdDBdRvqjjGHEuqAFyAyDovnq9GL5RYtkni99p5pKoHYnqNMyJ5r88hQoDWw6MyknUsDFUXF1ep"],
  ["take-claim-cycle", "64scdqzbA3jooNoDZKWQLTsY24joDkWft6enWBKqR1G318G7QqALm7WjFbTbGFKrnZHqcXj3kLqQxtZuEsE3GNaA"],
  ["claim", "653KdWNMynZzpronirJKQTHhFybZsi7PUGfhPaa4zp4QcfeHXmt9ecvvKP5dDDFQs9D9eR7zKbDSctQ4rhNZkxkq"],
  ["create-pause-cycle", "2Sv4qQGyugUn96oe41SikzPtsSGPAN2RrKWhB41FYfqgpVMmGN56WFzM7kESSzci3aamX39cethDPZuQP2VZGgx4"],
];
const records = [];
for (const [kind, signature] of labeled) {
  const parsed = await connection.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  const logs = parsed?.meta?.logMessages ?? [];
  console.log(kind, parsed?.meta?.err ? "ERR" : "OK", logs.find((l) => l.includes("Instruction:")) || "");
  records.push({
    cluster: "devnet",
    label: "devnet test mint mirroring OPENAI's extensions; not a PreStocks token",
    kind,
    signature,
    slot: parsed?.slot ?? null,
    blockTime: parsed?.blockTime ?? null,
    err: parsed?.meta?.err ?? null,
    logs,
    preTokenBalances: parsed?.meta?.preTokenBalances ?? null,
    postTokenBalances: parsed?.meta?.postTokenBalances ?? null,
    programId: PROGRAM_ID.toBase58(),
    fetchedAt: new Date().toISOString(),
  });
}
const base = {
  programId: PROGRAM_ID.toBase58(),
  mint: MINT.toBase58(),
  mintLabel: "devnet test mint mirroring OPENAI's extensions; not a PreStocks token",
  usdc: USDC.toBase58(),
  lender: lender.publicKey.toBase58(),
  borrower: borrower.publicKey.toBase58(),
};
const dir = "d:/route/sol/LOCATE/evidence/devnet";
mkdirSync(dir, { recursive: true });
writeFileSync(dir + "/cycle-return.json", JSON.stringify({ ...base, signatures: { create: labeled[0][1], take: labeled[1][1], return: labeled[2][1] }, records: records.slice(0, 3) }, null, 2) + "\n");
writeFileSync(dir + "/cycle-claim.json", JSON.stringify({ ...base, signatures: { create: labeled[3][1], take: labeled[4][1], claim: labeled[5][1] }, records: records.slice(3, 6) }, null, 2) + "\n");
writeFileSync(dir + "/refusals.json", JSON.stringify({
  ...base,
  earlyClaimSimulation: { err: "recorded in the run log as a rejected simulation before claim; claim signature landed only after the wait", claimSignature: labeled[5][1] },
  pausedTakeSimulation: { err: sim.value.err, logs: sim.value.logs, note: "simulation, not a landed transaction" },
}, null, 2) + "\n");
console.log("WROTE");
