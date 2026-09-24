import { readFileSync, writeFileSync } from "node:fs";

function envValue(name) {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\n/)) {
    if (line.startsWith(name + "=")) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("missing " + name);
}

const OPENAI = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const base = envValue("JUPITER_API_BASE").replace(/\/$/, "");

async function quote(label, extra) {
  const params = new URLSearchParams({
    inputMint: USDC,
    outputMint: OPENAI,
    slippageBps: "100",
    maxAccounts: "40",
    ...extra,
  });
  const response = await fetch(base + "/swap/v1/quote?" + params);
  const body = await response.json();
  return {
    label,
    status: response.status,
    inAmount: body.inAmount ?? null,
    outAmount: body.outAmount ?? null,
    otherAmountThreshold: body.otherAmountThreshold ?? null,
    error: body.error ?? body.errorCode ?? null,
    route: (body.routePlan ?? []).map((hop) => hop.swapInfo?.label).filter(Boolean),
    swapMode: body.swapMode ?? extra.swapMode ?? "ExactIn",
  };
}

const rows = [];
rows.push(await quote("exactOut-1000-meteora", { amount: "1000", swapMode: "ExactOut", dexes: "Meteora DLMM" }));
rows.push(await quote("exactOut-1000-any", { amount: "1000", swapMode: "ExactOut" }));
rows.push(await quote("exactIn-1982-meteora", { amount: "1982", dexes: "Meteora DLMM" }));
rows.push(await quote("exactIn-1982-any", { amount: "1982" }));
rows.push(await quote("exactIn-2500-any", { amount: "2500" }));
rows.push(await quote("exactOut-978-any", { amount: "978", swapMode: "ExactOut" }));

const out = {
  network: "mainnet",
  locateProtocol: false,
  label: "External Mainnet DEX buyback route probe. Not a LOCATE protocol transaction.",
  timestamp: new Date().toISOString(),
  rows,
};
writeFileSync(new URL("../proof/mainnet-dex/buyback-routes.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
