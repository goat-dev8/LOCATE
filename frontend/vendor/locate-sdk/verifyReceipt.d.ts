export type BrowserVerifyResult = {
    ok: true;
    status: "verified" | "pending";
    slot: number;
    commitment: "finalized" | "confirmed";
} | {
    ok: false;
    status: "rejected";
    reason: string;
};
export declare function verifyReceiptInBrowser(signature: string, rpc: string, programId: string): Promise<BrowserVerifyResult>;
