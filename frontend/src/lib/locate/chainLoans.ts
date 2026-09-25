import { Connection, PublicKey } from "@solana/web3.js";

const PROGRAM = new PublicKey("F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6");

async function loanDisc(): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("account:Loan"));
  return new Uint8Array(hash).slice(0, 8);
}

function readPubkey(data: Uint8Array, offset: number): { key: string; offset: number } {
  return { key: new PublicKey(data.slice(offset, offset + 32)).toBase58(), offset: offset + 32 };
}

function readU64(data: Uint8Array, offset: number): { n: bigint; offset: number } {
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return { n: view.getBigUint64(0, true), offset: offset + 8 };
}

function readI64(data: Uint8Array, offset: number): { n: bigint; offset: number } {
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return { n: view.getBigInt64(0, true), offset: offset + 8 };
}

export async function loansFromChain(connection: Connection, wallet: string) {
  const disc = await loanDisc();
  const accounts = await connection.getProgramAccounts(PROGRAM, {
    commitment: "confirmed",
    filters: [{ dataSize: 253 }],
  });
  const now = Math.floor(Date.now() / 1000);
  const rows: Array<Record<string, string | number | boolean>> = [];
  for (const account of accounts) {
    const data = account.account.data;
    if (data.length < 253 || !disc.every((byte, i) => data[i] === byte)) continue;
    let o = 11;
    const offer = readPubkey(data, o); o = offer.offset;
    const lender = readPubkey(data, o); o = lender.offset;
    const lenderAta = readPubkey(data, o); o = lenderAta.offset;
    const borrower = readPubkey(data, o); o = borrower.offset;
    const mint = readPubkey(data, o); o = mint.offset;
    const amount = readU64(data, o); o = amount.offset;
    const collateral = readU64(data, o); o = collateral.offset;
    const fee = readU64(data, o); o = fee.offset;
    const start = readI64(data, o); o = start.offset;
    const maturity = readI64(data, o); o = maturity.offset;
    const claimAfter = readI64(data, o); o = claimAfter.offset;
    const feeBps = new DataView(data.buffer, data.byteOffset + o, 2).getUint16(0, true);
    const role = lender.key === wallet ? "lender" : borrower.key === wallet ? "borrower" : null;
    if (!role) continue;
    rows.push({
      pubkey: account.pubkey.toBase58(),
      offer: offer.key,
      lender: lender.key,
      lenderAta: lenderAta.key,
      borrower: borrower.key,
      mint: mint.key,
      amountRaw: amount.n.toString(),
      collateralUsdc: collateral.n.toString(),
      feeUsdc: fee.n.toString(),
      startTs: start.n.toString(),
      maturityTs: maturity.n.toString(),
      claimAfterTs: claimAfter.n.toString(),
      feeBpsAtTake: feeBps,
      claimableNow: now >= Number(claimAfter.n),
      role,
    });
  }
  return rows;
}

function receiptFields(row: Record<string, unknown>): Record<string, string> {
  const raw = row.raw_event;
  if (!raw || typeof raw !== "object" || !("fields" in raw)) return {};
  const fields = (raw as { fields?: Record<string, unknown> }).fields ?? {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) out[key] = String(value);
  return out;
}

/** Closed loans are absent from account scans. Terminal receipts are the chain record. */
export function settledLoansFromReceipts(
  receipts: Array<Record<string, unknown>>,
  wallet: string,
  openLoans: Set<string>,
): Array<Record<string, string | number | boolean>> {
  const byLoan = new Map<string, Array<Record<string, unknown>>>();
  for (const row of receipts) {
    const loan = String(row.loan ?? "");
    if (!loan || openLoans.has(loan)) continue;
    const list = byLoan.get(loan) ?? [];
    list.push(row);
    byLoan.set(loan, list);
  }
  const settled: Array<Record<string, string | number | boolean>> = [];
  for (const [loan, rows] of byLoan) {
    const terminal = rows.find((row) => row.kind === "loan_returned") ?? rows.find((row) => row.kind === "loan_claimed");
    if (!terminal) continue;
    const fields = receiptFields(terminal);
    const take = rows.find((row) => row.kind === "loan_taken");
    const takeFields = take ? receiptFields(take) : {};
    const lender = String(terminal.lender ?? fields.lender ?? "");
    const borrower = String(terminal.borrower ?? fields.borrower ?? "");
    const role = lender === wallet ? "lender" : borrower === wallet ? "borrower" : null;
    if (!role) continue;
    const returned = terminal.kind === "loan_returned";
    const feeRaw = takeFields.feeUsdc ?? "";
    const startTs = takeFields.startTs ?? "";
    const maturityTs = takeFields.maturityTs ?? "";
    const claimAfterTs = takeFields.claimAfterTs ?? "";
    settled.push({
      pubkey: loan,
      offer: String(terminal.offer ?? fields.offer ?? ""),
      lender,
      borrower,
      mint: String(terminal.mint ?? fields.mint ?? ""),
      amountRaw: fields.amountRaw ?? takeFields.amountRaw ?? "0",
      collateralUsdc: fields.collateralReleased ?? fields.collateralUsdc ?? takeFields.collateralUsdc ?? "0",
      feeUsdc: feeRaw,
      startTs,
      maturityTs,
      claimAfterTs,
      feeBpsAtTake: fields.feeBps ?? takeFields.feeBps ?? "0",
      claimableNow: false,
      role,
      status: returned ? "RETURNED" : "CLAIMED",
      termsKnown: startTs.length > 0 && maturityTs.length > 0,
      feeKnown: feeRaw.length > 0,
    });
  }
  return settled;
}
