import { Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { MAINNET_USDC, TOKEN, TOKEN_2022, ata } from "@locate/sdk";
import { evaluateDexQuote, OPENAI_MAINNET_MINT, type DexSide } from "@locate/sdk";

export const MAINNET_RPC_URL = process.env.VITE_SOLANA_RPC_URL_MAINNET ?? "https://api.mainnet-beta.solana.com";
export const OPENAI_MINT = OPENAI_MAINNET_MINT;
export const USDC_MINT = MAINNET_USDC.toBase58();
export const JUPITER_V6_TEXT = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
export const LOCATE_PROGRAM = "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6";

export function mainnetConnection(): Connection {
  return new Connection(MAINNET_RPC_URL, "confirmed");
}

export function openaiAta(wallet: string): PublicKey {
  return ata(new PublicKey(wallet), new PublicKey(OPENAI_MINT), TOKEN_2022);
}

export function usdcAta(wallet: string): PublicKey {
  return ata(new PublicKey(wallet), MAINNET_USDC, TOKEN);
}

export type DexIx = {
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

export async function compileSwapTx(input: {
  connection: Connection;
  payer: PublicKey;
  payload: {
    computeBudgetInstructions?: DexIx[];
    setupInstructions?: DexIx[];
    swapInstruction?: DexIx;
    cleanupInstruction?: DexIx;
    addressLookupTableAddresses?: string[];
  };
}): Promise<{ tx: VersionedTransaction; blockhash: string; lastValidBlockHeight: number; messageBytes: number; programIds: string[] }> {
  const swapIx = toIx(input.payload.swapInstruction);
  if (!swapIx || swapIx.programId.toBase58() !== JUPITER_V6_TEXT) {
    throw new Error("swap program is not the execution benchmark");
  }
  const instructions = [
    ...(input.payload.computeBudgetInstructions ?? []).map(toIx),
    ...(input.payload.setupInstructions ?? []).map(toIx),
    swapIx,
    toIx(input.payload.cleanupInstruction),
  ].filter((ix): ix is TransactionInstruction => Boolean(ix));
  const programIds = [...new Set(instructions.map((ix) => ix.programId.toBase58()))];
  if (programIds.includes(LOCATE_PROGRAM)) {
    throw new Error("LOCATE program id is forbidden on the Mainnet DEX path");
  }
  const alts = [];
  for (const address of input.payload.addressLookupTableAddresses ?? []) {
    const table = await input.connection.getAddressLookupTable(new PublicKey(address));
    if (table.value) alts.push(table.value);
  }
  const latest = await input.connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: input.payer,
    recentBlockhash: latest.blockhash,
    instructions,
  }).compileToV0Message(alts);
  return {
    tx: new VersionedTransaction(message),
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
    messageBytes: message.serialize().length,
    programIds,
  };
}

export { evaluateDexQuote, type DexSide };
