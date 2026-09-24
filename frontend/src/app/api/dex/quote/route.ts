import { NextResponse } from "next/server";

const OPENAI = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const JUPITER = process.env.JUPITER_API_BASE?.replace(/\/$/, "") ?? "https://api.jup.ag";

export async function POST(request: Request) {
  const body = await request.json() as { wallet?: string; side?: string; amountRaw?: string; slippageBps?: number; swapMode?: "ExactIn" | "ExactOut" };
  if (!body.wallet || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(body.wallet)) {
    return NextResponse.json({ error: { code: "BAD_WALLET", message: "wallet is required" }, network: "mainnet", locateProtocol: false }, { status: 400 });
  }
  if (body.side !== "sell" && body.side !== "buyback") {
    return NextResponse.json({ error: { code: "BAD_SIDE", message: "side must be sell or buyback" }, network: "mainnet", locateProtocol: false }, { status: 400 });
  }
  if (!body.amountRaw || !/^[1-9][0-9]*$/.test(body.amountRaw)) {
    return NextResponse.json({ error: { code: "MINIMUM_EXECUTABLE_AMOUNT", message: "amount must be greater than zero" }, network: "mainnet", locateProtocol: false }, { status: 400 });
  }
  const inputMint = body.side === "sell" ? OPENAI : USDC;
  const outputMint = body.side === "sell" ? USDC : OPENAI;
  const swapMode = body.swapMode ?? (body.side === "buyback" ? "ExactOut" : "ExactIn");
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: body.amountRaw,
    slippageBps: String(body.slippageBps ?? 100),
    dexes: "Meteora DLMM",
    maxAccounts: "40",
    swapMode,
  });
  const started = Date.now();
  const response = await fetch(JUPITER + "/swap/v1/quote?" + params.toString());
  const raw = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    return NextResponse.json({
      network: "mainnet",
      locateProtocol: false,
      error: { code: "QUOTE_FAILED", message: typeof raw.error === "string" ? raw.error : "quote failed" },
      raw,
    }, { status: response.status });
  }
  return NextResponse.json({
    network: "mainnet",
    locateProtocol: false,
    side: body.side,
    wallet: body.wallet,
    mint: OPENAI,
    usdcMint: USDC,
    fetchedAt: started,
    ageMs: Date.now() - started,
    quote: raw,
  });
}
