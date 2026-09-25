import { Connection, PublicKey } from "@solana/web3.js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { readMint } from "../chain/mint.js";

const pubkey = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
const OPENAI = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ATA = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const LOCATE = "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6";
const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

function ata(owner: string, mint: string, program: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [new PublicKey(owner).toBuffer(), new PublicKey(program).toBuffer(), new PublicKey(mint).toBuffer()],
    new PublicKey(ATA),
  )[0];
}

function bad(reply: { code: (n: number) => { send: (b: unknown) => unknown } }, code: string, message: string, status = 400) {
  return reply.code(status).send({ error: { code, message }, network: "mainnet", locateProtocol: false });
}

async function tokenAmount(connection: Connection, address: PublicKey): Promise<string> {
  try {
    const balance = await connection.getTokenAccountBalance(address, "confirmed");
    return balance.value.amount;
  } catch {
    return "0";
  }
}

export function registerDexRoutes(app: FastifyInstance, config: AppConfig) {
  const mainnet = new Connection(config.MAINNET_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed");
  const jupiter = config.JUPITER_API_BASE.replace(/\/$/, "");

  app.get("/v1/dex/balances", async (request, reply) => {
    const query = z.object({ wallet: pubkey }).safeParse(request.query);
    if (!query.success) return bad(reply, "BAD_WALLET", "wallet is required");
    const wallet = query.data.wallet;
    const [sol, openai, usdc, mint, epoch] = await Promise.all([
      mainnet.getBalance(new PublicKey(wallet), "confirmed"),
      tokenAmount(mainnet, ata(wallet, OPENAI, TOKEN_2022)),
      tokenAmount(mainnet, ata(wallet, USDC, TOKEN)),
      readMint(mainnet, new PublicKey(OPENAI)),
      mainnet.getEpochInfo("confirmed"),
    ]);
    return {
      network: "mainnet",
      locateProtocol: false,
      label: "External Mainnet DEX balances. Not a LOCATE protocol execution.",
      wallet,
      mint: OPENAI,
      usdcMint: USDC,
      tokenProgram: TOKEN_2022,
      solLamports: sol.toString(),
      openaiRaw: openai,
      usdcRaw: usdc,
      decimals: mint.decimals,
      feeBps: mint.feeBps,
      maxFee: mint.maxFee,
      feePending: mint.feePending,
      paused: mint.paused,
      epoch: epoch.epoch.toString(),
      slot: epoch.absoluteSlot,
      fetchedAt: new Date().toISOString(),
    };
  });

  app.post("/v1/dex/quote", async (request, reply) => {
    const body = z.object({
      wallet: pubkey,
      side: z.enum(["sell", "buyback"]),
      amountRaw: z.string().regex(/^[0-9]+$/),
      slippageBps: z.coerce.number().int().min(1).max(100).default(100),
      swapMode: z.enum(["ExactIn", "ExactOut"]).optional(),
    }).safeParse(request.body);
    if (!body.success) return bad(reply, "BAD_BODY", "invalid quote request");
    const amount = BigInt(body.data.amountRaw);
    if (amount === 0n) return bad(reply, "MINIMUM_EXECUTABLE_AMOUNT", "amount must be greater than zero");
    const inputMint = body.data.side === "sell" ? OPENAI : USDC;
    const outputMint = body.data.side === "sell" ? USDC : OPENAI;
    const swapMode = body.data.swapMode ?? (body.data.side === "buyback" ? "ExactOut" : "ExactIn");
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: String(body.data.slippageBps),
      dexes: "Meteora DLMM",
      maxAccounts: "40",
      swapMode,
    });
    const started = Date.now();
    const response = await fetch(jupiter + "/swap/v1/quote?" + params.toString());
    const raw = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      return reply.code(response.status).send({
        network: "mainnet",
        locateProtocol: false,
        error: { code: "QUOTE_FAILED", message: typeof raw.error === "string" ? raw.error : "quote failed" },
        raw,
      });
    }
    return {
      network: "mainnet",
      locateProtocol: false,
      side: body.data.side,
      wallet: body.data.wallet,
      mint: OPENAI,
      usdcMint: USDC,
      fetchedAt: started,
      ageMs: Date.now() - started,
      quote: raw,
    };
  });

  app.post("/v1/dex/swap", async (request, reply) => {
    const body = z.object({
      wallet: pubkey,
      quoteResponse: z.record(z.string(), z.unknown()),
    }).safeParse(request.body);
    if (!body.success) return bad(reply, "BAD_BODY", "invalid swap request");
    const response = await fetch(jupiter + "/swap/v1/swap-instructions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        quoteResponse: body.data.quoteResponse,
        userPublicKey: body.data.wallet,
        wrapAndUnwrapSol: false,
        dynamicComputeUnitLimit: true,
      }),
    });
    const raw = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      return reply.code(response.status).send({
        network: "mainnet",
        locateProtocol: false,
        error: { code: "SWAP_BUILD_FAILED", message: "swap-instructions failed" },
        raw,
      });
    }
    const swap = raw.swapInstruction as { programId?: string } | undefined;
    if (swap?.programId !== JUPITER) return bad(reply, "JUPITER_PROGRAM_MISMATCH", "swap program is not the execution benchmark");
    const serialized = JSON.stringify(raw);
    if (serialized.includes(LOCATE)) return bad(reply, "LOCATE_PROGRAM_FORBIDDEN_ON_MAINNET", "LOCATE program id appeared in a DEX swap");
    return {
      network: "mainnet",
      locateProtocol: false,
      wallet: body.data.wallet,
      instructions: raw,
      fetchedAt: new Date().toISOString(),
    };
  });

  app.post("/v1/dex/verify", async (request, reply) => {
    const body = z.object({
      wallet: pubkey,
      signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/),
      side: z.enum(["sell", "buyback"]),
    }).safeParse(request.body);
    if (!body.success) return bad(reply, "BAD_BODY", "invalid verify request");
    const tx = await mainnet.getTransaction(body.data.signature, {
      commitment: "finalized",
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) return bad(reply, "NOT_FOUND", "transaction not found", 404);
    const keys = JSON.stringify(tx);
    if (keys.includes(LOCATE)) {
      return bad(reply, "LOCATE_PROGRAM_FORBIDDEN_ON_MAINNET", "this endpoint does not verify LOCATE protocol transactions");
    }
    return {
      network: "mainnet",
      locateProtocol: false,
      signature: body.data.signature,
      side: body.data.side,
      wallet: body.data.wallet,
      slot: tx.slot,
      err: tx.meta?.err ?? null,
      feeLamports: tx.meta?.fee ?? null,
      verified: tx.meta?.err == null,
      fetchedAt: new Date().toISOString(),
    };
  });
}
