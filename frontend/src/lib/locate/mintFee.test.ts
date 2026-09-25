import assert from "node:assert/strict";
import test from "node:test";
import { readTransferFee } from "./mintFee.ts";

function mintWithFee(olderEpoch: number, olderBps: number, newerEpoch: number, newerBps: number): Uint8Array {
  const data = new Uint8Array(166 + 4 + 108);
  data[165] = 1;
  const view = new DataView(data.buffer);
  view.setUint16(166, 1, true);
  view.setUint16(168, 108, true);
  const start = 170;
  view.setBigUint64(start + 72, BigInt(olderEpoch), true);
  view.setUint16(start + 88, olderBps, true);
  view.setBigUint64(start + 90, BigInt(newerEpoch), true);
  view.setUint16(start + 106, newerBps, true);
  return data;
}

test("active fee stays on the older schedule until the newer epoch", () => {
  const data = mintWithFee(1039, 100, 1043, 300);
  assert.deepEqual(readTransferFee(data, 1042), { bps: 100, newerBps: 300, newerEpoch: 1043, pending: true });
  assert.equal(readTransferFee(data, 1043)?.bps, 300);
  assert.equal(readTransferFee(data, 1043)?.pending, false);
});

test("a mint without a fee config is not assumed to be 100 bps", () => {
  assert.equal(readTransferFee(new Uint8Array(200), 1042), null);
});
