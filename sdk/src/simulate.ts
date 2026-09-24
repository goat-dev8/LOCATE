import { Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { ERROR_NAMES } from "./constants.js";

export function decodeProgramError(err: unknown): { code: number | null; name: string | null } {
  const text = JSON.stringify(err);
  const match = text.match(/"Custom":(\d+)/);
  if (!match) return { code: null, name: null };
  const code = Number(match[1]);
  const name = code >= 6000 && code - 6000 < ERROR_NAMES.length ? ERROR_NAMES[code - 6000] : null;
  return { code, name };
}

export async function simulateAndDecode(connection: Connection, payer: PublicKey, instructions: TransactionInstruction[]) {
  const blockhash = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash.blockhash, instructions }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
  const decoded = decodeProgramError(sim.value.err);
  return { err: sim.value.err, logs: sim.value.logs, ...decoded, simulation: true as const };
}
