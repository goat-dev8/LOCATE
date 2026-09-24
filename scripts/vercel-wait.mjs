import { readFileSync } from "node:fs";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}

const token = envValue("VERCEL_TOKEN");
const teamId = envValue("VERCEL_TEAM_ID");
const id = process.argv[2];
if (!id) throw new Error("usage: node scripts/vercel-wait.mjs <deploymentId>");
const deadline = Date.now() + 240000;
let last = "unknown";
while (Date.now() < deadline) {
  const response = await fetch("https://api.vercel.com/v13/deployments/" + id + "?teamId=" + encodeURIComponent(teamId), {
    headers: { authorization: "Bearer " + token },
  });
  const body = await response.json();
  last = body.readyState ?? body.status ?? JSON.stringify(body).slice(0, 120);
  console.log(last, body.url ?? "", body.aliasError?.message ?? "");
  if (["READY", "ERROR", "CANCELED"].includes(last)) break;
  await new Promise((resolve) => setTimeout(resolve, 12000));
}
console.log("final", last);
