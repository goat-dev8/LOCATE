import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("usage: node sdk/tools/check-frontend.mjs <FRONTEND>");
  process.exit(2);
}

const failures = [];
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|jsx?|css|html)$/.test(name)) out.push(path);
  }
  return out;
}

const srcFiles = walk(join(root, "src"));
const fake = /mock|faker|fixture|dummy|lorem|Math\.random|fakeSig|sampleData|demoData|hardcoded|setTimeout\(/;
for (const file of srcFiles) {
  const text = readFileSync(file, "utf8");
  if (fake.test(text)) failures.push(file + " matches a fake-data pattern");
  if (/(?<!not )expected return|(?<!not )guaranteed|(?<!not )investment advice/i.test(text)) {
    failures.push(file + " contains a forbidden claim");
  }
}

const env = existsSync(join(root, ".env.example")) ? readFileSync(join(root, ".env.example"), "utf8") : "";
for (const key of ["VITE_API_BASE_URL", "VITE_SOLANA_CLUSTER", "VITE_SOLANA_RPC_URL", "VITE_LOCATE_PROGRAM_ID"]) {
  if (!env.includes(key) && !srcFiles.some((file) => readFileSync(file, "utf8").includes(key))) failures.push("missing " + key);
}

const dist = walk(join(root, "dist"));
const secret = /postgres:\/\/|sk_|ghp_|github_pat_|rnd_|supabase\.co|rnd_/;
for (const file of dist) {
  const text = readFileSync(file, "utf8");
  if (secret.test(text)) failures.push(file + " contains a secret-like string");
}
const bundle = dist.map((file) => readFileSync(file, "utf8")).join("\n");
if (dist.length && !bundle.includes("devnet test mint mirroring OPENAI")) failures.push("built bundle is missing the devnet mint banner");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("frontend check passed");
