#!/bin/bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/d/route/sol/LOCATE
RPC="$(python3 -c "import pathlib; t=pathlib.Path('.env').read_text();
print(next(l.split('=',1)[1].strip() for l in t.splitlines() if l.startswith('SOLANA_RPC_URL_DEVNET=')))")"
LOCAL="$HOME/locate-target/deploy/locate.so"
DUMP="$HOME/locate-target/deploy/locate-onchain.so"
solana program dump F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6 "$DUMP" --url "$RPC"
echo "LOCAL $(sha256sum "$LOCAL")"
echo "CHAIN $(sha256sum "$DUMP")"
solana program show F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6 --url "$RPC"
