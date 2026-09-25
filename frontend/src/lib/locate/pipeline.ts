export type BalanceDelta = { mint: string; owner: string; before: string; after: string };

export function feeBpsAtTake(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 10_000) return null;
  return n;
}

export function refusalIfStampMoved(before: string, after: string): "TERMS_CHANGED" | null {
  return before === after ? null : "TERMS_CHANGED";
}

export function pairTokenDeltas(
  pre: Array<{ accountIndex: number; mint: string; owner?: string | null; amount: string }>,
  post: Array<{ accountIndex: number; mint: string; owner?: string | null; amount: string }>,
): BalanceDelta[] {
  return pre.map((row) => {
    const after = post.find((item) => item.accountIndex === row.accountIndex);
    return {
      mint: row.mint,
      owner: row.owner ?? "",
      before: row.amount,
      after: after?.amount ?? "0",
    };
  });
}
