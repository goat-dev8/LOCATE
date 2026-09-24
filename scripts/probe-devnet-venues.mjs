import { writeFileSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC = "https://api.devnet.solana.com";
const MINT = "9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P";
const programs = {
  phoenix: "PhoeNiXZ8ByJGLofaRfZLjFa2AGEC5tWj5Mn1o5Zeq8",
  whirlpool: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
  pumpAmm: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
  dlmm: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
};

const connection = new Connection(RPC, "confirmed");
const rows = {};
for (const [name, id] of Object.entries(programs)) {
  const info = await connection.getAccountInfo(new PublicKey(id), "confirmed");
  rows[name] = {
    program: id,
    present: Boolean(info),
    executable: Boolean(info?.executable),
    owner: info?.owner.toBase58() ?? null,
    lamports: info?.lamports ?? 0,
  };
}

const out = {
  network: "devnet",
  label: "DEVNET REPLICA / TEST ASSET — NOT A MAINNET PRESTOCK",
  mint: MINT,
  usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  mainnetTransaction: false,
  result: "FAIL",
  signedTransactions: [],
  programs: rows,
  jupiter: {
    status: 400,
    error: "The token 9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P is not tradable",
    errorCode: "TOKEN_NOT_TRADABLE",
    reused: true,
  },
  dlmm: {
    program: programs.dlmm,
    executableOnDevnet: rows.dlmm?.executable ?? false,
    error: "UnsupportedTokenMint",
    errorNumber: 6073,
    reused: true,
  },
  note: "Time-boxed extra venue check. Jupiter and DLMM failures are preserved, not retried. Phoenix/Whirlpool/Pump AMM were inspected for executable program accounts only. No pool was found or created and no swap was sent.",
  timestamp: new Date().toISOString(),
};
writeFileSync(new URL("../proof/devnet/dex.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
