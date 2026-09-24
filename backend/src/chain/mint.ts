import { Connection, PublicKey } from "@solana/web3.js";

export type MintView = {
  decimals: number;
  feeBps: number;
  maxFee: string;
  feePending: boolean;
  paused: boolean;
  hookSet: boolean;
  epoch: string;
};

const TRANSFER_FEE = 1;
const TRANSFER_HOOK = 14;
const PAUSABLE = 26;

function walkExtensions(data: Buffer): Map<number, Buffer> {
  const out = new Map<number, Buffer>();
  let offset = 166;
  while (offset + 4 <= data.length) {
    const type = data.readUInt16LE(offset);
    const len = data.readUInt16LE(offset + 2);
    offset += 4;
    if (type === 0 || offset + len > data.length) break;
    out.set(type, data.subarray(offset, offset + len));
    offset += len;
  }
  return out;
}

function feeAt(body: Buffer, epoch: bigint): { bps: number; maxFee: bigint; pending: boolean } {
  const newerEpoch = body.readBigUInt64LE(72 + 18);
  const active = epoch >= newerEpoch ? body.subarray(72 + 18, 72 + 36) : body.subarray(72, 90);
  return {
    bps: active.readUInt16LE(16),
    maxFee: active.readBigUInt64LE(8),
    pending: newerEpoch > epoch,
  };
}

export async function readMint(connection: Connection, mint: PublicKey): Promise<MintView> {
  const [info, epochInfo] = await Promise.all([
    connection.getAccountInfo(mint, "confirmed"),
    connection.getEpochInfo("confirmed"),
  ]);
  if (!info) throw new Error("mint missing");
  const data = Buffer.from(info.data);
  const decimals = data.readUInt8(44);
  const extensions = walkExtensions(data);
  const epoch = BigInt(epochInfo.epoch);
  const feeBody = extensions.get(TRANSFER_FEE);
  const fee = feeBody && feeBody.length >= 108 ? feeAt(feeBody, epoch) : { bps: 0, maxFee: 0n, pending: false };
  const hook = extensions.get(TRANSFER_HOOK);
  const hookSet = Boolean(hook && hook.length >= 64 && !PublicKey.default.equals(new PublicKey(hook.subarray(32, 64))));
  const pause = extensions.get(PAUSABLE);
  const paused = Boolean(pause && pause.length > 32 && pause[32] !== 0);
  return {
    decimals,
    feeBps: fee.bps,
    maxFee: fee.maxFee.toString(),
    feePending: fee.pending,
    paused,
    hookSet,
    epoch: epoch.toString(),
  };
}

export function epochFee(bps: number, maxFee: bigint, amount: bigint): bigint {
  if (bps === 0 || amount === 0n) return 0n;
  const raw = (amount * BigInt(bps) + 9999n) / 10000n;
  return raw < maxFee ? raw : maxFee;
}

export function grossForNet(bps: number, maxFee: bigint, net: bigint): bigint {
  if (net === 0n || bps === 0) return net;
  const denom = 10000n - BigInt(bps);
  let gross = net + (net * BigInt(bps) + denom - 1n) / denom;
  if (gross - net > maxFee) gross = net + maxFee;
  for (let i = 0; i < 3; i++) {
    if (gross - epochFee(bps, maxFee, gross) >= net) break;
    gross += 1n;
  }
  while (gross > net) {
    const prev = gross - 1n;
    if (prev - epochFee(bps, maxFee, prev) >= net) gross = prev;
    else break;
  }
  return gross;
}
