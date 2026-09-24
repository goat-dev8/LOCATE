/**
 * Owner gate for real mainnet LOCATE execution.
 * Default is off. This file does not sign, deploy, or send.
 * A later runner may send only after this gate returns enabled
 * and every prerequisite file below is a recorded PASS.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const flagName = "LOCATE_MAINNET_EXECUTION_ENABLED";

function flagFromEnvFile() {
  const path = join(root, ".env");
  if (!existsSync(path)) return "";
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(flagName + "=")) return line.slice(flagName.length + 1).trim();
  }
  return "";
}

const enabled = (process.env[flagName] ?? flagFromEnvFile()) === "true";
const prerequisites = [
  "proof/mainnet-fork/manifest.json",
  "proof/mainnet-fork/openai-full-lifecycle.json",
  "proof/mainnet-fork/openai-default-claim.json",
  "proof/mainnet-fork/failure-matrix.json",
  "proof/verification/source-build.json",
];

const missing = prerequisites.filter((rel) => !existsSync(join(root, rel)));
const sourceBuildPath = join(root, "proof/verification/source-build.json");
let sourceBuildVerified = false;
if (existsSync(sourceBuildPath)) {
  sourceBuildVerified = JSON.parse(readFileSync(sourceBuildPath, "utf8")).verified === true;
}
const blocked = !enabled || missing.length > 0 || !sourceBuildVerified;
const outDir = join(root, "proof", "mainnet-execution");
mkdirSync(outDir, { recursive: true });

const report = {
  track: "MAINNET EXECUTION",
  label: "Not a mainnet transaction",
  flag: flagName,
  enabled,
  signed: false,
  sent: false,
  sourceBuildVerified,
  prerequisitesPresent: prerequisites.filter((rel) => existsSync(join(root, rel))),
  prerequisitesMissing: missing,
  blocker: !enabled
    ? flagName + " is not true. Mainnet signing is refused."
    : missing.length
      ? "Flag is true but prerequisite proof files are missing. Mainnet signing is refused."
      : !sourceBuildVerified
        ? "source/build correspondence is not verified. Mainnet signing is refused."
        : "Prerequisites are present. This gate still does not sign. A separate reviewed runner is required.",
  timestamp: new Date().toISOString(),
};

writeFileSync(join(outDir, "gate.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ enabled: report.enabled, signed: false, missing: missing.length, blocker: report.blocker }));
process.exit(blocked ? 2 : 0);
