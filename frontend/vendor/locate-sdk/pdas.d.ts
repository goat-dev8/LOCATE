import { PublicKey } from "@solana/web3.js";
export declare function u64(n: bigint): Buffer;
export declare function i64(n: bigint): Buffer;
export declare function discriminator(name: string): Buffer;
export declare function ata(owner: PublicKey, mint: PublicKey, tokenProgram: PublicKey): PublicKey;
export declare function offerPda(lender: PublicKey, mint: PublicKey, nonce: bigint, programId?: PublicKey): PublicKey;
export declare function loanPda(offer: PublicKey, programId?: PublicKey): PublicKey;
export declare function eventAuthority(programId?: PublicKey): PublicKey;
export declare function vaultAta(loan: PublicKey, usdcMint: PublicKey, tokenProgram: PublicKey): PublicKey;
