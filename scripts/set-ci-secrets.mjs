import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}

const repo = "goat-dev8/LOCATE";
const env = { ...process.env, GH_TOKEN: envValue("GITHUB_TOKEN") };
function gh(args, input) {
  const result = spawnSync("gh", args, { input, env, encoding: "utf8" });
  if (result.status !== 0) {
    console.log(args[0], args[1], "failed", result.status);
    process.exit(result.status ?? 1);
  }
  console.log(args[1], args[2] ?? "ok", "set");
}

for (const name of ["DIRECT_URL", "DATABASE_URL", "RENDER_API_KEY"]) {
  gh(["secret", "set", name, "--repo", repo], envValue(name));
}
gh(["variable", "set", "RENDER_SERVICE_ID", "--repo", repo, "--body", "srv-daq9ilgjo6nc73dkv78g"]);
gh(["variable", "set", "LOCATE_PROGRAM_ID", "--repo", repo, "--body", "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6"]);
const environment = spawnSync("gh", ["api", "--method", "PUT", `repos/${repo}/environments/production`], { env, encoding: "utf8" });
console.log("environment", environment.status);
