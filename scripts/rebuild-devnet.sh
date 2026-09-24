#!/bin/bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/d/route/sol/LOCATE
export CARGO_TARGET_DIR="$HOME/locate-target"
cargo-build-sbf --manifest-path programs/locate/Cargo.toml --features devnet
sha256sum "$HOME/locate-target/deploy/locate.so"
