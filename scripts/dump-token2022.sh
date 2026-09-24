#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/tests/fixtures/mainnet"
mkdir -p "$OUT"
RPC="${SOLANA_RPC_URL_MAINNET:?SOLANA_RPC_URL_MAINNET is required}"
solana program dump TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb "$OUT/token2022.so" --url "$RPC"
python3 - <<'PY'
import hashlib, json, os, time
root = os.environ["ROOT"]
path = os.path.join(root, "tests/fixtures/mainnet/token2022.so")
data = open(path, "rb").read()
manifest = {
    "program": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    "file": "token2022.so",
    "bytes": len(data),
    "sha256": hashlib.sha256(data).hexdigest(),
    "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "note": "Mainnet Token-2022 ELF. Slot/epoch filled by scripts/dump-fixtures.ts in phase 6.",
}
open(os.path.join(root, "tests/fixtures/mainnet/manifest.json"), "w").write(json.dumps(manifest, indent=2) + "\n")
print(manifest["sha256"], manifest["bytes"])
PY
