import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { DEVNET_USDC } from "../sdk/dist/constants.js";
import { grossForNet } from "../sdk/dist/fees.js";
import { buildClaimTx, buildListTx, buildReturnTx, buildTakeTx } from "../sdk/dist/builders.js";
import { PublicKey } from "@solana/web3.js";

const MINT = new PublicKey("9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P");
const N = 2_018_660n;
const K = 1_000_000n;
const FEE = 50_000n;
const MAX_FEE = 2n ** 64n - 1n;

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim();
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

async function send(payer, ixs, signers) {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = payer.publicKey;
  return sendAndConfirmTransaction(connection, tx, signers, { commitment: "confirmed" });
}

function terms(nonce, termSecs) {
  return {
    lender: lender.publicKey,
    mint: MINT,
    usdcMint: DEVNET_USDC,
    nonce,
    amountRaw: N,
    collateralUsdc: K,
    feeUsdc: FEE,
    termSecs,
    graceSecs: 30n,
    expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86400),
    decimals: 9,
  };
}

async function record(signature) {
  const tx = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  return { signature, slot: tx?.slot ?? null, blockTime: tx?.blockTime ?? null, err: tx?.meta?.err ?? null };
}

const returnTerms = terms(4n, 3600n);
const created = await send(lender, buildListTx(returnTerms), [lender]);
const taken = await send(borrower, buildTakeTx(borrower.publicKey, returnTerms), [borrower]);
const gross = grossForNet(100, MAX_FEE, N);
const returned = await send(borrower, buildReturnTx(borrower.publicKey, returnTerms, gross), [borrower]);

const claimTerms = terms(5n, 60n);
const createdClaim = await send(lender, buildListTx(claimTerms), [lender]);
const takenClaim = await send(borrower, buildTakeTx(borrower.publicKey, claimTerms), [borrower]);
const early = await connection.simulateTransaction(
  await (async () => {
    const tx = new Transaction().add(...buildClaimTx(lender.publicKey, borrower.publicKey, claimTerms));
    tx.feePayer = lender.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(lender);
    return tx;
  })(),
);
await new Promise((resolve) => setTimeout(resolve, 95_000));
const claimed = await send(lender, buildClaimTx(lender.publicKey, borrower.publicKey, claimTerms), [lender]);

const evidence = {
  cluster: "devnet",
  label: "devnet test mint mirroring OPENAI's extensions; not a PreStocks token",
  programId: "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6",
  returnCycle: {
    create: await record(created),
    take: await record(taken),
    return: await record(returned),
    grossRaw: gross.toString(),
  },
  claimCycle: {
    create: await record(createdClaim),
    take: await record(takenClaim),
    earlyClaimSimulation: { err: early.value.err, simulation: true },
    claim: await record(claimed),
  },
  fetchedAt: new Date().toISOString(),
};
mkdirSync(new URL("../evidence/integration/", import.meta.url), { recursive: true });
writeFileSync(new URL("../evidence/integration/devnet-sdk-cycle.json", import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ created, taken, returned, claimed, early: early.value.err }));
