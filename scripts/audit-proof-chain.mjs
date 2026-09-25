import { readFileSync, writeFileSync } from "node:fs";
import { Connection } from "@solana/web3.js";

const LOCATE = "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6";
const devnet = new Connection("https://api.devnet.solana.com", "finalized");
const mainnet = new Connection("https://api.mainnet-beta.solana.com", "finalized");

function load(path) {
  return JSON.parse(readFileSync(new URL("../" + path, import.meta.url), "utf8"));
}

function keysOf(tx) {
  const message = tx.transaction.message;
  const staticKeys = message.staticAccountKeys ?? message.accountKeys ?? [];
  return staticKeys.map((key) => key.toBase58());
}

async function check(connection, row) {
  const status = await connection.getSignatureStatuses([row.signature], { searchTransactionHistory: true });
  const chain = status.value[0];
  const tx = await connection.getTransaction(row.signature, { maxSupportedTransactionVersion: 0, commitment: "finalized" });
  const keys = tx ? keysOf(tx) : [];
  const problems = [];
  if (!chain) problems.push("missing");
  if (chain && chain.confirmationStatus !== "finalized") problems.push("not-finalized");
  if (chain && chain.err != null) problems.push("err");
  if (chain && row.slot != null && chain.slot !== row.slot) problems.push("slot");
  if (tx?.meta?.err != null) problems.push("tx-err");
  const hasLocate = keys.includes(LOCATE);
  if (row.locate === true && !hasLocate) problems.push("program");
  if (row.locate === false && hasLocate) problems.push("program");
  if (row.wallet && tx && !keys.includes(row.wallet)) problems.push("wallet");
  const deltas = tokenDeltas(tx);
  for (const expected of row.deltas ?? []) {
    const actual = deltas
      .filter((item) => item.mint === expected.mint && (!expected.owner || item.owner === expected.owner))
      .reduce((sum, item) => sum + BigInt(item.delta), 0n)
      .toString();
    if (actual !== expected.delta) problems.push("delta:" + expected.mint.slice(0, 4));
  }
  return {
    signature: row.signature,
    cluster: row.cluster,
    slot: chain?.slot ?? null,
    expectedSlot: row.slot ?? null,
    finalized: chain?.confirmationStatus === "finalized",
    err: chain?.err ?? null,
    hasLocate,
    problems,
  };
}

function tokenDeltas(tx) {
  if (!tx?.meta) return [];
  const pre = tx.meta.preTokenBalances ?? [];
  const post = tx.meta.postTokenBalances ?? [];
  const indexes = new Set([...pre, ...post].map((row) => row.accountIndex));
  const rows = [];
  for (const index of indexes) {
    const before = pre.find((item) => item.accountIndex === index);
    const after = post.find((item) => item.accountIndex === index);
    const mint = (after ?? before).mint;
    const owner = (after ?? before).owner;
    const delta = BigInt(after?.uiTokenAmount.amount ?? "0") - BigInt(before?.uiTokenAmount.amount ?? "0");
    if (delta !== 0n) rows.push({ mint, owner, delta: delta.toString() });
  }
  return rows;
}

