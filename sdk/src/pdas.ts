import { sha256 } from "@noble/hashes/sha256";
import { PublicKey } from "@solana/web3.js";
import { ATA, LOCATE_PROGRAM_ID } from "./constants.js";

export function u64(n: bigint): Buffer {
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(n);
  return out;
}

export function i64(n: bigint): Buffer {
  const out = Buffer.alloc(8);
  out.writeBigInt64LE(n);
  return out;
}

export function discriminator(name: string): Buffer {
  return Buffer.from(sha256(new TextEncoder().encode("global:" + name)).subarray(0, 8));
}

export function ata(owner: PublicKey, mint: PublicKey, tokenProgram: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()], ATA)[0];
}

export function offerPda(lender: PublicKey, mint: PublicKey, nonce: bigint, programId = LOCATE_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("offer"), lender.toBuffer(), mint.toBuffer(), u64(nonce)],
    programId,
  )[0];
}

export function loanPda(offer: PublicKey, programId = LOCATE_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("loan"), offer.toBuffer()], programId)[0];
}

export function eventAuthority(programId = LOCATE_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], programId)[0];
}

export function vaultAta(loan: PublicKey, usdcMint: PublicKey, tokenProgram: PublicKey): PublicKey {
  return ata(loan, usdcMint, tokenProgram);
}
