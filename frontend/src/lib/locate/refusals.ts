export function typedRefusal(name: string | null, code: number | null, fallback: string): string {
  const text = `${name ?? ""} ${fallback}`.toLowerCase();
  if (code === 6015 || text.includes("not claimable")) return "NOT_CLAIMABLE_YET";
  if (text.includes("offer changed")) return "TERMS_CHANGED";
  if (text.includes("paused")) return "MINT_PAUSED";
  if (text.includes("fee rose") || text.includes("fee change")) return "FEE_CHANGED";
  if (text.includes("not enough tokens")) return "INSUFFICIENT_GROSS";
  if (text.includes("429")) return "RPC_RATE_LIMITED";
  if (text.includes("blockhash")) return "BLOCKHASH_EXPIRED";
  if (text.includes("not your offer") || text.includes("can't take your own")) return "WRONG_WALLET";
  return fallback;
}