const protocol = load("proof/devnet/protocol.json");
const rows = [
  { cluster: "devnet", signature: protocol.returnCycle.create, slot: protocol.returnCycle.createSlot, locate: true },
  { cluster: "devnet", signature: protocol.returnCycle.take, slot: protocol.returnCycle.takeSlot, locate: true },
  { cluster: "devnet", signature: protocol.returnCycle.return, slot: protocol.returnCycle.returnSlot, locate: true },
  { cluster: "devnet", signature: protocol.claimCycle.create, slot: null, locate: true },
  { cluster: "devnet", signature: protocol.claimCycle.take, slot: null, locate: true },
  { cluster: "devnet", signature: protocol.claimCycle.claim, slot: protocol.claimCycle.claimSlot, locate: true },
];
const OPENAI = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WALLET = "Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC";
const sell = load("proof/mainnet-dex/sell.json");
const sell2 = load("proof/mainnet-dex/sell-2.json");
const buyback = load("proof/mainnet-dex/buyback.json");
rows.push(
  { cluster: "mainnet", signature: sell.signature, slot: sell.slot, locate: false, wallet: sell.wallet, deltas: [{ mint: OPENAI, owner: WALLET, delta: sell.openaiDelta }, { mint: USDC, owner: WALLET, delta: sell.usdcDelta }] },
  { cluster: "mainnet", signature: sell2.signature, slot: sell2.slot, locate: false, wallet: sell2.wallet },
  { cluster: "mainnet", signature: buyback.signature, slot: buyback.slot, locate: false, wallet: buyback.wallet, deltas: [{ mint: OPENAI, owner: WALLET, delta: buyback.openaiDeltaFromPreBuyback }] },
);
rows.push(
  { cluster: "devnet", signature: "2LmWm8igo7LfDKWeKpQmR6o9ZZfjGHCZ5bBzuMSh18fqVB76tvLko9DWm938Ryz6wTjeKa1V8a9vBM5ZRguCBSv3", slot: 503824247, locate: true },
  { cluster: "devnet", signature: "61NgvpBToGqvHpwkrbA9oGProjZG5CjioL1m1TGRBWQF8c9tsaSJScPTuDY5iwceS7HJvMMKrDk3Mw87aE5xLfcT", slot: 503826986, locate: true },
  { cluster: "devnet", signature: "5PHRuUXGaj5bKWybJYt9EwUxBbmBa1GjYviM1MWDTnW39kQfegS9ZtvpPivDtYeMyCCLs2szHpKfRadjDgzFKHHP", slot: 503827662, locate: true },
  { cluster: "devnet", signature: "x5xL7wjduwWhZtkbe9uvV1j1kBf1kzW5Z13o1w4yxvDonWW5aiYC9gz5z1MvvBkJzzp9qWNTwuMyDt8r8rRV8QU", slot: 503831696, locate: true, wallet: WALLET },
  { cluster: "devnet", signature: "5tCumUozhPqcZonmzqZoW78QHmT3h3KM8uTiYyo7Ruf7rDcAUeU7WGRCZpcpUFv3A3WtfBXP3EPNtXhWhq74ebVn", slot: 503832748, locate: true, wallet: "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX" },
  { cluster: "devnet", signature: "4TbTczrhivm4Gq9eFA9i8s9B1E4o4Yqr4cnyzgp2HEK5zqF4iUtXszEsRhvYxxmTWBvCxqMKQFaC5hABoobFhA9G", slot: 503834342, locate: true, wallet: WALLET },
  { cluster: "devnet", signature: "65P8SnZezfKhuP5fhJb5zpAckHmye9tHorCdBbJxRcZ36TJVfNFzLPwxakBshDeJmLLKmvX6AkWttfCLbXTgE5Z7", slot: 503858589, locate: true, wallet: WALLET },
  { cluster: "devnet", signature: "3NxZ3QXQk1gbCiRppmW66S94pASM9MTyKJZvTYq2gTLPaiNdcFJGNnkor4jVBPsJf67Y7JrXnRveL5nAeEpG5Q1M", slot: 503859363, locate: true },
  { cluster: "devnet", signature: "4WXs3ooiToSrL5KFGJ58413ga2WhzVjaMoUM5wpmnqY1AHMwe361FZkPhfauHgqsqn6mZqGBskZ4MmqHritaS3cw", slot: 503860398, locate: true, wallet: WALLET },
  { cluster: "devnet", signature: "2PgsmjwxPmVTAPktsNhFp13xZr2kdFPDdDFzVs7WGahU6KwejfkGftCuqeKxN6J5BXBrgG7Xz2UPyknNKjRp7eGB", slot: 503863268, locate: true, wallet: WALLET },
  { cluster: "devnet", signature: "4vtXFRpvbLBeneBSHf5LzsKP9FvGim2DkGfkaZHLPAPDJ7RUnNRuq4c9Q8ub6vM6AUtRLt86FzZHsnzb1re6iV5W", slot: 503863794, locate: true, wallet: "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX" },
  { cluster: "devnet", signature: "44tmkCp24ctT6dYc4xK4Q1UDQ4BtRCgjQ5QXVMh8VxA5pCn3sKkZjwyurGrH9ZHurdB4uBiW8CpHsWrD5dtuuE5C", slot: 503728891, locate: true },
  { cluster: "devnet", signature: "4FUqtNoxVjN3E2tJoSKeN8K9awDV9fU1GQ5AZH9yfKbS9FhULGYRgK4pB4zC7nwsGroSbHXv2n4uGp1JNshYDa7t", slot: 503731052, locate: true },
);

const results = [];
for (const row of rows) {
  const connection = row.cluster === "mainnet" ? mainnet : devnet;
  results.push(await check(connection, row));
  await new Promise((resolve) => setTimeout(resolve, 1200));
}
const failed = results.filter((row) => row.problems.length > 0);
const report = {
  checkedAt: new Date().toISOString(),
  checked: results.length,
  failed: failed.length,
  results,
  note: "Chain signatures only. Cloned-state execution has no cluster signature. proofCenterIntegrity stays false until every proof artifact is checked.",
};
writeFileSync(new URL("../proof/verification/chain-audit.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ checked: report.checked, failed: report.failed, problems: failed }));
