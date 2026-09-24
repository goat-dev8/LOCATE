import { readFileSync } from "node:fs";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}

const headers = { authorization: "Bearer " + envValue("RENDER_API_KEY"), "content-type": "application/json" };
const value = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3010",
  "http://127.0.0.1:3010",
  "https://locate-blue.vercel.app",
  "https://locate-goats-projects-3f023cc9.vercel.app",
  "https://locate-efdyy1g9g-goats-projects-3f023cc9.vercel.app",
  "https://locate-git-main-goats-projects-3f023cc9.vercel.app",
].join(",");
const updated = await fetch("https://api.render.com/v1/services/srv-daq9ilgjo6nc73dkv78g/env-vars/CORS_ALLOWED_ORIGINS", {
  method: "PUT",
  headers,
  body: JSON.stringify({ value }),
});
console.log("put", updated.status);
const deploy = await fetch("https://api.render.com/v1/services/srv-daq9ilgjo6nc73dkv78g/deploys", {
  method: "POST",
  headers,
  body: JSON.stringify({ clearCache: "do_not_clear" }),
});
const deployBody = await deploy.json();
console.log("deploy", deploy.status, deployBody.id ?? deployBody.deploy?.id ?? "none");
const body = await fetch("https://api.render.com/v1/services/srv-daq9ilgjo6nc73dkv78g/env-vars?limit=20", { headers }).then((response) => response.json());
const rows = Array.isArray(body) ? body : [];
for (const row of rows) {
  const item = row.envVar ?? row;
  if (item.key === "CORS_ALLOWED_ORIGINS") console.log(item.value);
}
