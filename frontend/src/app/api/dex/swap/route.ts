import { NextResponse } from "next/server";
import { AddressLookupTableAccount, Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

const JUPITER = process.env.JUPITER_API_BASE?.replace(/\/$/, "") ?? "https://api.jup.ag";
const JUPITER_PROGRAM = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const LOCATE = "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6";
const RPC = process.env.SOLANA_RPC_URL_MAINNET ?? "https://api.mainnet-beta.solana.com";

type DexIx = {
  programId: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
};

function toIx(raw: DexIx | null | undefined): TransactionInstruction | null {
  if (!raw) return null;
  return new TransactionInstruction({
    programId: new PublicKey(raw.programId),
    keys: raw.accounts.map((account) => ({
      pubkey: new PublicKey(account.pubkey),
      isSigner: account.isSigner,
      isWritable: account.isWritable,
    })),
    data: Buffer.from(raw.data, "base64"),
  });
}

export async function POST(request: Request) {
  const body = await request.json() as { wallet?: string; quoteResponse?: Record<string, unknown> };
  if (!body.wallet || !body.quoteResponse) {
    return NextResponse.json({ error: { code: "BAD_BODY", message: "wallet and quoteResponse are required" }, network: "mainnet", locateProtocol: false }, { status: 400 });
  }
  const response = await fetch(JUPITER + "/swap/v1/swap-instructions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      quoteResponse: body.quoteResponse,
      userPublicKey: body.wallet,
      wrapAndUnwrapSol: false,
      dynamicComputeUnitLimit: true,
    }),
  });
  const raw = await response.json() as {
    computeBudgetInstructions?: DexIx[];
    setupInstructions?: DexIx[];
    swapInstruction?: DexIx;
    cleanupInstruction?: DexIx;
    addressLookupTableAddresses?: string[];
  };
  if (!response.ok) {
    return NextResponse.json({
      network: "mainnet",
      locateProtocol: false,
      error: { code: "SWAP_BUILD_FAILED", message: "swap-instructions failed" },
      raw,
    }, { status: response.status });
  }
  if (raw.swapInstruction?.programId !== JUPITER_PROGRAM) {
    return NextResponse.json({ error: { code: "JUPITER_PROGRAM_MISMATCH", message: "swap program is not the execution benchmark" }, network: "mainnet", locateProtocol: false }, { status: 400 });
  }
  if (JSON.stringify(raw).includes(LOCATE)) {
    return NextResponse.json({ error: { code: "LOCATE_PROGRAM_FORBIDDEN_ON_MAINNET", message: "LOCATE program id appeared in a DEX swap" }, network: "mainnet", locateProtocol: false }, { status: 400 });
  }
  const swapIx = toIx(raw.swapInstruction);
  if (!swapIx) {
    return NextResponse.json({ error: { code: "SWAP_BUILD_FAILED", message: "missing swap instruction" }, network: "mainnet", locateProtocol: false }, { status: 400 });
  }
  const connection = new Connection(RPC, "confirmed");
  const alts: AddressLookupTableAccount[] = [];
  for (const address of raw.addressLookupTableAddresses ?? []) {
    const table = await connection.getAddressLookupTable(new PublicKey(address));
    if (table.value) alts.push(table.value);
  }
  const instructions = [
    ...(raw.computeBudgetInstructions ?? []).map(toIx),
    ...(raw.setupInstructions ?? []).map(toIx),
    swapIx,
    toIx(raw.cleanupInstruction),
  ].filter((ix): ix is TransactionInstruction => Boolean(ix));
  const latest = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: new PublicKey(body.wallet),
    recentBlockhash: latest.blockhash,
    instructions,
  }).compileToV0Message(alts);
  const tx = new VersionedTransaction(message);
  const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) {
    return NextResponse.json({
      network: "mainnet",
      locateProtocol: false,
      error: { code: "SIMULATION_FAILED", message: "Simulation failed. No transaction was sent." },
      err: sim.value.err,
      logs: (sim.value.logs ?? []).slice(-8),
    }, { status: 400 });
  }
  return NextResponse.json({
    network: "mainnet",
    locateProtocol: false,
    wallet: body.wallet,
    txBase64: Buffer.from(tx.serialize()).toString("base64"),
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
    messageBytes: message.serialize().length,
    unitsConsumed: sim.value.unitsConsumed ?? null,
    fetchedAt: new Date().toISOString(),
  });
}
