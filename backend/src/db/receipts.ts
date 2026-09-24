import type { Sql } from "./sql.js";
import type { DecodedEvent } from "../chain/events.js";

export type ReceiptRow = {
  signature: string;
  event_index: number;
  kind: string;
  slot: string;
  block_time: string | null;
  offer: string | null;
  loan: string | null;
  lender: string | null;
  borrower: string | null;
  mint: string | null;
  amount_raw: string | null;
  collateral_usdc: string | null;
  fee_usdc: string | null;
  gross_raw: string | null;
  net_received_raw: string | null;
  borrower_received_raw: string | null;
  fee_bps: number | null;
  commitment: string;
  label: string | null;
  raw_event: unknown;
};

function field(event: DecodedEvent, name: string): string | null {
  const value = event.fields[name];
  return value === undefined ? null : String(value);
}

export async function upsertReceipt(
  sql: Sql,
  input: {
    signature: string;
    event: DecodedEvent;
    cluster: string;
    programId: string;
    slot: number;
    blockTime: number | null;
    commitment: "confirmed" | "finalized";
    source: "client_submit" | "catchup" | "script";
    label: string | null;
  },
) {
  const event = input.event;
  await sql`
    insert into locate.receipts (
      signature, event_index, cluster, program_id, kind, slot, block_time,
      offer, loan, lender, borrower, mint, amount_raw, collateral_usdc, fee_usdc,
      gross_raw, net_received_raw, borrower_received_raw, fee_bps, commitment, source, label, raw_event
    ) values (
      ${input.signature}, ${event.eventIndex}, ${input.cluster}, ${input.programId}, ${event.kind}::locate.event_kind,
      ${input.slot}, ${input.blockTime ? new Date(input.blockTime * 1000).toISOString() : null},
      ${field(event, "offer")}, ${field(event, "loan")}, ${field(event, "lender")}, ${field(event, "borrower")},
      ${field(event, "mint")}, ${field(event, "amountRaw")}, ${field(event, "collateralUsdc")}, ${field(event, "feeUsdc")},
      ${field(event, "grossRaw")}, ${field(event, "netReceivedRaw")}, ${field(event, "borrowerReceivedRaw")},
      ${typeof event.fields.feeBps === "number" ? event.fields.feeBps : null},
      ${input.commitment}, ${input.source}, ${input.label}, ${sql.json(event as never)}
    )
    on conflict (signature, event_index) do update set
      commitment = excluded.commitment,
      label = coalesce(locate.receipts.label, excluded.label),
      verified_at = now()
  `;
}
