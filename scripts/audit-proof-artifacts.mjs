import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const load = (path) => JSON.parse(readFileSync(path, "utf8"));
const fork = load("proof/mainnet-fork/logs/matrix.json").cases;
const local = load("proof/local-validator/suite.json");
const replay = load("proof/replay/manifest.json");
const sec = load("proof/security/suite.json");
const chain = load("proof/verification/chain-audit.json");
const build = load("proof/verification/reproducible-build.json");
const status = load("proof/EXECUTION_STATUS.json");
const dex = load("proof/devnet/dex.json");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (path.endsWith(".json")) out.push(path);
  }
  return out;
}

const root = "frontend/src/app/proof/data";
let copiesMismatch = 0;
for (const file of walk(root)) {
  const rel = relative(root, file);
  if (!readFileSync(file).equals(readFileSync(join("proof", rel)))) copiesMismatch += 1;
}

const refusalMiss = local.cases.filter((row) => row.ok !== true && row.result !== "PASS").map((row) => row.id);

const familySum = Object.values(replay.families).reduce((sum, count) => sum + count, 0);
const problems = [];
if (fork.filter((row) => row.result === "PASS").length !== 24) problems.push("fork");
if (local.cases.filter((row) => row.result === "PASS").length !== 42) problems.push("local");
if (refusalMiss.length > 0) problems.push("refusal");
if (familySum !== 45000 || replay.total !== 45000) problems.push("replay");
if (sec.functional.failed !== 0 || sec.security.failed !== 0 || sec.mutation.failed !== 0) problems.push("security");
if (chain.failed !== 0 || chain.checked < 22) problems.push("chain");
if (build.equality !== true || build.mainnetVerifiedProgram !== false) problems.push("build");
if (status.mainnetLocateDeployment !== false || status.mainnetLocateTransactions !== false) problems.push("flags");
if (dex.result !== "FAIL" || dex.signedTransactions.length !== 0) problems.push("dex");
if (copiesMismatch !== 0) problems.push("copies");

const report = {
  checkedAt: new Date().toISOString(),
  problems,
  forkPass: fork.filter((row) => row.result === "PASS").length,
  localPass: local.cases.filter((row) => row.result === "PASS").length,
  expectedRefusals: local.cases.filter((row) => row.ok !== true).length,
  refusalMiss,
  replayFamilySum: familySum,
  chainChecked: chain.checked,
  chainFailed: chain.failed,
  copiesMismatch,
  clonedExecution: "local manifest, no cluster signature",
  devnetDex: dex.result,
  mainnetLocateDeployment: false,
  mainnetLocateTransactions: false,
  proofCenterIntegrity: problems.length === 0,
};
writeFileSync("proof/verification/artifact-audit.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ problems, refusalMiss: refusalMiss.length, proofCenterIntegrity: report.proofCenterIntegrity }));
if (problems.length > 0) process.exit(1);
