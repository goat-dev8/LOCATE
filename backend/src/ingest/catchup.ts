import { Connection, PublicKey } from "@solana/web3.js";
import type { Sql } from "../db/sql.js";
import { upsertReceipt } from "../db/receipts.js";
import { verifySignature } from "../chain/verify.js";
import { DEMO_SIGNATURES } from "../demo.js";

let running = false;
let lastRun = 0;

export async function catchUp(sql: Sql, connection: Connection, programId: PublicKey, cluster: string, usdcMint: PublicKey) {
  if (Date.now() - lastRun < 60_000) return;
  if (running) return;
  running = true;
  try {
    const locked = await sql<{ locked: boolean }[]>`select pg_try_advisory_lock(hashtext('locate-catchup')) as locked`;
    if (!locked[0]?.locked) return;
    const cursor = await sql<{ last_signature: string | null }[]>`
      select last_signature from locate.ingest_cursor where cluster = ${cluster} and program_id = ${programId.toBase58()}
    `;
    const sigs = await connection.getSignaturesForAddress(programId, { until: cursor[0]?.last_signature ?? undefined, limit: 50 }, "confirmed");
    for (const row of [...sigs].reverse()) {
      const verified = await verifySignature(connection, programId, row.signature, usdcMint);
      if (verified.status === "rejected") continue;
      for (const event of verified.events) {
        await upsertReceipt(sql, {
          signature: row.signature,
          event,
          cluster,
          programId: programId.toBase58(),
          slot: verified.slot,
          blockTime: verified.blockTime,
          commitment: verified.commitment,
          source: "catchup",
          label: DEMO_SIGNATURES.has(row.signature) ? "self_originated_demo" : null,
        });
      }
    }
    const newest = sigs[0];
    if (newest) {
      await sql`
        insert into locate.ingest_cursor (cluster, program_id, last_signature, last_slot)
        values (${cluster}, ${programId.toBase58()}, ${newest.signature}, ${newest.slot})
        on conflict (cluster, program_id) do update set
          last_signature = excluded.last_signature,
          last_slot = excluded.last_slot,
          updated_at = now()
      `;
    }
    lastRun = Date.now();
    await sql`select pg_advisory_unlock(hashtext('locate-catchup'))`;
  } finally {
    running = false;
  }
}
