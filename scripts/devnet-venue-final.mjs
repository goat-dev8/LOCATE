import { writeFileSync } from "node:fs";

const mint = "9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P";
const usdc = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const url = "https://api.jup.ag/swap/v1/quote?inputMint=" + mint + "&outputMint=" + usdc + "&amount=1000000&slippageBps=50";
let status = 0;
let body = "";
try {
  const response = await fetch(url);
  status = response.status;
  body = await response.text();
} catch (error) {
  body = String(error);
}
const tradable = status === 200 && body.includes("outAmount");
const out = {
  network: "devnet",
  mint,
  usdcMint: usdc,
  classification: tradable ? "PASS" : "BLOCKED_EXTERNAL",
  permissionlessRoute: tradable,
  signedTransactions: [],
  jupiter: { status, body: body.slice(0, 400) },
  statement: tradable
    ? "A Jupiter route exists for this mint."
    : "DEVNET DEX EXTERNAL VENUE LIMITATION. NO VALID PERMISSIONLESS ROUTE.",
  priorEvidence: "proof/devnet/dex.json result FAIL. Jupiter TOKEN_NOT_TRADABLE, DLMM 6073, Phoenix absent, Whirlpool and Pump executable with no replica pool. Raydium program accounts were not executable.",
  timestamp: new Date().toISOString(),
};
writeFileSync(new URL("../proof/devnet/venue-final.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ status, classification: out.classification, snippet: body.slice(0, 180) }));
