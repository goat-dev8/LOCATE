#!/bin/bash
# Creates the devnet synthetic mint. It mirrors OPENAI's Token-2022 extensions.
# It is a devnet test mint mirroring OPENAI's extensions; not a PreStocks token.
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"
DIR="$HOME/.config/solana/locate"
RPC=$(python3 - <<'PY'
from pathlib import Path
for line in Path("/mnt/d/route/sol/LOCATE/.env").read_text().splitlines():
    if line.startswith("SOLANA_RPC_URL_DEVNET="):
        print(line.split("=",1)[1].strip().strip('"').strip("'"))
        break
PY
)
FEE="$DIR/deployer.json"
ISSUER="$DIR/devnet-issuer.json"
LENDER="$DIR/devnet-lender.json"
BORROWER="$DIR/devnet-borrower.json"
MINT_KP="$DIR/dopenai-mint.json"

for dest in "$LENDER" "$BORROWER" "$ISSUER"; do
  solana transfer --url "$RPC" --keypair "$FEE" --allow-unfunded-recipient --fee-payer "$FEE" "$(solana-keygen pubkey "$dest")" 0.3
done

if [ ! -f "$MINT_KP" ]; then
  solana-keygen new --no-bip39-passphrase --force --silent --outfile "$MINT_KP" >/dev/null
  chmod 600 "$MINT_KP"
fi

spl-token --url "$RPC" --program-2022 --fee-payer "$FEE" create-token \
  --mint-authority "$(solana-keygen pubkey "$ISSUER")" \
  --decimals 9 \
  --transfer-fee-basis-points 100 \
  --transfer-fee-maximum-fee 18446744073709551615 \
  --enable-permanent-delegate \
  --enable-pause \
  --ui-amount-multiplier 1.4861347 \
  --enable-transfer-hook \
  --default-account-state initialized \
  --enable-freeze \
  --enable-metadata \
  "$MINT_KP"

echo "MINT $(solana-keygen pubkey "$MINT_KP")"
echo "ISSUER $(solana-keygen pubkey "$ISSUER")"
echo "LENDER $(solana-keygen pubkey "$LENDER")"
echo "BORROWER $(solana-keygen pubkey "$BORROWER")"
