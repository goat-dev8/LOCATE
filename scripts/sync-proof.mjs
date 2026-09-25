import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "frontend", "src", "app", "proof", "data");
const files = [
  "mainnet-fork/manifest.json",
  "mainnet-fork/openai-full-lifecycle.json",
  "mainnet-execution/gate.json",
  "local-validator/suite.json",
  "devnet/short-loop.json",
  "devnet/lifecycle.json",
  "devnet/protocol.json",
  "devnet/dex.json",
  "mainnet-dex/buyback.json",
  "jupiter-roundtrip/sell.json",
  "jupiter-roundtrip/buyback.json",
  "replay/manifest.json",
  "security/suite.json",
  "verification/source-build.json",
  "token2022/matrix.json",
  "qa/lighthouse-proof.json",
  "EXECUTION_STATUS.json",
  "mainnet-dex/sell.json",
  "mainnet-dex/balance-before.json",
  "mainnet-dex/balance-after-buyback.json",
  "mainnet-dex/sell-2.json",
  "mainnet-dex/buyback.json",
  "mainnet-fork/lifecycle.json",
];

for (const rel of files) {
  const from = join(root, "proof", rel);
  if (!existsSync(from)) throw new Error("missing " + rel);
  const to = join(dest, rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}
console.log(JSON.stringify({ copied: files.length, dest: "frontend/src/app/proof/data" }));
