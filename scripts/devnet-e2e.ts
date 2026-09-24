/**
 * Real devnet cycles for LOCATE.
 * The mint is a devnet test mint mirroring OPENAI's extensions; not a PreStocks token.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { fetchEvidence, writeEvidence } from "./evidence.ts";

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
const KEY_DIR = "/home/devmo/.config/solana/locate";

function envValue(name: string): string {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim();
  }
  throw new Error("missing " + name);
}

function loadKey(name: string): Keypair {
  const raw = execFileSync("wsl", ["-u", "devmo", "cat", `${KEY_DIR}/${name}.json`], {
    encoding: "utf8",
  });
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

function disc(name: string): Buffer {
  return createHash("sha256").update("global:" + name).digest().subarray(0, 8);
}

function u64(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
}

function i64(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(n);
  return b;
}

function ata(owner: PublicKey, mint: PublicKey, tokenProgram: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
    ATA,
  )[0];
}

function offerPda(lender: PublicKey, nonce: bigint): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("offer"), lender.toBuffer(), MINT.toBuffer(), u64(nonce)],
    PROGRAM_ID,
  )[0];
}

function loanPda(offer: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("loan"), offer.toBuffer()], PROGRAM_ID)[0];
}

const EVENT_AUTHORITY = PublicKey.findProgramAddressSync(
  [Buffer.from("__event_authority")],
  PROGRAM_ID,
)[0];

function epochFee(amount: bigint): bigint {
  return (amount * 100n + 9999n) / 10000n;
}

function grossForNet(net: bigint): bigint {
  const denom = 10000n - 100n;
  let gross = net + (net * 100n + denom - 1n) / denom;
  for (let i = 0; i < 3; i++) {
    if (gross - epochFee(gross) >= net) break;
    gross += 1n;
  }
  while (gross > net) {
    const prev = gross - 1n;
    if (prev - epochFee(prev) >= net) gross = prev;
    else break;
  }
  return gross;
}

function approveChecked(owner: PublicKey, source: PublicKey, delegate: PublicKey, amount: bigint) {
  const data = Buffer.concat([Buffer.from([13]), u64(amount), Buffer.from([9])]);
  return new TransactionInstruction({
    programId: TOKEN_2022,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: MINT, isSigner: false, isWritable: false },
      { pubkey: delegate, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

function createIx(lender: PublicKey, nonce: bigint, term: bigint, grace: bigint, expiresAt: bigint) {
  const offer = offerPda(lender, nonce);
  const data = Buffer.concat([
    disc("create_offer"),
    u64(nonce),
    u64(N),
    u64(K),
    u64(FEE),
    i64(term),
    i64(grace),
    i64(expiresAt),
  ]);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: lender, isSigner: true, isWritable: true },
      { pubkey: MINT, isSigner: false, isWritable: false },
      { pubkey: ata(lender, MINT, TOKEN_2022), isSigner: false, isWritable: true },
      { pubkey: offer, isSigner: false, isWritable: true },
      { pubkey: USDC, isSigner: false, isWritable: false },
      { pubkey: ata(lender, USDC, TOKEN), isSigner: false, isWritable: true },
      { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
      { pubkey: TOKEN, isSigner: false, isWritable: false },
      { pubkey: ATA, isSigner: false, isWritable: false },
      { pubkey: SYSTEM, isSigner: false, isWritable: false },
      { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function takeIx(lender: PublicKey, borrower: PublicKey, nonce: bigint, term: bigint) {
  const offer = offerPda(lender, nonce);
  const loan = loanPda(offer);
  const data = Buffer.concat([disc("take_offer"), u64(N), u64(K), u64(FEE), i64(term)]);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: borrower, isSigner: true, isWritable: true },
      { pubkey: lender, isSigner: false, isWritable: true },
      { pubkey: offer, isSigner: false, isWritable: true },
      { pubkey: MINT, isSigner: false, isWritable: false },
      { pubkey: ata(lender, MINT, TOKEN_2022), isSigner: false, isWritable: true },
      { pubkey: ata(borrower, MINT, TOKEN_2022), isSigner: false, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: ata(loan, USDC, TOKEN), isSigner: false, isWritable: true },
      { pubkey: USDC, isSigner: false, isWritable: false },
      { pubkey: ata(borrower, USDC, TOKEN), isSigner: false, isWritable: true },
      { pubkey: ata(lender, USDC, TOKEN), isSigner: false, isWritable: true },
      { pubkey: MEMO, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
      { pubkey: TOKEN, isSigner: false, isWritable: false },
      { pubkey: ATA, isSigner: false, isWritable: false },
      { pubkey: SYSTEM, isSigner: false, isWritable: false },
      { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function returnIx(lender: PublicKey, borrower: PublicKey, nonce: bigint, maxGross: bigint) {
  const offer = offerPda(lender, nonce);
  const loan = loanPda(offer);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: borrower, isSigner: true, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: MINT, isSigner: false, isWritable: false },
      { pubkey: ata(borrower, MINT, TOKEN_2022), isSigner: false, isWritable: true },
      { pubkey: lender, isSigner: false, isWritable: false },
      { pubkey: ata(lender, MINT, TOKEN_2022), isSigner: false, isWritable: true },
      { pubkey: ata(loan, USDC, TOKEN), isSigner: false, isWritable: true },
      { pubkey: ata(borrower, USDC, TOKEN), isSigner: false, isWritable: true },
      { pubkey: USDC, isSigner: false, isWritable: false },
      { pubkey: MEMO, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
      { pubkey: TOKEN, isSigner: false, isWritable: false },
      { pubkey: ATA, isSigner: false, isWritable: false },
      { pubkey: SYSTEM, isSigner: false, isWritable: false },
      { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc("return_loan"), u64(maxGross)]),
  });
}

function claimIx(lender: PublicKey, borrower: PublicKey, caller: PublicKey, nonce: bigint) {
  const offer = offerPda(lender, nonce);
  const loan = loanPda(offer);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: caller, isSigner: true, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: borrower, isSigner: false, isWritable: true },
      { pubkey: lender, isSigner: false, isWritable: false },
      { pubkey: MINT, isSigner: false, isWritable: false },
      { pubkey: ata(loan, USDC, TOKEN), isSigner: false, isWritable: true },
      { pubkey: ata(lender, USDC, TOKEN), isSigner: false, isWritable: true },
      { pubkey: USDC, isSigner: false, isWritable: false },
      { pubkey: TOKEN, isSigner: false, isWritable: false },
      { pubkey: ATA, isSigner: false, isWritable: false },
      { pubkey: SYSTEM, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
      { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: disc("claim_collateral"),
  });
}

async function send(
  connection: Connection,
  payer: Keypair,
  ixs: TransactionInstruction[],
  signers: Keypair[],
): Promise<string> {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = payer.publicKey;
  const sig = await sendAndConfirmTransaction(connection, tx, signers, {
    commitment: "confirmed",
    skipPreflight: false,
  });
  return sig;
}

async function simulate(
  connection: Connection,
  payer: Keypair,
  ix: TransactionInstruction,
): Promise<{ err: unknown; logs: string[] | null }> {
  const tx = new Transaction().add(ix);
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(payer);
  const sim = await connection.simulateTransaction(tx);
  return { err: sim.value.err, logs: sim.value.logs };
}

function spl(args: string[]) {
  const script = [
    "#!/bin/bash",
    "set -euo pipefail",
    'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"',
    "RPC=$(python3 - <<'PY'",
    "from pathlib import Path",
    'for line in Path("/mnt/d/route/sol/LOCATE/.env").read_text().splitlines():',
    '    if line.startswith("SOLANA_RPC_URL_DEVNET="):',
    '        print(line.split("=",1)[1].strip()); break',
    "PY",
    ")",
    `spl-token --url "$RPC" --program-2022 --fee-payer "$HOME/.config/solana/locate/deployer.json" ${args.join(" ")}`,
    "",
  ].join("\n");
  const file = "C:/Users/LOQ/AppData/Local/Temp/locate-derive/spl-call.sh";
  writeFileSync(file, script);
  execFileSync("wsl", ["-u", "devmo", "bash", "-c", "sed -i 's/\\r$//' /mnt/c/Users/LOQ/AppData/Local/Temp/locate-derive/spl-call.sh && bash /mnt/c/Users/LOQ/AppData/Local/Temp/locate-derive/spl-call.sh"], { stdio: "inherit" });
}

async function main() {
  const connection = new Connection(envValue("SOLANA_RPC_URL_DEVNET"), "confirmed");
  const lender = loadKey("devnet-lender");
  const borrower = loadKey("devnet-borrower");
  const gross = grossForNet(N);
  const usdc = await connection.getTokenAccountBalance(ata(borrower.publicKey, USDC, TOKEN));
  if (BigInt(usdc.value.amount) < (K + FEE) * 2n) {
    throw new Error(
      "borrower devnet USDC is " +
        usdc.value.amount +
        "; need at least " +
        ((K + FEE) * 2n).toString() +
        " raw at " +
        borrower.publicKey.toBase58(),
    );
  }

  const now = BigInt(Math.floor(Date.now() / 1000));
  const out: Record<string, unknown> = {
    programId: PROGRAM_ID.toBase58(),
    mint: MINT.toBase58(),
    mintLabel: "devnet test mint mirroring OPENAI's extensions; not a PreStocks token",
    usdc: USDC.toBase58(),
    lender: lender.publicKey.toBase58(),
    borrower: borrower.publicKey.toBase58(),
    gross: gross.toString(),
  };

  const sigCreate = await send(
    connection,
    lender,
    [approveChecked(lender.publicKey, ata(lender.publicKey, MINT, TOKEN_2022), offerPda(lender.publicKey, 1n), N), createIx(lender.publicKey, 1n, 3600n, 30n, now + 86400n)],
    [lender],
  );
  const sigTake = await send(connection, borrower, [takeIx(lender.publicKey, borrower.publicKey, 1n, 3600n)], [borrower]);
  const loan1 = loanPda(offerPda(lender.publicKey, 1n));
  const sigReturn = await send(
    connection,
    borrower,
    [approveChecked(borrower.publicKey, ata(borrower.publicKey, MINT, TOKEN_2022), loan1, gross), returnIx(lender.publicKey, borrower.publicKey, 1n, gross)],
    [borrower],
  );

  const sigCreate2 = await send(
    connection,
    lender,
    [approveChecked(lender.publicKey, ata(lender.publicKey, MINT, TOKEN_2022), offerPda(lender.publicKey, 2n), N), createIx(lender.publicKey, 2n, 60n, 30n, now + 86400n)],
    [lender],
  );
  const sigTake2 = await send(connection, borrower, [takeIx(lender.publicKey, borrower.publicKey, 2n, 60n)], [borrower]);
  const early = await simulate(connection, lender, claimIx(lender.publicKey, borrower.publicKey, lender.publicKey, 2n));
  if (early.err == null) throw new Error("early claim was accepted");
  await new Promise((r) => setTimeout(r, 95_000));
  const sigClaim = await send(
    connection,
    lender,
    [claimIx(lender.publicKey, borrower.publicKey, lender.publicKey, 2n)],
    [lender],
  );

  const sigCreate3 = await send(
    connection,
    lender,
    [approveChecked(lender.publicKey, ata(lender.publicKey, MINT, TOKEN_2022), offerPda(lender.publicKey, 3n), N), createIx(lender.publicKey, 3n, 60n, 30n, now + 86400n)],
    [lender],
  );
  spl([
    "pause",
    MINT.toBase58(),
    "--pause-authority",
    "$HOME/.config/solana/locate/devnet-issuer.json",
  ]);
  const paused = await simulate(connection, borrower, takeIx(lender.publicKey, borrower.publicKey, 3n, 60n));
  if (paused.err == null) throw new Error("paused take was accepted");
  spl([
    "resume",
    MINT.toBase58(),
    "--pause-authority",
    "$HOME/.config/solana/locate/devnet-issuer.json",
  ]);

  const kinds: Array<[string, string | null, unknown?]> = [
    ["create", sigCreate],
    ["take", sigTake],
    ["return", sigReturn],
    ["create-claim-cycle", sigCreate2],
    ["take-claim-cycle", sigTake2],
    ["claim", sigClaim],
    ["create-pause-cycle", sigCreate3],
  ];
  const records = [];
  for (const [kind, sig] of kinds) {
    records.push(await fetchEvidence(connection, sig, kind, PROGRAM_ID.toBase58()));
  }
  const root = new URL("../evidence/devnet/", import.meta.url);
  writeEvidence(fileURLToPath(new URL("cycle-return.json", root)), {
    ...out,
    signatures: { create: sigCreate, take: sigTake, return: sigReturn },
    records: records.slice(0, 3),
  });
  writeEvidence(fileURLToPath(new URL("cycle-claim.json", root)), {
    ...out,
    signatures: { create: sigCreate2, take: sigTake2, claim: sigClaim },
    records: records.slice(3, 6),
  });
  writeEvidence(fileURLToPath(new URL("refusals.json", root)), {
    ...out,
    earlyClaimSimulation: early,
    pausedTakeSimulation: paused,
    note: "These two records are simulations, not landed transactions.",
  });
  console.log(JSON.stringify({ sigCreate, sigTake, sigReturn, sigClaim, early: early.err, paused: paused.err }));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
