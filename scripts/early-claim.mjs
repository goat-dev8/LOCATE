import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction,
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
const EVENT = PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], PROGRAM_ID)[0];
const N = 2018660n, K = 1000000n, FEE = 50000n;
const env = readFileSync("d:/route/sol/LOCATE/.env", "utf8");
const rpc = env.split(/\n/).find((l) => l.startsWith("SOLANA_RPC_URL_DEVNET=")).split("=").slice(1).join("=").trim();
const connection = new Connection(rpc, "confirmed");
function loadKey(name) {
  const raw = execFileSync("wsl", ["-u", "devmo", "cat", `/home/devmo/.config/solana/locate/${name}.json`], { encoding: "utf8" });
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(n); return b; };
const i64 = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(n); return b; };
const disc = (name) => createHash("sha256").update("global:" + name).digest().subarray(0, 8);
const ata = (o, m, p) => PublicKey.findProgramAddressSync([o.toBuffer(), p.toBuffer(), m.toBuffer()], ATA)[0];
function epochFee(amount) { return (amount * 100n + 9999n) / 10000n; }
function grossForNet(net) {
  const denom = 9900n;
  let gross = net + (net * 100n + denom - 1n) / denom;
  for (let i = 0; i < 3; i++) { if (gross - epochFee(gross) >= net) break; gross += 1n; }
  while (gross > net) { const prev = gross - 1n; if (prev - epochFee(prev) >= net) gross = prev; else break; }
  return gross;
}
const lender = loadKey("devnet-lender");
const borrower = loadKey("devnet-borrower");
const offer = PublicKey.findProgramAddressSync([Buffer.from("offer"), lender.publicKey.toBuffer(), MINT.toBuffer(), u64(3n)], PROGRAM_ID)[0];
const loan = PublicKey.findProgramAddressSync([Buffer.from("loan"), offer.toBuffer()], PROGRAM_ID)[0];
const take = new TransactionInstruction({
  programId: PROGRAM_ID,
  data: Buffer.concat([disc("take_offer"), u64(N), u64(K), u64(FEE), i64(60n)]),
  keys: [
    [borrower.publicKey, true, true], [lender.publicKey, false, true], [offer, false, true], [MINT, false, false],
    [ata(lender.publicKey, MINT, TOKEN_2022), false, true], [ata(borrower.publicKey, MINT, TOKEN_2022), false, true],
    [loan, false, true], [ata(loan, USDC, TOKEN), false, true], [USDC, false, false],
    [ata(borrower.publicKey, USDC, TOKEN), false, true], [ata(lender.publicKey, USDC, TOKEN), false, true],
    [MEMO, false, false], [TOKEN_2022, false, false], [TOKEN, false, false], [ATA, false, false], [SYSTEM, false, false],
    [EVENT, false, false], [PROGRAM_ID, false, false],
  ].map(([pubkey, isSigner, isWritable]) => ({ pubkey, isSigner, isWritable })),
});
const claim = new TransactionInstruction({
  programId: PROGRAM_ID,
  data: disc("claim_collateral"),
  keys: [
    [lender.publicKey, true, true], [loan, false, true], [borrower.publicKey, false, true], [lender.publicKey, false, false],
    [MINT, false, false], [ata(loan, USDC, TOKEN), false, true], [ata(lender.publicKey, USDC, TOKEN), false, true],
    [USDC, false, false], [TOKEN, false, false], [ATA, false, false], [SYSTEM, false, false], [TOKEN_2022, false, false],
    [EVENT, false, false], [PROGRAM_ID, false, false],
  ].map(([pubkey, isSigner, isWritable]) => ({ pubkey, isSigner, isWritable })),
});
const gross = grossForNet(N);
const approve = new TransactionInstruction({
  programId: TOKEN_2022,
  data: Buffer.concat([Buffer.from([13]), u64(gross), Buffer.from([9])]),
  keys: [
    { pubkey: ata(borrower.publicKey, MINT, TOKEN_2022), isSigner: false, isWritable: true },
    { pubkey: MINT, isSigner: false, isWritable: false },
    { pubkey: loan, isSigner: false, isWritable: false },
    { pubkey: borrower.publicKey, isSigner: true, isWritable: false },
  ],
});
const ret = new TransactionInstruction({
  programId: PROGRAM_ID,
  data: Buffer.concat([disc("return_loan"), u64(gross)]),
  keys: [
    [borrower.publicKey, true, true], [loan, false, true], [MINT, false, false],
    [ata(borrower.publicKey, MINT, TOKEN_2022), false, true], [lender.publicKey, false, false],
    [ata(lender.publicKey, MINT, TOKEN_2022), false, true], [ata(loan, USDC, TOKEN), false, true],
    [ata(borrower.publicKey, USDC, TOKEN), false, true], [USDC, false, false], [MEMO, false, false],
    [TOKEN_2022, false, false], [TOKEN, false, false], [ATA, false, false], [SYSTEM, false, false],
    [EVENT, false, false], [PROGRAM_ID, false, false],
  ].map(([pubkey, isSigner, isWritable]) => ({ pubkey, isSigner, isWritable })),
});
const takeSig = await sendAndConfirmTransaction(connection, new Transaction().add(take), [borrower], { commitment: "confirmed" });
const earlyTx = new Transaction().add(claim);
earlyTx.feePayer = lender.publicKey;
earlyTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
earlyTx.sign(lender);
const sim = await connection.simulateTransaction(earlyTx);
const returnSig = await sendAndConfirmTransaction(connection, new Transaction().add(approve, ret), [borrower], { commitment: "confirmed" });
console.log("TAKE", takeSig);
console.log("EARLY", JSON.stringify(sim.value.err));
console.log("RETURN", returnSig);
if (sim.value.err == null) process.exit(2);
const fs = await import("node:fs");
const path = "d:/route/sol/LOCATE/evidence/devnet/refusals.json";
const doc = JSON.parse(fs.readFileSync(path, "utf8"));
doc.earlyClaimSimulation = {
  err: sim.value.err,
  logs: sim.value.logs,
  note: "simulation, not a landed transaction",
  loanTakenSignature: takeSig,
  loanReturnedSignature: returnSig,
};
fs.writeFileSync(path, JSON.stringify(doc, null, 2) + "\n");
console.log("UPDATED");
