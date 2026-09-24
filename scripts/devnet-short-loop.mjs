/**
 * Devnet LOCATE borrow, then a real DLMM sell and buyback, then return.
 * The mint is a DEVNET REPLICA / TEST ASSET — NOT A MAINNET PRESTOCK.
 * No mainnet transaction is sent.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../sdk/package.json"));
const { default: DLMM, ActivationType, StrategyType, ILM_BASE, LBCLMM_PROGRAM_IDS } = require("@meteora-ag/dlmm");
const BN = require("bn.js");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MINT = new PublicKey("9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P");
const USDC = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const SYSTEM = new PublicKey("11111111111111111111111111111111");
const PROGRAM_ID = new PublicKey("F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6");
const N = 2_018_660n;
const K = 1_000_000n;
const FEE = 50_000n;
const TERM = 60n;
const GRACE = 30n;
const LABEL = "DEVNET REPLICA / TEST ASSET — NOT A MAINNET PRESTOCK";

function envValue(name) {
  const text = readFileSync(join(root, ".env"), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim();
  }
  throw new Error("missing " + name);
}

function loadKey(name) {
  const raw = execFileSync("wsl", ["-u", "devmo", "cat", `/home/devmo/.config/solana/locate/${name}.json`], { encoding: "utf8" });
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

function disc(name) {
  return createHash("sha256").update("global:" + name).digest().subarray(0, 8);
}
function u64(n) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
}
function i64(n) {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(n);
  return b;
}
function ata(owner, mint, program) {
  return PublicKey.findProgramAddressSync([owner.toBuffer(), program.toBuffer(), mint.toBuffer()], ATA)[0];
}
function offerPda(lender, nonce) {
  return PublicKey.findProgramAddressSync([Buffer.from("offer"), lender.toBuffer(), MINT.toBuffer(), u64(nonce)], PROGRAM_ID)[0];
}
function loanPda(offer) {
  return PublicKey.findProgramAddressSync([Buffer.from("loan"), offer.toBuffer()], PROGRAM_ID)[0];
}
const EVENT_AUTHORITY = PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], PROGRAM_ID)[0];

function epochFee(amount) {
  return (amount * 100n + 9999n) / 10000n;
}
function grossForNet(net) {
  const denom = 9900n;
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

async function bal(connection, account) {
  try {
    return BigInt((await connection.getTokenAccountBalance(account)).value.amount);
  } catch {
    return 0n;
  }
}

async function send(connection, payer, ixs, signers) {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = payer.publicKey;
  const latest = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latest.blockhash;
  tx.sign(...signers);
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  for (let i = 0; i < 40; i++) {
    const status = await connection.getSignatureStatuses([sig]);
    const row = status.value[0];
    if (row?.err) throw new Error(sig + " " + JSON.stringify(row.err));
    if (row && (row.confirmationStatus === "confirmed" || row.confirmationStatus === "finalized")) {
      return { signature: sig, slot: row.slot };
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("unconfirmed " + sig);
}

async function sendTx(connection, tx, signers) {
  tx.feePayer = signers[0].publicKey;
  const latest = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latest.blockhash;
  tx.sign(...signers);
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  for (let i = 0; i < 40; i++) {
    const status = await connection.getSignatureStatuses([sig]);
    const row = status.value[0];
    if (row?.err) throw new Error(sig + " " + JSON.stringify(row.err));
    if (row && (row.confirmationStatus === "confirmed" || row.confirmationStatus === "finalized")) {
      return { signature: sig, slot: row.slot };
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("unconfirmed " + sig);
}

function createIx(lender, nonce, expiresAt) {
  const offer = offerPda(lender, nonce);
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
    data: Buffer.concat([disc("create_offer"), u64(nonce), u64(N), u64(K), u64(FEE), i64(TERM), i64(GRACE), i64(expiresAt)]),
  });
}

function approveChecked(owner, source, delegate, amount) {
  return new TransactionInstruction({
    programId: TOKEN_2022,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: MINT, isSigner: false, isWritable: false },
      { pubkey: delegate, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from([13]), u64(amount), Buffer.from([9])]),
  });
}

function takeIx(lender, borrower, nonce) {
  const offer = offerPda(lender, nonce);
  const loan = loanPda(offer);
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
    data: Buffer.concat([disc("take_offer"), u64(N), u64(K), u64(FEE), i64(TERM)]),
  });
}

function returnIx(lender, borrower, nonce, maxGross) {
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

const connection = new Connection(envValue("SOLANA_RPC_URL_DEVNET") || envValue("SOLANA_RPC_URL"), "confirmed");
const lender = loadKey("devnet-lender");
const borrower = loadKey("devnet-borrower");
const deployer = loadKey("deployer");
const programId = new PublicKey(LBCLMM_PROGRAM_IDS.devnet);
const [tokenX, tokenY] = Buffer.compare(MINT.toBuffer(), USDC.toBuffer()) < 0 ? [MINT, USDC] : [USDC, MINT];
const [pair] = PublicKey.findProgramAddressSync([ILM_BASE.toBuffer(), tokenX.toBuffer(), tokenY.toBuffer()], programId);

const report = {
  label: LABEL,
  cluster: "devnet",
  mint: MINT.toBase58(),
  usdcMint: USDC.toBase58(),
  dlmmProgram: programId.toBase58(),
  pool: pair.toBase58(),
  lender: lender.publicKey.toBase58(),
  borrower: borrower.publicKey.toBase58(),
  mainnetTransaction: false,
};

const existing = await connection.getAccountInfo(pair);
if (!existing) {
  const createPool = await DLMM.createCustomizablePermissionlessLbPair2(
    connection,
    new BN(100),
    tokenX,
    tokenY,
    new BN(0),
    new BN(25),
    ActivationType.Timestamp,
    false,
    deployer.publicKey,
    new BN(0),
    false,
    { cluster: "devnet" },
  );
  report.poolCreate = await sendTx(connection, createPool, [deployer]);
}

const pool = await DLMM.create(connection, pair, { cluster: "devnet" });
const position = Keypair.generate();
const active = await pool.getActiveBin();
const addTx = await pool.initializePositionAndAddLiquidityByStrategy({
  positionPubKey: position.publicKey,
  totalXAmount: tokenX.equals(MINT) ? new BN(200_000_000) : new BN(2_000_000),
  totalYAmount: tokenY.equals(MINT) ? new BN(200_000_000) : new BN(2_000_000),
  strategy: { minBinId: active.binId - 5, maxBinId: active.binId + 5, strategyType: StrategyType.Spot },
  user: deployer.publicKey,
  slippage: 1,
});
report.liquidity = await sendTx(connection, addTx, [deployer, position]);

const nonce = BigInt(Date.now());
const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 3600);
const lenderAta = ata(lender.publicKey, MINT, TOKEN_2022);
const borrowerAta = ata(borrower.publicKey, MINT, TOKEN_2022);
const lenderUsdc = ata(lender.publicKey, USDC, TOKEN);
const borrowerUsdc = ata(borrower.publicKey, USDC, TOKEN);
const before = {
  lenderToken: (await bal(connection, lenderAta)).toString(),
  borrowerToken: (await bal(connection, borrowerAta)).toString(),
  lenderUsdc: (await bal(connection, lenderUsdc)).toString(),
  borrowerUsdc: (await bal(connection, borrowerUsdc)).toString(),
};
const offer = offerPda(lender.publicKey, nonce);
report.list = await send(connection, lender, [approveChecked(lender.publicKey, lenderAta, offer, N), createIx(lender.publicKey, nonce, expiresAt)], [lender]);
const takenBefore = await bal(connection, borrowerAta);
report.take = await send(connection, borrower, [takeIx(lender.publicKey, borrower.publicKey, nonce)], [borrower]);
const takenAfter = await bal(connection, borrowerAta);
const delivered = takenAfter - takenBefore;

const refreshed = await DLMM.create(connection, pair, { cluster: "devnet" });
const sellForY = tokenX.equals(MINT);
const sellBins = await refreshed.getBinArrayForSwap(sellForY);
const sellQuote = refreshed.swapQuote(new BN(delivered.toString()), sellForY, new BN(500), sellBins);
const sellTx = await refreshed.swap({
  inToken: MINT,
  outToken: USDC,
  inAmount: new BN(delivered.toString()),
  minOutAmount: sellQuote.minOutAmount,
  lbPair: pair,
  user: borrower.publicKey,
  binArraysPubkey: sellQuote.binArraysPubkey,
});
const usdcBeforeSell = await bal(connection, borrowerUsdc);
const tokenBeforeSell = await bal(connection, borrowerAta);
report.sell = await sendTx(connection, sellTx, [borrower]);
const usdcAfterSell = await bal(connection, borrowerUsdc);
const tokenAfterSell = await bal(connection, borrowerAta);

const required = grossForNet(N);
let buyIn = BigInt(sellQuote.outAmount?.toString?.() ?? usdcAfterSell - usdcBeforeSell);
let buyQuote = null;
const buyForY = tokenX.equals(USDC);
for (let i = 0; i < 8; i++) {
  const again = await DLMM.create(connection, pair, { cluster: "devnet" });
  const bins = await again.getBinArrayForSwap(buyForY);
  buyQuote = again.swapQuote(new BN(buyIn.toString()), buyForY, new BN(500), bins);
  const quoted = BigInt(buyQuote.outAmount.toString());
  const net = quoted - epochFee(quoted);
  if (net >= required) {
    const buyTx = await again.swap({
      inToken: USDC,
      outToken: MINT,
      inAmount: new BN(buyIn.toString()),
      minOutAmount: buyQuote.minOutAmount,
      lbPair: pair,
      user: borrower.publicKey,
      binArraysPubkey: buyQuote.binArraysPubkey,
    });
    const tokenBeforeBuy = await bal(connection, borrowerAta);
    report.buyback = await sendTx(connection, buyTx, [borrower]);
    const tokenAfterBuy = await bal(connection, borrowerAta);
    report.buybackDeltaRaw = (tokenAfterBuy - tokenBeforeBuy).toString();
    report.buybackUsdcIn = buyIn.toString();
    break;
  }
  buyIn = buyIn * 2n;
}
if (!report.buyback) throw new Error("buyback quote never covered the return gross");

const loan = loanPda(offer);
const maxGross = required + epochFee(required);
report.return = await send(
  connection,
  borrower,
  [approveChecked(borrower.publicKey, borrowerAta, loan, maxGross), returnIx(lender.publicKey, borrower.publicKey, nonce, maxGross)],
  [borrower],
);
const loanInfo = await connection.getAccountInfo(loan);
report.after = {
  lenderToken: (await bal(connection, lenderAta)).toString(),
  borrowerToken: (await bal(connection, borrowerAta)).toString(),
  lenderUsdc: (await bal(connection, lenderUsdc)).toString(),
  borrowerUsdc: (await bal(connection, borrowerUsdc)).toString(),
  loanClosed: loanInfo === null,
};
report.deltas = {
  deliveredRaw: delivered.toString(),
  requiredReturnGrossRaw: required.toString(),
  sellTokenDelta: (tokenAfterSell - tokenBeforeSell).toString(),
  sellUsdcDelta: (usdcAfterSell - usdcBeforeSell).toString(),
  lenderTokenDelta: (BigInt(report.after.lenderToken) - BigInt(before.lenderToken)).toString(),
  borrowerUsdcDelta: (BigInt(report.after.borrowerUsdc) - BigInt(before.borrowerUsdc)).toString(),
};
report.before = before;
report.result = report.after.loanClosed && BigInt(report.deltas.sellUsdcDelta) > 0n && BigInt(report.buybackDeltaRaw) >= required ? "PASS" : "FAIL";

const dir = join(root, "proof", "devnet");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "short-loop.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  result: report.result,
  pool: report.pool,
  list: report.list.signature,
  take: report.take.signature,
  sell: report.sell.signature,
  buy: report.buyback.signature,
  return: report.return.signature,
  delivered: report.deltas.deliveredRaw,
  buybackDelta: report.buybackDeltaRaw,
  loanClosed: report.after.loanClosed,
}));
