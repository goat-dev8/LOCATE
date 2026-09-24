export function epochFee(bps: number, maxFee: bigint, amount: bigint): bigint {
  if (bps === 0 || amount === 0n) return 0n;
  const raw = (amount * BigInt(bps) + 9999n) / 10000n;
  return raw < maxFee ? raw : maxFee;
}

const I64_MAX = (1n << 63n) - 1n;

export function grossForNet(bps: number, maxFee: bigint, net: bigint): bigint {
  if (net === 0n) throw new Error("MathOverflow");
  if (bps === 0) return net;
  if (bps > 10_000) throw new Error("MathOverflow");
  if (bps === 10_000) {
    if (maxFee === (1n << 64n) - 1n) throw new Error("MathOverflow");
    const gross = net + maxFee;
    if (gross > (1n << 64n) - 1n) throw new Error("MathOverflow");
    const got = gross - epochFee(bps, maxFee, gross);
    if (got >= net) return gross;
    throw new Error("MathOverflow");
  }
  const denom = 10_000n - BigInt(bps);
  const inverse = (net * BigInt(bps) + denom - 1n) / denom;
  if (inverse > (1n << 64n) - 1n) throw new Error("MathOverflow");
  let gross = inverse > maxFee ? net + maxFee : net + inverse;
  if (gross > (1n << 64n) - 1n) throw new Error("MathOverflow");
  let found = false;
  for (let i = 0; i < 3; i++) {
    const got = gross - epochFee(bps, maxFee, gross);
    if (got >= net) {
      found = true;
      break;
    }
    gross += 1n;
    if (gross > (1n << 64n) - 1n) throw new Error("MathOverflow");
  }
  if (!found) throw new Error("MathOverflow");
  while (gross > net) {
    const prev = gross - 1n;
    const got = prev - epochFee(bps, maxFee, prev);
    if (got >= net) gross = prev;
    else break;
    if (net + 8n < gross) break;
  }
  return gross;
}

export function schedule(start: bigint, term: bigint, grace: bigint): { maturity: bigint; claimAfter: bigint } {
  const maturity = start + term;
  const claimAfter = maturity + grace;
  if (maturity > I64_MAX || claimAfter > I64_MAX || maturity < start || claimAfter < maturity) throw new Error("MathOverflow");
  return { maturity, claimAfter };
}

export function checkedAdd(left: bigint, right: bigint): bigint {
  const sum = left + right;
  if (sum > (1n << 64n) - 1n) throw new Error("MathOverflow");
  return sum;
}

export function rawToUi(raw: bigint, decimals: number, multiplier: string): string {
  const [whole, frac = ""] = multiplier.split(".");
  const scale = 10n ** BigInt(frac.length);
  const mult = BigInt(whole + frac.padEnd(frac.length, "0"));
  const base = 10n ** BigInt(decimals);
  const scaled = (raw * mult) / (base * scale);
  const remainder = (raw * mult) % (base * scale);
  if (remainder === 0n) return scaled.toString();
  const digits = remainder.toString().padStart(decimals + frac.length, "0").replace(/0+$/, "");
  return scaled.toString() + "." + digits;
}

export function uiToRaw(ui: string, decimals: number): bigint {
  const [whole, frac = ""] = ui.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole + padded);
}
