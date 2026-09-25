export type MintFee = {
  bps: number;
  newerBps: number;
  newerEpoch: number;
  pending: boolean;
};

const TRANSFER_FEE = 1;

function u16(data: Uint8Array, offset: number): number {
  return data[offset]! + data[offset + 1]! * 256;
}

function u64(data: Uint8Array, offset: number): number | null {
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  const value = view.getBigUint64(0, true);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(value);
}

/** Active Token-2022 transfer fee for this epoch. Returns null if the mint has no fee config. */
export function readTransferFee(data: Uint8Array, epoch: number): MintFee | null {
  if (data.length < 166 || !Number.isInteger(epoch) || epoch < 0) return null;
  let offset = 166;
  while (offset + 4 <= data.length) {
    const type = u16(data, offset);
    const length = u16(data, offset + 2);
    const start = offset + 4;
    if (length > data.length - start) return null;
    if (type === TRANSFER_FEE && length >= 108) {
      const olderEpoch = u64(data, start + 72);
      const newerEpoch = u64(data, start + 90);
      if (olderEpoch == null || newerEpoch == null) return null;
      const olderBps = u16(data, start + 88);
      const newerBps = u16(data, start + 106);
      const pending = newerEpoch > epoch;
      return {
        bps: epoch >= newerEpoch ? newerBps : olderBps,
        newerBps,
        newerEpoch,
        pending,
      };
    }
    offset = start + length;
  }
  return null;
}
