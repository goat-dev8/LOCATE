import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { MAINNET_USDC, TOKEN, TOKEN_2022, ata } from "@locate/sdk";
import { readTransferFee } from "@/lib/locate/mintFee";

const OPENAI = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
const RPC = process.env.VITE_SOLANA_RPC_URL_MAINNET ?? "https://api.mainnet-beta.solana.com";

async function amount(connection: Connection, address: PublicKey): Promise<string> {
  try {
    const balance = await connection.getTokenAccountBalance(address, "confirmed");
    return balance.value.amount;
  } catch {
    return "0";
  }
}

export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get("wallet") ?? "";
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    return NextResponse.json({ error: { code: "BAD_WALLET", message: "wallet is required" }, network: "mainnet", locateProtocol: false }, { status: 400 });
  }
  const connection = new Connection(RPC, "confirmed");
  const owner = new PublicKey(wallet);
  const [sol, openai, usdc, mint, epoch] = await Promise.all([
    connection.getBalance(owner, "confirmed"),
    amount(connection, ata(owner, new PublicKey(OPENAI), TOKEN_2022)),
    amount(connection, ata(owner, MAINNET_USDC, TOKEN)),
    connection.getAccountInfo(new PublicKey(OPENAI), "confirmed"),
    connection.getEpochInfo("confirmed"),
  ]);
  const decimals = mint ? mint.data[44] : 0;
  const fee = mint ? readTransferFee(mint.data, epoch.epoch) : null;
  return NextResponse.json({
    network: "mainnet",
    locateProtocol: false,
    label: "External Mainnet DEX balances. Not a LOCATE protocol execution.",
    wallet,
    mint: OPENAI,
    usdcMint: MAINNET_USDC.toBase58(),
    tokenProgram: TOKEN_2022.toBase58(),
    solLamports: sol.toString(),
    openaiRaw: openai,
    usdcRaw: usdc,
    decimals,
    feeBps: fee?.bps ?? null,
    newerFeeBps: fee?.newerBps ?? null,
    newerFeeEpoch: fee?.newerEpoch ?? null,
    feePending: fee?.pending ?? null,
    epoch: epoch.epoch.toString(),
    slot: epoch.absoluteSlot,
    fetchedAt: new Date().toISOString(),
  });
}
