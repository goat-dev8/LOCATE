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

const protocol = load("proof/devnet/protocol.json");
const rows = [
  { cluster: "devnet", signature: protocol.returnCycle.create, slot: protocol.returnCycle.createSlot, locate: true },
  { cluster: "devnet", signature: protocol.returnCycle.take, slot: protocol.returnCycle.takeSlot, locate: true },
  { cluster: "devnet", signature: protocol.returnCycle.return, slot: protocol.returnCycle.returnSlot, locate: true },
  { cluster: "devnet", signature: protocol.claimCycle.create, slot: null, locate: true },
  { cluster: "devnet", signature: protocol.claimCycle.take, slot: null, locate: true },
  { cluster: "devnet", signature: protocol.claimCycle.claim, slot: protocol.claimCycle.claimSlot, locate: true },
];
for (const file of ["proof/mainnet-dex/sell.json", "proof/mainnet-dex/sell-2.json", "proof/mainnet-dex/buyback.json"]) {
  const body = load(file);
  rows.push({ cluster: "mainnet", signature: body.signature, slot: body.slot, locate: false, file });
}
rows.push(
  { cluster: "devnet", signature: "2LmWm8igo7LfDKWeKpQmR6o9ZZfjGHCZ5bBzuMSh18fqVB76tvLko9DWm938Ryz6wTjeKa1V8a9vBM5ZRguCBSv3", slot: 503824247, locate: true },
  { cluster: "devnet", signature: "61NgvpBToGqvHpwkrbA9oGProjZG5CjioL1m1TGRBWQF8c9tsaSJScPTuDY5iwceS7HJvMMKrDk3Mw87aE5xLfcT", slot: 503826986, locate: true },
  { cluster: "devnet", signature: "5PHRuUXGaj5bKWybJYt9EwUxBbmBa1GjYviM1MWDTnW39kQfegS9ZtvpPivDtYeMyCCLs2szHpKfRadjDgzFKHHP", slot: 503827662, locate: true },
);

const results = [];
for (const row of rows) {
  const connection = row.cluster === "mainnet" ? mainnet : devnet;
  results.push(await check(connection, row));
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
