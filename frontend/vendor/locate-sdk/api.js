import { z } from "zod";
const meta = z.object({ fetchedAt: z.string(), slot: z.number().optional() });
const row = z.record(z.string(), z.unknown());
export function createLocateApi(baseUrl, onWaking) {
    const base = baseUrl.replace(/\/$/, "");
    async function get(path, schema, timeoutMs = 90_000) {
        onWaking?.();
        const response = await fetch(base + path, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
        if (!response.ok)
            throw new Error(response.status + " " + path);
        return schema.parse(await response.json());
    }
    async function postJson(path, body, schema, timeoutMs = 90_000) {
        onWaking?.();
        const response = await fetch(base + path, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok)
            throw new Error(response.status + " " + path);
        return schema.parse(await response.json());
    }
    return {
        health: () => get("/health", z.object({ ok: z.boolean() })),
        ready: () => get("/ready", z.object({ ok: z.boolean(), migration: z.string().optional(), slot: z.number().optional() })),
        config: () => get("/v1/config", z.object({ programId: z.string(), cluster: z.string(), allowlist: z.array(z.unknown()) }).passthrough()),
        markets: () => get("/v1/markets", z.object({ markets: z.array(z.object({ symbol: z.string(), mint: z.string() }).passthrough()) }).merge(meta.partial())),
        opportunities: () => get("/v1/opportunities", z.object({ opportunities: z.array(row) }).passthrough()),
        offers: () => get("/v1/offers", z.object({ offers: z.array(row), slot: z.number(), commitment: z.string() }).passthrough()),
        offer: (pubkey) => get("/v1/offers/" + pubkey, z.object({ offer: row }).passthrough()),
        offerEconomics: (pubkey) => get("/v1/offers/" + pubkey + "/economics", row),
        loans: (query) => get("/v1/loans?wallet=" + query.wallet + "&role=" + query.role, z.object({ loans: z.array(row) }).passthrough()),
        loan: (pubkey) => get("/v1/loans/" + pubkey, z.object({ loan: row }).passthrough()),
        receipts: (query) => {
            const params = new URLSearchParams();
            if (query?.wallet)
                params.set("wallet", query.wallet);
            if (query?.loan)
                params.set("loan", query.loan);
            if (query?.offer)
                params.set("offer", query.offer);
            if (query?.limit)
                params.set("limit", String(query.limit));
            const qs = params.toString();
            return get("/v1/receipts" + (qs ? "?" + qs : ""), z.object({ receipts: z.array(row) }).passthrough());
        },
        evidence: () => get("/v1/evidence", z.object({ receipts: z.array(row) }).passthrough()),
        activity: (wallet) => get("/v1/activity?wallet=" + wallet, z.object({ receipts: z.array(row), loans: z.array(row) }).passthrough()),
        theses: (wallet) => get("/v1/theses?wallet=" + wallet, z.object({ theses: z.array(row) }).passthrough()),
        postThesis: (body) => postJson("/v1/theses", body, z.object({ id: z.string().optional() }).passthrough()),
        async postReceipt(signature) {
            const response = await fetch(base + "/v1/receipts/" + signature, { method: "POST", signal: AbortSignal.timeout(90_000) });
            if (!response.ok && response.status !== 400)
                throw new Error(response.status + " receipt");
            return response.json();
        },
    };
}
