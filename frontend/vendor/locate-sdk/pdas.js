import { sha256 } from "@noble/hashes/sha256";
import { PublicKey } from "@solana/web3.js";
import { ATA, LOCATE_PROGRAM_ID } from "./constants.js";
export function u64(n) {
    const out = Buffer.alloc(8);
    new DataView(out.buffer, out.byteOffset, 8).setBigUint64(0, n, true);
    return out;
}
export function i64(n) {
    const out = Buffer.alloc(8);
    new DataView(out.buffer, out.byteOffset, 8).setBigInt64(0, n, true);
    return out;
}
export function discriminator(name) {
    return Buffer.from(sha256(new TextEncoder().encode("global:" + name)).subarray(0, 8));
}
export function ata(owner, mint, tokenProgram) {
    return PublicKey.findProgramAddressSync([owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()], ATA)[0];
}
export function offerPda(lender, mint, nonce, programId = LOCATE_PROGRAM_ID) {
    return PublicKey.findProgramAddressSync([Buffer.from("offer"), lender.toBuffer(), mint.toBuffer(), u64(nonce)], programId)[0];
}
export function loanPda(offer, programId = LOCATE_PROGRAM_ID) {
    return PublicKey.findProgramAddressSync([Buffer.from("loan"), offer.toBuffer()], programId)[0];
}
export function eventAuthority(programId = LOCATE_PROGRAM_ID) {
    return PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], programId)[0];
}
export function vaultAta(loan, usdcMint, tokenProgram) {
    return ata(loan, usdcMint, tokenProgram);
}
