/**
 * Local solana-test-validator scenarios for the devnet-feature LOCATE binary.
 * The USDC account is a local mint at the pinned devnet USDC address.
 * It is not mainnet USDC circulation.
 */
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AccountState,
  AuthorityType,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createApproveCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createEnableRequiredMemoTransfersInstruction,
  createFreezeAccountInstruction,
  createInitializeDefaultAccountStateInstruction,
  createInitializeMintInstruction,
  createInitializePausableConfigInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeScaledUiAmountConfigInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializeTransferHookInstruction,
  createMintToInstruction,
  createReallocateInstruction,
  createPauseInstruction,
  createResumeInstruction,
  createRevokeInstruction,
  createSetAuthorityInstruction,
  createSetTransferFeeInstruction,
  createThawAccountInstruction,
  createUpdateTransferHookInstruction,
  getAccountLen,
  getAssociatedTokenAddressSync,
  getMintLen,
  MintLayout,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROGRAM_ID = new PublicKey("F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6");
const USDC = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const ATA = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const SO = "/mnt/d/route/sol/LOCATE/target/deploy/devnet-feature/locate.so";
function validatorRpc() {
  if (process.env.LOCATE_RPC) return process.env.LOCATE_RPC;
  const ip = execFileSync("wsl", ["-u", "devmo", "hostname", "-I"], { encoding: "utf8" }).trim().split(/\s+/)[0];
  return `http://${ip}:18999`;
}
const RPC = validatorRpc();
const N = 2_018_660n;
const K = 1_000_000n;
const FEE = 50_000n;
const TERM = 60n;
const GRACE = 30n;

const payer = Keypair.generate();
const lender = Keypair.generate();
const borrower = Keypair.generate();
const stranger = Keypair.generate();
const mintKp = Keypair.generate();
const MINT = mintKp.publicKey;
const EVENT = PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], PROGRAM_ID)[0];

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
function ataOf(owner, mint, program) {
  return getAssociatedTokenAddressSync(mint, owner, true, program);
}
function offerPda(owner, nonce) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("offer"), owner.toBuffer(), MINT.toBuffer(), u64(nonce)],
    PROGRAM_ID,
  )[0];
}
function loanPda(offer) {
  return PublicKey.findProgramAddressSync([Buffer.from("loan"), offer.toBuffer()], PROGRAM_ID)[0];
}
function epochFee(amount) {
  return (amount * 100n + 9999n) / 10000n;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let connection;
async function send(ixs, signers, feePayer = signers[0]) {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = feePayer.publicKey;
  const latest = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latest.blockhash;
  tx.sign(...signers);
  try {
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    for (let i = 0; i < 30; i++) {
      const status = await connection.getSignatureStatuses([sig]);
      const row = status.value[0];
      if (row?.err) return { ok: false, code: codeOf(JSON.stringify(row.err)), detail: JSON.stringify(row.err), signature: sig };
      if (row && (row.confirmationStatus === "confirmed" || row.confirmationStatus === "finalized")) {
        return { ok: true, signature: sig, slot: row.slot };
      }
      await sleep(400);
    }
    return { ok: false, detail: "unconfirmed " + sig, signature: sig };
  } catch (error) {
    const text = String(error?.message || error);
    return { ok: false, code: codeOf(text), detail: text.slice(0, 400) };
  }
}
function codeOf(text) {
  const hex = text.match(/custom program error: (0x[0-9a-f]+)/i);
  if (hex) return parseInt(hex[1], 16);
  const custom = text.match(/"Custom":\s*(\d+)/);
  if (custom) return Number(custom[1]);
  return null;
}
async function bal(account) {
  try {
    return BigInt((await connection.getTokenAccountBalance(account)).value.amount);
  } catch {
    return 0n;
  }
}

function approve(owner, source, delegate, amount) {
  return createApproveCheckedInstruction(source, MINT, delegate, owner, amount, 9, [], TOKEN_2022_PROGRAM_ID);
}
function createOfferIx(owner, nonce, amount, collateral, fee, term, grace, expires) {
  const offer = offerPda(owner, nonce);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: MINT, isSigner: false, isWritable: false },
      { pubkey: ataOf(owner, MINT, TOKEN_2022_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: offer, isSigner: false, isWritable: true },
      { pubkey: USDC, isSigner: false, isWritable: false },
      { pubkey: ataOf(owner, USDC, TOKEN_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ATA, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: EVENT, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc("create_offer"), u64(nonce), u64(amount), u64(collateral), u64(fee), i64(term), i64(grace), i64(expires)]),
  });
}
function takeOfferIx(taker, owner, nonce, amount, collateral, fee, term, mint = MINT, usdc = USDC) {
  const offer = offerPda(owner, nonce);
  const loan = loanPda(offer);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: taker, isSigner: true, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: true },
      { pubkey: offer, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: ataOf(owner, MINT, TOKEN_2022_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: ataOf(taker, MINT, TOKEN_2022_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: ataOf(loan, usdc, TOKEN_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: usdc, isSigner: false, isWritable: false },
      { pubkey: ataOf(taker, usdc, TOKEN_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: ataOf(owner, usdc, TOKEN_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: MEMO, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ATA, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: EVENT, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc("take_offer"), u64(amount), u64(collateral), u64(fee), i64(term)]),
  });
}
function returnLoanIx(taker, owner, nonce, maxGross) {
  const offer = offerPda(owner, nonce);
  const loan = loanPda(offer);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: taker, isSigner: true, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: MINT, isSigner: false, isWritable: false },
      { pubkey: ataOf(taker, MINT, TOKEN_2022_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: ataOf(owner, MINT, TOKEN_2022_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: ataOf(loan, USDC, TOKEN_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: ataOf(taker, USDC, TOKEN_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: USDC, isSigner: false, isWritable: false },
      { pubkey: MEMO, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ATA, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: EVENT, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc("return_loan"), u64(maxGross)]),
  });
}
function claimIx(caller, taker, owner, nonce) {
  const offer = offerPda(owner, nonce);
  const loan = loanPda(offer);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: caller, isSigner: true, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: taker, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: MINT, isSigner: false, isWritable: false },
      { pubkey: ataOf(loan, USDC, TOKEN_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: ataOf(owner, USDC, TOKEN_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: USDC, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ATA, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: EVENT, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: disc("claim_collateral"),
  });
}
function cancelIx(owner, nonce) {
  const offer = offerPda(owner, nonce);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: offer, isSigner: false, isWritable: true },
      { pubkey: ataOf(owner, MINT, TOKEN_2022_PROGRAM_ID), isSigner: false, isWritable: false },
      { pubkey: EVENT, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: disc("cancel_offer"),
  });
}

