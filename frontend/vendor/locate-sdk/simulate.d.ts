import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
export declare function decodeProgramError(err: unknown): {
    code: number | null;
    name: string | null;
};
export declare function simulateAndDecode(connection: Connection, payer: PublicKey, instructions: TransactionInstruction[]): Promise<{
    code: number | null;
    name: string | null;
    err: import("@solana/web3.js").TransactionError | null;
    logs: string[] | null;
    simulation: true;
}>;
