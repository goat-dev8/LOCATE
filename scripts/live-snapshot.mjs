import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim();
  }
  throw new Error("missing " + name);
}

const rpc = envValue("SOLANA_RPC_URL_MAINNET");
const jupiter = envValue("JUPITER_API_BASE").replace(/\/$/, "");
const prestocks = envValue("PRESTOCKS_API_BASE").replace(/\/$/, "");
const mint = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
const fetchedAt = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

async function rpcCall(method, params) {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await response.json();
  if (body.error) throw new Error(method + " " + body.error.message);
  return body.result;
}

const catalogResponse = await fetch(prestocks + "/api/prestocks");
if (!catalogResponse.ok) throw new Error("catalog " + catalogResponse.status);
const catalog = await catalogResponse.json();
const slot = await rpcCall("getSlot", [{ commitment: "confirmed" }]);
const epoch = await rpcCall("getEpochInfo", [{ commitment: "confirmed" }]);
const mintInfo = await rpcCall("getAccountInfo", [mint, { encoding: "jsonParsed", commitment: "confirmed" }]);
await new Promise((resolve) => setTimeout(resolve, 2000));
const priceResponse = await fetch(jupiter + "/price/v3?ids=" + mint);
const price = priceResponse.ok ? await priceResponse.json() : { error: priceResponse.status };

const dir = new URL("../evidence/live-data/", import.meta.url);
mkdirSync(dir, { recursive: true });
const common = { fetchedAt: new Date().toISOString(), slot, epoch: epoch.epoch, cluster: "mainnet-beta" };
writeFileSync(new URL(`prestocks-${fetchedAt}.json`, dir), JSON.stringify({ ...common, catalog }, null, 2));
writeFileSync(new URL(`jupiter-${fetchedAt}.json`, dir), JSON.stringify({ ...common, mint, price }, null, 2));
writeFileSync(new URL(`openai-mint-${slot}.json`, dir), JSON.stringify({ ...common, mint, account: mintInfo }, null, 2));
console.log(JSON.stringify({ slot, epoch: epoch.epoch, catalog: catalogResponse.status, price: priceResponse.status }));
