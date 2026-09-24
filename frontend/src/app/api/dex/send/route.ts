import { NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";

const RPC = process.env.SOLANA_RPC_URL_MAINNET ?? "https://api.mainnet-beta.solana.com";
const LOCATE = "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started >= ms) {
        clearInterval(timer);
        resolve();
      }
    }, 250);
  });
}

export async function POST(request: Request) {
  const body = await request.json() as { signedTx?: string };
  if (!body.signedTx) {
    return NextResponse.json({ error: { code: "BAD_BODY", message: "signedTx is required" }, network: "mainnet", locateProtocol: false }, { status: 400 });
  }
  if (body.signedTx.includes(LOCATE)) {
    return NextResponse.json({ error: { code: "LOCATE_PROGRAM_FORBIDDEN_ON_MAINNET", message: "LOCATE program id appeared in a DEX swap" }, network: "mainnet", locateProtocol: false }, { status: 400 });
  }
  const connection = new Connection(RPC, "confirmed");
  const raw = Buffer.from(body.signedTx, "base64");
  const signature = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    maxRetries: 5,
  });
  for (let i = 0; i < 45; i++) {
    const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
    if (status.value?.err) {
      return NextResponse.json({
        network: "mainnet",
        locateProtocol: false,
        signature,
        err: status.value.err,
        verified: false,
      }, { status: 400 });
    }
    if (status.value?.confirmationStatus === "finalized" || status.value?.confirmationStatus === "confirmed") {
      const tx = await connection.getTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 })
        ?? await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      return NextResponse.json({
        network: "mainnet",
        locateProtocol: false,
        signature,
        slot: tx?.slot ?? null,
        err: tx?.meta?.err ?? null,
        feeLamports: tx?.meta?.fee ?? null,
        commitment: status.value.confirmationStatus,
        verified: tx?.meta?.err == null,
      });
    }
    await sleep(2000);
  }
  return NextResponse.json({
    network: "mainnet",
    locateProtocol: false,
    signature,
    verified: false,
    error: { code: "CONFIRMATION_TIMEOUT", message: "Mainnet confirmation timed out." },
  }, { status: 504 });
}
