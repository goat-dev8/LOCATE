import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}

const token = envValue("VERCEL_TOKEN");
const teamId = envValue("VERCEL_TEAM_ID");
const headers = { authorization: "Bearer " + token, "content-type": "application/json" };

async function api(path, init = {}) {
  const url = "https://api.vercel.com" + path + (path.includes("?") ? "&" : "?") + "teamId=" + encodeURIComponent(teamId);
  const response = await fetch(url, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await response.text();
  if (!response.ok) throw new Error(response.status + " " + path + " " + text.slice(0, 500));
  return text ? JSON.parse(text) : {};
}

const listed = await api("/v9/projects");
const projects = listed.projects ?? listed;
let project = Array.isArray(projects) ? projects.find((row) => row.name === "locate") : null;
if (!project) {
  project = await api("/v11/projects", {
    method: "POST",
    body: JSON.stringify({
      name: "locate",
      framework: "nextjs",
      gitRepository: { type: "github", repo: "goat-dev8/LOCATE" },
      rootDirectory: "frontend",
    }),
  });
}

const publicEnv = [
  ["VITE_API_BASE_URL", "https://locate-api-znz1.onrender.com"],
  ["VITE_SOLANA_CLUSTER", "devnet"],
  ["VITE_SOLANA_RPC_URL", "https://api.devnet.solana.com"],
  ["VITE_LOCATE_PROGRAM_ID", "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6"],
];
for (const [key, value] of publicEnv) {
  await api("/v10/projects/" + project.id + "/env", {
    method: "POST",
    body: JSON.stringify({ key, value, type: "plain", target: ["production", "preview", "development"] }),
  }).catch((error) => {
    if (!String(error).includes("ENV_CONFLICT")) throw error;
  });
}

await api("/v9/projects/" + project.id, {
  method: "PATCH",
  body: JSON.stringify({
    rootDirectory: "frontend",
    ssoProtection: null,
  }),
});

const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const deploy = await api("/v13/deployments?forceNew=1", {
  method: "POST",
  body: JSON.stringify({
    name: "locate",
    project: project.id,
    gitSource: { type: "github", repoId: project.link?.repoId, ref: "main" },
    target: "production",
  }),
});

mkdirSync(new URL("../evidence/qa/", import.meta.url), { recursive: true });
const evidence = {
  projectId: project.id,
  name: project.name,
  deploymentId: deploy.id ?? deploy.uid ?? null,
  url: deploy.url ? "https://" + deploy.url : null,
  gitSha: sha,
  fetchedAt: new Date().toISOString(),
};
writeFileSync(new URL("../evidence/qa/vercel-deploy.json", import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ projectId: evidence.projectId, deploymentId: evidence.deploymentId, url: evidence.url }));
