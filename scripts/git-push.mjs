import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}

const token = envValue("GITHUB_TOKEN");
const remote = "https://x-access-token:" + token + "@github.com/goat-dev8/LOCATE.git";
const result = spawnSync("git", ["push", remote, "HEAD:main"], { encoding: "utf8" });
const scrub = (text) => (text || "").replaceAll(token, "[redacted]");
process.stdout.write(scrub(result.stdout));
process.stderr.write(scrub(result.stderr));
process.exit(result.status ?? 1);
