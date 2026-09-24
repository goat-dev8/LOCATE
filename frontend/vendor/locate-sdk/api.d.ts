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
        allowlist: string[];
    }>;
    markets: () => Promise<{
        fetchedAt?: string | undefined;
        slot?: number | undefined;
        markets: {
            [x: string]: unknown;
            symbol: string;
            mint: string;
            stale: boolean;
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
    postReceipt(signature: string): Promise<{
        status?: string;
    }>;
};
