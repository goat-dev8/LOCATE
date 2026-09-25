import assert from "node:assert/strict";
import { typedRefusal } from "./refusals.ts";

assert.equal(typedRefusal(null, 6015, "Custom 6015"), "NOT_CLAIMABLE_YET");
assert.equal(typedRefusal("OfferChanged", null, "Offer changed — refresh"), "TERMS_CHANGED");
assert.equal(typedRefusal(null, null, "Token transfers are paused by the issuer"), "MINT_PAUSED");
assert.equal(typedRefusal(null, null, "Not enough tokens delivered"), "INSUFFICIENT_GROSS");
assert.equal(typedRefusal(null, null, "429 Too Many Requests"), "RPC_RATE_LIMITED");
assert.equal(typedRefusal(null, null, "unrelated"), "unrelated");
console.log("refusals 6/6");
