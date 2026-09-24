/**
 * LOCATE protocol Mainnet deployment is prohibited.
 * This gate never enables a Mainnet LOCATE program deploy or protocol transaction.
 * External Mainnet DEX execution is a separate path and does not use this file.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "proof", "mainnet-execution");
mkdirSync(outDir, { recursive: true });

const report = {
  track: "MAINNET LOCATE PROTOCOL",
  label: "Not a mainnet transaction",
  network: "mainnet",
  locateProtocol: true,
  enabled: false,
  signed: false,
  sent: false,
  deployed: false,
  blocker: "LOCATE protocol Mainnet deployment is prohibited. mainnetLocateDeployment and mainnetLocateTransactions remain false.",
  timestamp: new Date().toISOString(),
};

writeFileSync(join(outDir, "gate.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ enabled: false, signed: false, deployed: false, blocker: report.blocker }));
process.exit(2);