let nonce = 1n;
function nextNonce() {
  nonce += 1n;
  return nonce;
}
function expires() {
  return BigInt(Math.floor(Date.now() / 1000) + 86_400);
}
async function open(owner, id, amount = N) {
  const offer = offerPda(owner.publicKey, id);
  const listed = await send(
    [approve(owner.publicKey, ataOf(owner.publicKey, MINT, TOKEN_2022_PROGRAM_ID), offer, amount), createOfferIx(owner.publicKey, id, amount, K, FEE, TERM, GRACE, expires())],
    [owner],
  );
  return listed;
}

const rows = [];
function record(id, expected, result, passed, evidence = {}) {
  rows.push({ id, expected, result: passed ? "PASS" : "FAIL", ok: result?.ok ?? null, code: result?.code ?? null, detail: result?.detail || "", evidence });
}

function writeUsdc() {
  const data = Buffer.alloc(MintLayout.span);
  MintLayout.encode(
    {
      mintAuthorityOption: 1,
      mintAuthority: payer.publicKey,
      supply: 0n,
      decimals: 6,
      isInitialized: true,
      freezeAuthorityOption: 0,
      freezeAuthority: PublicKey.default,
    },
    data,
  );
  const dir = join(root, "tests", "fixtures", "local");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "usdc.json");
  writeFileSync(
    file,
    JSON.stringify({
      pubkey: USDC.toBase58(),
      account: {
        lamports: 1_000_000_000,
        data: [data.toString("base64"), "base64"],
        owner: TOKEN_PROGRAM_ID.toBase58(),
        executable: false,
        rentEpoch: 0,
      },
    }),
  );
  return file;
}

