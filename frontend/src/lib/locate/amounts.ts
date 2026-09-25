/** Display token amounts. Scaled UI is what the wallet reports. Raw is the chain integer. */

export function formatUnits(raw: string | number | bigint, decimals: number, maxFrac = 6): string {
  const negative = String(raw).startsWith("-");
  const digits = (negative ? String(raw).slice(1) : String(raw)).padStart(decimals + 1, "0");
  const cut = digits.length - decimals;
  const whole = digits.slice(0, cut);
  const frac = digits.slice(cut, cut + maxFrac).replace(/0+$/, "");
  const text = frac ? `${whole}.${frac}` : whole;
  return `${negative ? "-" : ""}${text}`;
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "unavailable";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
