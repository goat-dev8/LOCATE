import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}

const key = envValue("RENDER_API_KEY");
const ownerId = envValue("RENDER_OWNER_ID");
const headers = { authorization: "Bearer " + key, "content-type": "application/json" };

async function api(path, init = {}) {
  const response = await fetch("https://api.render.com/v1" + path, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await response.text();
  if (!response.ok) throw new Error(response.status + " " + path + " " + text.slice(0, 400));
  return text ? JSON.parse(text) : {};
}

const listed = await api("/services?limit=50");
const rows = Array.isArray(listed) ? listed : listed.services ?? [];
let service = rows.map((row) => row.service ?? row).find((row) => row.name === "locate-api");
if (!service) {
  const created = await api("/services", {
    method: "POST",
    body: JSON.stringify({
      type: "web_service",
      name: "locate-api",
      ownerId,
      repo: "https://github.com/goat-dev8/LOCATE",
      autoDeploy: "no",
      branch: "main",
      serviceDetails: {
        runtime: "node",
        plan: "free",
        region: "frankfurt",
        rootDir: "backend",
        buildCommand: "npm ci && npm run build",
        startCommand: "node dist/server.js",
        healthCheckPath: "/health",
        envSpecificDetails: { buildCommand: "npm ci && npm run build", startCommand: "node dist/server.js" },
      },
    }),
  });
  service = created.service ?? created;
}

await api("/services/" + service.id, {
  method: "PATCH",
  body: JSON.stringify({
    autoDeploy: "no",
    rootDir: "backend",
    serviceDetails: {
      envSpecificDetails: {
        buildCommand: "npm ci --include=dev && npm run build",
        startCommand: "node dist/server.js",
      },
    },
  }),
});
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const envVars = [
  ["NODE_VERSION", "22"],
  ["PORT", "10000"],
  ["SOLANA_CLUSTER", "devnet"],
  ["SOLANA_RPC_URL", envValue("SOLANA_RPC_URL_DEVNET")],
  ["LOCATE_PROGRAM_ID", "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6"],
  ["DATABASE_URL", envValue("DATABASE_URL")],
  ["JUPITER_API_BASE", envValue("JUPITER_API_BASE")],
  ["PRESTOCKS_API_BASE", envValue("PRESTOCKS_API_BASE")],
  ["CORS_ALLOWED_ORIGINS", "http://localhost:5173"],
  ["GIT_SHA", sha],
].map(([keyName, value]) => ({ key: keyName, value }));
await api("/services/" + service.id + "/env-vars", { method: "PUT", body: JSON.stringify(envVars) });
const deploy = await api("/services/" + service.id + "/deploys", {
  method: "POST",
  body: JSON.stringify({ clearCache: "do_not_clear" }),
});
const evidence = {
  serviceId: service.id,
  name: service.name,
  url: service.serviceDetails?.url ?? service.url ?? null,
  deployId: deploy.id ?? deploy.deploy?.id ?? deploy[0]?.deploy?.id ?? null,
  gitSha: sha,
  fetchedAt: new Date().toISOString(),
  directUrlOnService: false,
};
mkdirSync(new URL("../evidence/backend/", import.meta.url), { recursive: true });
writeFileSync(new URL("../evidence/backend/render-create.json", import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ serviceId: evidence.serviceId, deployId: evidence.deployId, url: evidence.url }));
