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
const headers = { authorization: "Bearer " + token };
const project = await fetch("https://api.vercel.com/v9/projects/prj_yAPOlf69pkEGaMRb1m0mEyRbTbuX?teamId=" + encodeURIComponent(teamId), { headers }).then((r) => r.json());
const deploy = await fetch("https://api.vercel.com/v13/deployments/dpl_EHrZCbXs8vD3aH5BNk1EBRJ4ZnsA?teamId=" + encodeURIComponent(teamId), { headers }).then((r) => r.json());
console.log(JSON.stringify({
  readyState: deploy.readyState,
  url: deploy.url,
  aliases: deploy.aliases ?? project.targets?.production?.alias ?? project.alias,
  sso: project.ssoProtection ?? null,
  production: project.targets?.production ?? null,
}, null, 2));
