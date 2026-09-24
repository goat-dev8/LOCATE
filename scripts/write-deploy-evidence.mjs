import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { Connection } from "@solana/web3.js";

const env = readFileSync("d:/route/sol/LOCATE/.env", "utf8");
const rpc = env.split(/\n/).find((l) => l.startsWith("SOLANA_RPC_URL_DEVNET=")).split("=").slice(1).join("=").trim();
const connection = new Connection(rpc, "confirmed");
const signature = "4qwgdv1cdjnXVkgJNpE3QH8SwtHopdocvwp4dvSa42bXjNhpH9jnPusabjNEcsU3yqnf6WvkHZJi8L2d8hKkwgtP";
const tx = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
const { PublicKey } = await import("@solana/web3.js");
const info = await connection.getAccountInfo(new PublicKey("F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6"));
const programData = new PublicKey("DSbRjFotfkpDqdKNPQ9dFshpTi5cg57bXL72VRxM7Vhh");
const dataInfo = await connection.getAccountInfo(programData);
const doc = {
  cluster: "devnet",
  programId: "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6",
  signature,
  slot: tx?.slot ?? null,
  blockTime: tx?.blockTime ?? null,
  err: tx?.meta?.err ?? null,
  executable: info?.executable ?? null,
  owner: info?.owner?.toBase58() ?? null,
  programAccountLength: info?.data?.length ?? null,
  programData: programData.toBase58(),
  programDataLength: dataInfo?.data?.length ?? null,
  fetchedAt: new Date().toISOString(),
};
mkdirSync("d:/route/sol/LOCATE/evidence/devnet", { recursive: true });
writeFileSync("d:/route/sol/LOCATE/evidence/devnet/deploy.json", JSON.stringify(doc, null, 2) + "\n");
console.log(doc.slot, doc.err, doc.executable, doc.programDataLength);
