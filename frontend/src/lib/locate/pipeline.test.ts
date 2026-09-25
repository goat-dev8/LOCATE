import assert from "node:assert/strict";
import { feeBpsAtTake, pairTokenDeltas, refusalIfStampMoved } from "./pipeline.ts";

assert.equal(refusalIfStampMoved("aaa", "aaa"), null);
assert.equal(refusalIfStampMoved("aaa", "bbb"), "TERMS_CHANGED");
assert.equal(refusalIfStampMoved("", "missing"), "TERMS_CHANGED");

const deltas = pairTokenDeltas(
  [{ accountIndex: 2, mint: "mint", owner: "owner", amount: "1000" }],
  [{ accountIndex: 2, mint: "mint", owner: "owner", amount: "400" }],
);
assert.equal(deltas.length, 1);
assert.equal(deltas[0].before, "1000");
assert.equal(deltas[0].after, "400");

const missing = pairTokenDeltas(
  [{ accountIndex: 1, mint: "mint", owner: null, amount: "5" }],
  [],
);
assert.equal(missing[0].after, "0");
assert.equal(missing[0].owner, "");

assert.equal(feeBpsAtTake(100), 100);
assert.equal(feeBpsAtTake("100"), 100);
assert.equal(feeBpsAtTake(undefined), null);
assert.equal(feeBpsAtTake(""), null);
assert.equal(feeBpsAtTake(10_001), null);
console.log("pipeline 10/10");
