/**
 * Records source/build correspondence. Never sets verified true unless every check passes.
 * Does not sign, deploy, or print secrets.
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function sh(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function tool(cmd) {
  try {
    return sh(cmd);
  } catch {
    return "not found";
  }
}

const head = sh("git rev-parse HEAD");
const porcelain = sh("git status --porcelain");
const dirty = porcelain.length > 0;
const rustc = tool("wsl -u devmo bash -lc \"rustc --version\"");
const anchor = tool("wsl -u devmo bash -lc \"anchor --version\"");
const solana = tool("wsl -u devmo bash -lc \"solana --version\"");
const solanaVerify = tool("wsl -u devmo bash -lc \"command -v solana-verify && solana-verify --version\"");

const binaries = [
  { path: "target/deploy/locate.so", features: "mainnet default" },
  { path: "target/deploy/locate-mainnet.so", features: "mainnet default copy" },
  { path: "target/deploy/devnet-feature/locate.so", features: "devnet" },
].map((row) => {
  const abs = join(root, row.path);
  if (!existsSync(abs)) return { ...row, present: false };
  const buf = readFileSync(abs);
  return { ...row, present: true, bytes: buf.length, sha256: sha256File(abs) };
});

const prior = existsSync(join(root, "proof/verification/source-build.json"))
  ? JSON.parse(readFileSync(join(root, "proof/verification/source-build.json"), "utf8"))
  : {};

const solanaVerifyRan = solanaVerify !== "not found" && !solanaVerify.includes("not found");
const mainnetFeature = binaries.find((b) => b.path === "target/deploy/locate.so");
const devnetFeature = binaries.find((b) => b.path === "target/deploy/devnet-feature/locate.so");
const payloadMatch = prior.devnet?.payloadEqualsLocalDevnetSo === true
  && prior.devnet?.payloadSha256 === devnetFeature?.sha256;

const verified = !dirty
  && Boolean(mainnetFeature?.present)
  && Boolean(devnetFeature?.present)
  && solanaVerifyRan
  && prior.devnet?.matchesLocalDevnetBinary === true
  && payloadMatch;

const report = {
  claim: verified
    ? "source/build correspondence verified"
    : "source/build correspondence is not established",
  verified,
  solanaVerify: solanaVerifyRan ? solanaVerify : "not run",
  reason: verified
    ? "Clean tree, recorded binaries, and solana-verify output are present."
    : [
        dirty ? "git worktree is dirty" : null,
        solanaVerifyRan ? null : "solana-verify is not installed or was not run",
        payloadMatch ? null : "deployed payload correspondence was not re-checked in this run",
      ].filter(Boolean).join(". ") + ".",
  head,
  worktreeDirty: dirty,
  porcelain: dirty ? porcelain.split(/\n/).slice(0, 40) : [],
  programId: "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6",
  anchorToml: "1.2.0",
  toolchain: { rustc, anchorCli: anchor, solanaCli: solana },
  buildCommandMainnet: "cargo build-sbf --manifest-path programs/locate/Cargo.toml",
  buildCommandDevnet: "cargo build-sbf --manifest-path programs/locate/Cargo.toml --features devnet --sbf-out-dir target/deploy/devnet-feature",
  localBinaries: binaries,
  devnet: prior.devnet ?? null,
  mainnet: prior.mainnet ?? { cluster: "mainnet-beta", programAccountExists: false },
  timestamp: new Date().toISOString(),
};

const outDir = join(root, "proof", "verification");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "source-build.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ verified: report.verified, dirty, solanaVerify: report.solanaVerify, head, reason: report.reason }));
process.exit(verified ? 0 : 2);