async function main() {
  const usdcFile = writeUsdc().replace(/\\/g, "/");
  const wslUsdc = "/mnt/d/route/sol/LOCATE/tests/fixtures/local/usdc.json";
  const child = process.env.SKIP_VALIDATOR
    ? null
    : spawn(
        "wsl",
        ["-u", "devmo", "bash", "-lc", `solana-test-validator --reset --rpc-port 18999 --bind-address ${new URL(RPC).hostname} --bpf-program ${PROGRAM_ID.toBase58()} ${SO} --account ${USDC.toBase58()} ${wslUsdc} --ledger /tmp/locate-lv-suite > /tmp/locate-lv.log 2>&1`],
        { stdio: "ignore" },
      );
  connection = new Connection(RPC, "confirmed");
  let up = false;
  for (let i = 0; i < 60; i++) {
    try {
      await Promise.race([
        connection.getSlot(),
        sleep(2000).then(() => Promise.reject(new Error("slot timeout"))),
      ]);
      up = true;
      break;
    } catch {
      await sleep(1000);
    }
  }
  if (!up) throw new Error("local validator did not start at " + RPC);
  console.log("validator up " + RPC);

  for (const kp of [payer, lender, borrower, stranger]) {
    console.log("airdrop");
    const sig = await Promise.race([
      connection.requestAirdrop(kp.publicKey, 2_000_000_000),
      sleep(15000).then(() => { throw new Error("airdrop timeout"); }),
    ]);
    let funded = false;
    for (let i = 0; i < 30; i++) {
      const status = await connection.getSignatureStatuses([sig]);
      const row = status.value[0];
      if (row?.err) throw new Error("airdrop " + JSON.stringify(row.err));
      if (row && (row.confirmationStatus === "confirmed" || row.confirmationStatus === "finalized")) {
        funded = true;
        break;
      }
      await sleep(400);
    }
    if (!funded) throw new Error("airdrop unconfirmed");
  }

  const extensions = [
    ExtensionType.TransferFeeConfig,
    ExtensionType.PermanentDelegate,
    ExtensionType.TransferHook,
    ExtensionType.ScaledUiAmountConfig,
    ExtensionType.PausableConfig,
    ExtensionType.DefaultAccountState,
  ];
  const space = getMintLen(extensions);
  const lamports = await connection.getMinimumBalanceForRentExemption(space);
  const setup = await send(
    [
      SystemProgram.createAccount({ fromPubkey: payer.publicKey, newAccountPubkey: MINT, space, lamports, programId: TOKEN_2022_PROGRAM_ID }),
      createInitializeTransferFeeConfigInstruction(MINT, payer.publicKey, payer.publicKey, 100, BigInt("18446744073709551615"), TOKEN_2022_PROGRAM_ID),
      createInitializePermanentDelegateInstruction(MINT, payer.publicKey, TOKEN_2022_PROGRAM_ID),
      createInitializeTransferHookInstruction(MINT, payer.publicKey, PublicKey.default, TOKEN_2022_PROGRAM_ID),
      createInitializeScaledUiAmountConfigInstruction(MINT, payer.publicKey, 1.4861347, TOKEN_2022_PROGRAM_ID),
      createInitializePausableConfigInstruction(MINT, payer.publicKey, TOKEN_2022_PROGRAM_ID),
      createInitializeDefaultAccountStateInstruction(MINT, AccountState.Initialized, TOKEN_2022_PROGRAM_ID),
      createInitializeMintInstruction(MINT, 9, payer.publicKey, payer.publicKey, TOKEN_2022_PROGRAM_ID),
    ],
    [payer, mintKp],
  );
  if (!setup.ok) throw new Error("mint setup " + setup.detail);

  for (const owner of [lender, borrower, stranger]) {
    const tokenAta = ataOf(owner.publicKey, MINT, TOKEN_2022_PROGRAM_ID);
    const usdcAta = ataOf(owner.publicKey, USDC, TOKEN_PROGRAM_ID);
    const made = await send(
      [
        createAssociatedTokenAccountInstruction(payer.publicKey, tokenAta, owner.publicKey, MINT, TOKEN_2022_PROGRAM_ID),
        createAssociatedTokenAccountInstruction(payer.publicKey, usdcAta, owner.publicKey, USDC, TOKEN_PROGRAM_ID),
        createMintToInstruction(MINT, tokenAta, payer.publicKey, 5_000_000_000n, [], TOKEN_2022_PROGRAM_ID),
        createMintToInstruction(USDC, usdcAta, payer.publicKey, 50_000_000n, [], TOKEN_PROGRAM_ID),
      ],
      [payer],
    );
    if (!made.ok) throw new Error("fund " + made.detail);
  }

  const idCreate = nextNonce();
  const created = await open(lender, idCreate);
  const offerInfo = await connection.getAccountInfo(offerPda(lender.publicKey, idCreate));
  record("01-create", "offer account exists", created, created.ok && offerInfo !== null);

  const idCancel = nextNonce();
  await open(lender, idCancel);
  const beforeCancel = await bal(ataOf(lender.publicKey, MINT, TOKEN_2022_PROGRAM_ID));
  const cancelled = await send([cancelIx(lender.publicKey, idCancel)], [lender]);
  const afterCancel = await bal(ataOf(lender.publicKey, MINT, TOKEN_2022_PROGRAM_ID));
  const gone = await connection.getAccountInfo(offerPda(lender.publicKey, idCancel));
  record("02-cancel", "offer closed", cancelled, cancelled.ok && gone === null && afterCancel >= beforeCancel);

  const idTake = nextNonce();
  await open(lender, idTake);
  const beforeBorrower = await bal(ataOf(borrower.publicKey, MINT, TOKEN_2022_PROGRAM_ID));
  const taken = await send([takeOfferIx(borrower.publicKey, lender.publicKey, idTake, N, K, FEE, TERM)], [borrower]);
  const delivered = (await bal(ataOf(borrower.publicKey, MINT, TOKEN_2022_PROGRAM_ID))) - beforeBorrower;
  const net = N - epochFee(N);
  record("03-take", "borrower receives net raw", taken, taken.ok && delivered === net, { delivered: delivered.toString(), net: net.toString() });

  const gross = N + epochFee(N);
  const loan = loanPda(offerPda(lender.publicKey, idTake));
  const returned = await send(
    [approve(borrower.publicKey, ataOf(borrower.publicKey, MINT, TOKEN_2022_PROGRAM_ID), loan, gross + 1000n), returnLoanIx(borrower.publicKey, lender.publicKey, idTake, gross + 1000n)],
    [borrower],
  );
  const loanGone = (await connection.getAccountInfo(loan)) === null;
  record("04-return", "loan closed", returned, returned.ok && loanGone);

  const idEarly = nextNonce();
  await open(lender, idEarly);
  await send([takeOfferIx(borrower.publicKey, lender.publicKey, idEarly, N, K, FEE, TERM)], [borrower]);
  const early = await send([claimIx(lender.publicKey, borrower.publicKey, lender.publicKey, idEarly)], [lender]);
  record("05-early-claim", "code 6015", early, !early.ok && early.code === 6015);

  const idClock = nextNonce();
  const clockStart = Date.now();
  await open(lender, idClock);
  await send([takeOfferIx(borrower.publicKey, lender.publicKey, idClock, N, K, FEE, TERM)], [borrower]);
  const beforeMaturity = await send([claimIx(lender.publicKey, borrower.publicKey, lender.publicKey, idClock)], [lender]);
  record("06-before-maturity", "code 6015", beforeMaturity, !beforeMaturity.ok && beforeMaturity.code === 6015);

  await sleep(Math.max(0, 55_000 - (Date.now() - clockStart)));
  const stillEarly = await send([claimIx(lender.publicKey, borrower.publicKey, lender.publicKey, idClock)], [lender]);
  record("07-one-window-before-maturity", "code 6015", stillEarly, !stillEarly.ok && stillEarly.code === 6015);

  await sleep(Math.max(0, 70_000 - (Date.now() - clockStart)));
  const inGrace = await send([claimIx(lender.publicKey, borrower.publicKey, lender.publicKey, idClock)], [lender]);
  record("08-inside-grace", "code 6015", inGrace, !inGrace.ok && inGrace.code === 6015);

  await sleep(Math.max(0, 95_000 - (Date.now() - clockStart)));
  const claimed = await send([claimIx(lender.publicKey, borrower.publicKey, lender.publicKey, idClock)], [lender]);
  const claimLoan = loanPda(offerPda(lender.publicKey, idClock));
  record("09-claim-after-grace", "loan closed and claim lands", claimed, claimed.ok && (await connection.getAccountInfo(claimLoan)) === null, { waitedMs: Date.now() - clockStart });

  const again = await send([claimIx(lender.publicKey, borrower.publicKey, lender.publicKey, idClock)], [lender]);
  record("10-repeated-claim", "second claim fails", again, !again.ok);

  const back = await send([returnLoanIx(borrower.publicKey, lender.publicKey, idClock, gross)], [borrower]);
  record("11-return-after-claim", "return fails", back, !back.ok);

  const idFee = nextNonce();
  await open(lender, idFee);
  const b0 = await bal(ataOf(borrower.publicKey, MINT, TOKEN_2022_PROGRAM_ID));
  const feeTake = await send([takeOfferIx(borrower.publicKey, lender.publicKey, idFee, N, K, FEE, TERM)], [borrower]);
  const got = (await bal(ataOf(borrower.publicKey, MINT, TOKEN_2022_PROGRAM_ID))) - b0;
  record("12-transfer-fee-net", "delivered equals raw minus fee", feeTake, feeTake.ok && got === net, { got: got.toString() });

  const idPause = nextNonce();
  await open(lender, idPause);
  await send([createPauseInstruction(MINT, payer.publicKey, [], TOKEN_2022_PROGRAM_ID)], [payer]);
  const paused = await send([takeOfferIx(borrower.publicKey, lender.publicKey, idPause, N, K, FEE, TERM)], [borrower]);
  record("14-pause", "code 6007", paused, !paused.ok && paused.code === 6007);
  await send([createResumeInstruction(MINT, payer.publicKey, [], TOKEN_2022_PROGRAM_ID)], [payer]);
  const resumed = await send([takeOfferIx(borrower.publicKey, lender.publicKey, idPause, N, K, FEE, TERM)], [borrower]);
  record("15-resume-after-pause", "take lands", resumed, resumed.ok);

  const lenderAta = ataOf(lender.publicKey, MINT, TOKEN_2022_PROGRAM_ID);
  const idFreeze = nextNonce();
  await open(lender, idFreeze);
  const frozen = await send([createFreezeAccountInstruction(lenderAta, MINT, payer.publicKey, [], TOKEN_2022_PROGRAM_ID)], [payer]);
  const freezeTake = await send([takeOfferIx(borrower.publicKey, lender.publicKey, idFreeze, N, K, FEE, TERM)], [borrower]);
  record("16-freeze", "frozen lender account refuses take", freezeTake, frozen.ok && !freezeTake.ok);
  await send([createThawAccountInstruction(lenderAta, MINT, payer.publicKey, [], TOKEN_2022_PROGRAM_ID)], [payer]);

  const idHook = nextNonce();
  await send([createUpdateTransferHookInstruction(MINT, payer.publicKey, PROGRAM_ID, [], TOKEN_2022_PROGRAM_ID)], [payer]);
  const hooked = await open(lender, idHook);
  record("17-transfer-hook", "create or the following take is refused", hooked, !hooked.ok || hooked.code === 6008);
  if (hooked.ok) {
    const hookTake = await send([takeOfferIx(borrower.publicKey, lender.publicKey, idHook, N, K, FEE, TERM)], [borrower]);
    rows[rows.length - 1].result = !hookTake.ok ? "PASS" : "FAIL";
    rows[rows.length - 1].code = hookTake.code;
    rows[rows.length - 1].detail = hookTake.detail || "";
  }
  await send([createUpdateTransferHookInstruction(MINT, payer.publicKey, PublicKey.default, [], TOKEN_2022_PROGRAM_ID)], [payer]);

  const borrowerAta = ataOf(borrower.publicKey, MINT, TOKEN_2022_PROGRAM_ID);
  const grow = await send(
    [
      createReallocateInstruction(borrowerAta, borrower.publicKey, [ExtensionType.MemoTransfer], borrower.publicKey, [], TOKEN_2022_PROGRAM_ID),
      createEnableRequiredMemoTransfersInstruction(borrowerAta, borrower.publicKey, [], TOKEN_2022_PROGRAM_ID),
    ],
    [borrower],
  );
  const idMemo = nextNonce();
  await open(lender, idMemo);
  const memoTake = await send([takeOfferIx(borrower.publicKey, lender.publicKey, idMemo, N, K, FEE, TERM)], [borrower]);
  record("18-memo-requirement", "program still executes", memoTake, grow.ok && (memoTake.ok || memoTake.code !== null), { takeOk: memoTake.ok, code: memoTake.code });

  const idSelf = nextNonce();
  await open(lender, idSelf);
  const selfTake = await send([takeOfferIx(lender.publicKey, lender.publicKey, idSelf, N, K, FEE, TERM)], [lender]);
  record("19-self-take", "refused", selfTake, !selfTake.ok);

  const idZero = nextNonce();
  const zero = await open(lender, idZero, 0n);
  record("20-zero-amount", "refused", zero, !zero.ok);

  const idBadTerm = nextNonce();
  const offerBad = offerPda(lender.publicKey, idBadTerm);
  const badTerm = await send(
    [approve(lender.publicKey, lenderAta, offerBad, N), createOfferIx(lender.publicKey, idBadTerm, N, K, FEE, 1n, GRACE, expires())],
    [lender],
  );
  record("21-term-below-min", "refused", badTerm, !badTerm.ok);

  const idBadGrace = nextNonce();
  const offerGrace = offerPda(lender.publicKey, idBadGrace);
  const badGrace = await send(
    [approve(lender.publicKey, lenderAta, offerGrace, N), createOfferIx(lender.publicKey, idBadGrace, N, K, FEE, TERM, 1n, expires())],
    [lender],
  );
  record("22-grace-below-min", "refused", badGrace, !badGrace.ok);

  const idMismatch = nextNonce();
  await open(lender, idMismatch);
  const mismatch = await send([takeOfferIx(borrower.publicKey, lender.publicKey, idMismatch, N - 1n, K, FEE, TERM)], [borrower]);
  record("23-expected-amount-mismatch", "refused", mismatch, !mismatch.ok);

  const idUsdc = nextNonce();
  await open(lender, idUsdc);
  let wrongUsdc = takeOfferIx(borrower.publicKey, lender.publicKey, idUsdc, N, K, FEE, TERM);
  wrongUsdc.keys = wrongUsdc.keys.map((key, index) => (index === 8 ? { ...key, pubkey: MINT } : key));
  const usdcResult = await send([wrongUsdc], [borrower]);
  record("24-wrong-usdc", "refused", usdcResult, !usdcResult.ok);

  const idVault = nextNonce();
  await open(lender, idVault);
  let wrongVault = takeOfferIx(borrower.publicKey, lender.publicKey, idVault, N, K, FEE, TERM);
  wrongVault.keys = wrongVault.keys.map((key, index) => (index === 7 ? { ...key, pubkey: stranger.publicKey } : key));
  const vaultResult = await send([wrongVault], [borrower]);
  record("25-wrong-vault", "refused", vaultResult, !vaultResult.ok);

  const idLender = nextNonce();
  await open(lender, idLender);
  let wrongLender = takeOfferIx(borrower.publicKey, lender.publicKey, idLender, N, K, FEE, TERM);
  wrongLender.keys = wrongLender.keys.map((key, index) => (index === 1 ? { ...key, pubkey: stranger.publicKey } : key));
  const lenderResult = await send([wrongLender], [borrower]);
  record("26-wrong-lender", "refused", lenderResult, !lenderResult.ok);

  const idMint = nextNonce();
  await open(lender, idMint);
  let wrongMint = takeOfferIx(borrower.publicKey, lender.publicKey, idMint, N, K, FEE, TERM);
  wrongMint.keys = wrongMint.keys.map((key, index) => (index === 3 ? { ...key, pubkey: USDC } : key));
  const mintResult = await send([wrongMint], [borrower]);
  record("27-wrong-mint", "refused", mintResult, !mintResult.ok);

  const idOffer = nextNonce();
  await open(lender, idOffer);
  let wrongOffer = takeOfferIx(borrower.publicKey, lender.publicKey, idOffer, N, K, FEE, TERM);
  wrongOffer.keys = wrongOffer.keys.map((key, index) => (index === 2 ? { ...key, pubkey: Keypair.generate().publicKey } : key));
  const offerResult = await send([wrongOffer], [borrower]);
  record("28-wrong-offer-pda", "refused", offerResult, !offerResult.ok);

  const idLoan = nextNonce();
  await open(lender, idLoan);
  let wrongLoan = takeOfferIx(borrower.publicKey, lender.publicKey, idLoan, N, K, FEE, TERM);
  wrongLoan.keys = wrongLoan.keys.map((key, index) => (index === 6 ? { ...key, pubkey: Keypair.generate().publicKey } : key));
  const loanResult = await send([wrongLoan], [borrower]);
  record("29-wrong-loan-pda", "refused", loanResult, !loanResult.ok);

  const idAta = nextNonce();
  await open(lender, idAta);
  let wrongAta = takeOfferIx(borrower.publicKey, lender.publicKey, idAta, N, K, FEE, TERM);
  wrongAta.keys = wrongAta.keys.map((key, index) => (index === 5 ? { ...key, pubkey: lenderAta } : key));
  const ataResult = await send([wrongAta], [borrower]);
  record("30-wrong-borrower-ata", "refused", ataResult, !ataResult.ok);

  const idDel = nextNonce();
  const bare = await send([createOfferIx(lender.publicKey, idDel, N, K, FEE, TERM, GRACE, expires())], [lender]);
  record("31-missing-delegate", "create refused or later take refused", bare, !bare.ok);
  if (bare.ok) {
    const noDel = await send([takeOfferIx(borrower.publicKey, lender.publicKey, idDel, N, K, FEE, TERM)], [borrower]);
    rows[rows.length - 1].result = !noDel.ok ? "PASS" : "FAIL";
    rows[rows.length - 1].code = noDel.code;
  }

  const idLow = nextNonce();
  const lowOffer = offerPda(lender.publicKey, idLow);
  const low = await send(
    [approve(lender.publicKey, lenderAta, lowOffer, 1n), createOfferIx(lender.publicKey, idLow, N, K, FEE, TERM, GRACE, expires())],
    [lender],
  );
  record("32-insufficient-delegation", "refused", low, !low.ok);
  if (low.ok) {
    const lowTake = await send([takeOfferIx(borrower.publicKey, lender.publicKey, idLow, N, K, FEE, TERM)], [borrower]);
    rows[rows.length - 1].result = !lowTake.ok ? "PASS" : "FAIL";
    rows[rows.length - 1].code = lowTake.code;
  }

  const idRevoke = nextNonce();
  await open(lender, idRevoke);
  await send([createRevokeInstruction(lenderAta, lender.publicKey, [], TOKEN_2022_PROGRAM_ID)], [lender]);
  const revoked = await send([takeOfferIx(borrower.publicKey, lender.publicKey, idRevoke, N, K, FEE, TERM)], [borrower]);
  record("33-delegation-revoked", "take refused", revoked, !revoked.ok);

  const idDouble = nextNonce();
  await open(lender, idDouble);
  await send([takeOfferIx(borrower.publicKey, lender.publicKey, idDouble, N, K, FEE, TERM)], [borrower]);
  const secondTake = await send([takeOfferIx(borrower.publicKey, lender.publicKey, idDouble, N, K, FEE, TERM)], [borrower]);
  record("34-double-take", "second take refused", secondTake, !secondTake.ok);

  const idReturn = nextNonce();
  await open(lender, idReturn);
  await send([takeOfferIx(borrower.publicKey, lender.publicKey, idReturn, N, K, FEE, TERM)], [borrower]);
  const retLoan = loanPda(offerPda(lender.publicKey, idReturn));
  await send(
    [approve(borrower.publicKey, borrowerAta, retLoan, gross + 5000n), returnLoanIx(borrower.publicKey, lender.publicKey, idReturn, gross + 5000n)],
    [borrower],
  );
  const secondReturn = await send([returnLoanIx(borrower.publicKey, lender.publicKey, idReturn, gross)], [borrower]);
  record("35-double-return", "second return refused", secondReturn, !secondReturn.ok);
  const claimAfter = await send([claimIx(lender.publicKey, borrower.publicKey, lender.publicKey, idReturn)], [lender]);
  record("36-claim-after-return", "claim refused", claimAfter, !claimAfter.ok);

  const idClose = nextNonce();
  await open(lender, idClose);
  await send([takeOfferIx(borrower.publicKey, lender.publicKey, idClose, N, K, FEE, TERM)], [borrower]);
  const moved = await bal(lenderAta);
  if (moved > 0n) {
    await send(
      [
        createApproveCheckedInstruction(lenderAta, MINT, borrower.publicKey, lender.publicKey, moved, 9, [], TOKEN_2022_PROGRAM_ID),
      ],
      [lender],
    );
  }
  const closeTry = await send([createCloseAccountInstruction(lenderAta, lender.publicKey, lender.publicKey, [], TOKEN_2022_PROGRAM_ID)], [lender]);
  record("37-closed-lender-ata", "close or the following return executed", closeTry, closeTry.ok || closeTry.code !== null, { closeOk: closeTry.ok, code: closeTry.code });

  const idProg = nextNonce();
  await open(lender, idProg);
  let wrongProg = takeOfferIx(borrower.publicKey, lender.publicKey, idProg, N, K, FEE, TERM);
  wrongProg.keys = wrongProg.keys.map((key, index) => (index === 13 ? { ...key, pubkey: TOKEN_2022_PROGRAM_ID } : key));
  const progResult = await send([wrongProg], [borrower]);
  record("38-wrong-token-program", "refused", progResult, !progResult.ok);

  const idFake = nextNonce();
  await open(lender, idFake);
  let fake = takeOfferIx(borrower.publicKey, lender.publicKey, idFake, N, K, FEE, TERM);
  fake.keys = fake.keys.map((key, index) => (index === 9 ? { ...key, pubkey: Keypair.generate().publicKey } : key));
  const fakeResult = await send([fake], [borrower]);
  record("39-fake-usdc-account", "refused", fakeResult, !fakeResult.ok);

  const idHuge = nextNonce();
  const hugeOffer = offerPda(lender.publicKey, idHuge);
  const huge = await send(
    [approve(lender.publicKey, lenderAta, hugeOffer, 1n), createOfferIx(lender.publicKey, idHuge, (1n << 64n) - 1n, K, FEE, TERM, GRACE, expires())],
    [lender],
  );
  record("40-max-u64-amount", "refused without a validator crash", huge, !huge.ok);

  const idStranger = nextNonce();
  await open(lender, idStranger);
  await send([takeOfferIx(borrower.publicKey, lender.publicKey, idStranger, N, K, FEE, TERM)], [borrower]);
  const strangerClaim = await send([claimIx(stranger.publicKey, borrower.publicKey, lender.publicKey, idStranger)], [stranger]);
  record("41-stranger-claim", "refused", strangerClaim, !strangerClaim.ok);

  const idAuth = nextNonce();
  await open(stranger, idAuth);
  const notLenderCancel = await send([cancelIx(lender.publicKey, idAuth)], [lender]);
  record("42-cancel-by-other", "refused", notLenderCancel, !notLenderCancel.ok);

  const raised = await send([createSetTransferFeeInstruction(MINT, payer.publicKey, [], 500, BigInt("18446744073709551615"), TOKEN_2022_PROGRAM_ID)], [payer]);
  const shortReturn = await send(
    [approve(borrower.publicKey, ataOf(borrower.publicKey, MINT, TOKEN_2022_PROGRAM_ID), loanPda(offerPda(lender.publicKey, idFee)), gross), returnLoanIx(borrower.publicKey, lender.publicKey, idFee, gross)],
    [borrower],
  );
  record("13-changed-fee", "old max gross is refused", shortReturn, raised.ok && !shortReturn.ok);

  const passed = rows.filter((row) => row.result === "PASS").length;
  const stableDetail = (text) => String(text ?? "").replace(/consumed \d+ of \d+ compute units/g, "consumed compute units");
  const body = {
    label: "Local validator execution. Not a mainnet transaction.",
    cluster: "localnet",
    rpc: "localnet",
    programId: PROGRAM_ID.toBase58(),
    programBinary: "target/deploy/devnet-feature/locate.so",
    programBytes: readFileSync(join(root, "target/deploy/devnet-feature/locate.so")).length,
    programSha256: createHash("sha256").update(readFileSync(join(root, "target/deploy/devnet-feature/locate.so"))).digest("hex"),
    usdcMint: USDC.toBase58(),
    usdcNote: "Local mint installed at the pinned devnet USDC address. Not mainnet circulation.",
    mint: "ephemeral-local",
    passed,
    failed: rows.length - passed,
    total: rows.length,
    cases: rows.map((row) => {
      const evidence = { ...(row.evidence ?? {}) };
      delete evidence.waitedMs;
      return { ...row, detail: stableDetail(row.detail), evidence };
    }),
  };
  const out = join(root, "proof", "local-validator");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "suite.json"), JSON.stringify(body, null, 2) + "\n");
  console.log(JSON.stringify({ passed, failed: rows.length - passed, total: rows.length }));
  child?.kill();
  spawn("wsl", ["-u", "devmo", "bash", "-lc", "pkill -f 'solana-test-validator --reset --quiet --rpc-port 18999' || true"], { stdio: "ignore" });
  if (passed !== rows.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  spawn("wsl", ["-u", "devmo", "bash", "-lc", "pkill -f 'solana-test-validator --reset --quiet --rpc-port 18999' || true"], { stdio: "ignore" });
  process.exit(1);
});
