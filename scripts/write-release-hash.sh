#!/bin/bash
set -euo pipefail
python3 - <<'PY'
import hashlib, json
from datetime import datetime, timezone
from pathlib import Path
home = Path.home()
local = (home/"locate-target/deploy/locate.so").read_bytes()
dump = (home/"locate-target/deploy/locate-onchain.so").read_bytes()
out = {
  "cluster": "devnet",
  "programId": "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6",
  "authority": "Hbkpp56cwNUgXbzFGhYoNbz3Vs3nMqVihW1HroK8TvaC",
  "programData": "DSbRjFotfkpDqdKNPQ9dFshpTi5cg57bXL72VRxM7Vhh",
  "lastDeployedSlot": 503243469,
  "originalDeploySignature": "4qwgdv1cdjnXVkgJNpE3QH8SwtHopdocvwp4dvSa42bXjNhpH9jnPusabjNEcsU3yqnf6WvkHZJi8L2d8hKkwgtP",
  "dataLength": 395683,
  "localBytes": len(local),
  "localSha256": hashlib.sha256(local).hexdigest(),
  "dumpBytes": len(dump),
  "dumpSha256": hashlib.sha256(dump).hexdigest(),
  "elfPrefixMatchesLocal": dump[:len(local)] == local,
  "paddingIsZero": not any(dump[len(local):]),
  "upgradeSent": False,
  "note": "solana program dump returns the allocated buffer, zero-padded to max-len. The ELF prefix matches the local devnet binary, so no identical-byte upgrade was sent.",
  "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
}
path = Path("/mnt/d/route/sol/LOCATE/evidence/devnet/release-hash.json")
path.write_text(json.dumps(out, indent=2) + "\n")
print(out["elfPrefixMatchesLocal"], out["localSha256"])
PY
