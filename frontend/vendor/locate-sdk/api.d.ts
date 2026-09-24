export declare function createLocateApi(baseUrl: string, onWaking?: () => void): {
    health: () => Promise<{
        ok: boolean;
    }>;
    ready: () => Promise<{
        ok: boolean;
        migration?: string | undefined;
        slot?: number | undefined;
    }>;
    config: () => Promise<{
        [x: string]: unknown;
        programId: string;
        cluster: string;
        allowlist: unknown[];
    }>;
    markets: () => Promise<{
        fetchedAt?: string | undefined;
        slot?: number | undefined;
        markets: {
            [x: string]: unknown;
            symbol: string;
            mint: string;
        }[];
    }>;
    opportunities: () => Promise<{
        [x: string]: unknown;
        opportunities: Record<string, unknown>[];
    }>;
    offers: () => Promise<{
        [x: string]: unknown;
        offers: Record<string, unknown>[];
        slot: number;
        commitment: string;
    }>;
    offer: (pubkey: string) => Promise<{
        [x: string]: unknown;
        offer: Record<string, unknown>;
    }>;
    offerEconomics: (pubkey: string) => Promise<Record<string, unknown>>;
    loans: (query: {
        wallet: string;
        role: "lender" | "borrower";
    }) => Promise<{
        [x: string]: unknown;
        loans: Record<string, unknown>[];
    }>;
    loan: (pubkey: string) => Promise<{
        [x: string]: unknown;
        loan: Record<string, unknown>;
    }>;
    receipts: (query?: {
        wallet?: string;
        loan?: string;
        offer?: string;
        limit?: number;
    }) => Promise<{
        [x: string]: unknown;
        receipts: Record<string, unknown>[];
    }>;
    evidence: () => Promise<{
        [x: string]: unknown;
        receipts: Record<string, unknown>[];
    }>;
    activity: (wallet: string) => Promise<{
        [x: string]: unknown;
        receipts: Record<string, unknown>[];
        loans: Record<string, unknown>[];
    }>;
    theses: (wallet: string) => Promise<{
        [x: string]: unknown;
        theses: Record<string, unknown>[];
    }>;
    postThesis: (body: {
        wallet: string;
        mint: string;
        offer?: string;
        kind: "premium_compression" | "relative_valuation" | "mean_reversion" | "event_driven" | "other";
        note: string;
        currentPremiumBps?: number;
        targetPremiumBps?: number;
        acknowledgedNonBinding: true;
    }) => Promise<{
        [x: string]: unknown;
        id?: string | undefined;
    }>;
    postReceipt(signature: string): Promise<{
        status?: string;
    }>;
};
