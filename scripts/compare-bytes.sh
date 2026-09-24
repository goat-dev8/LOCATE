#!/bin/bash
set -euo pipefail
LOCAL="$HOME/locate-target/deploy/locate.so"
DUMP="$HOME/locate-target/deploy/locate-onchain.so"
ls -l "$LOCAL" "$DUMP"
python3 - <<'PY'
from pathlib import Path
import hashlib, os
home = Path.home()
local = (home/"locate-target/deploy/locate.so").read_bytes()
dump = (home/"locate-target/deploy/locate-onchain.so").read_bytes()
print("local", len(local))
print("dump", len(dump))
print("prefix_match", dump[:len(local)] == local)
print("prefix_sha", hashlib.sha256(dump[:len(local)]).hexdigest())
print("tail_nonzero", any(dump[len(local):]))
PY
