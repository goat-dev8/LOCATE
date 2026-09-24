import { Connection, PublicKey } from "@solana/web3.js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import type { Sql } from "../db/sql.js";
import { loadLoan, loadLoans, loadOffer, loadOffers } from "../chain/accounts.js";
import { fundOffers } from "../chain/funding.js";
import { readMint } from "../chain/mint.js";
import { eventAuthority } from "../chain/codec.js";
import { verifySignature } from "../chain/verify.js";
import { upsertReceipt } from "../db/receipts.js";
import { catchUp } from "../ingest/catchup.js";
import { jupiterPrice } from "../market/jupiter.js";
import { loadCatalog } from "../market/prestocks.js";
import { buildOpportunities } from "../market/opportunities.js";
import { protocolEconomics, premiumBps } from "../market/economics.js";
import { DEMO_SIGNATURES } from "../demo.js";

const pubkey = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
const signature = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/);

function usdcFor(cluster: AppConfig["SOLANA_CLUSTER"]): PublicKey {
  return new PublicKey(cluster === "devnet" ? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
}

function bad(reply: { code: (n: number) => { send: (b: unknown) => unknown } }, code: string, message: string, status = 400) {
  return reply.code(status).send({ error: { code, message } });
}

export async function registerRoutes(app: FastifyInstance, config: AppConfig, sql: Sql) {
  const connection = new Connection(config.SOLANA_RPC_URL, "confirmed");
  const programId = new PublicKey(config.LOCATE_PROGRAM_ID);
  const usdc = usdcFor(config.SOLANA_CLUSTER);

  app.get("/v1/config", async () => {
    const catalog = await loadCatalog(config.PRESTOCKS_API_BASE);
    return {
      cluster: config.SOLANA_CLUSTER,
      programId: programId.toBase58(),
      usdcMint: usdc.toBase58(),
      eventAuthority: eventAuthority().toBase58(),
      allowlist: catalog.rows.map((row) => ({ symbol: row.symbol, mint: row.mint, decimals: row.decimals })),
      allowlistFetchedAt: catalog.fetchedAt,
      gitSha: config.GIT_SHA,
    };
  });

  app.get("/v1/markets", async () => {
    const catalog = await loadCatalog(config.PRESTOCKS_API_BASE);
    const stale = catalog.ageMs > 120_000;
    const markets = [];
    for (const row of catalog.rows) {
      const dex = await jupiterPrice(config.JUPITER_API_BASE, row.mint);
      const premium = stale ? null : premiumBps(row.tokenMicro, row.markMicro);
      markets.push({
        symbol: row.symbol,
        mint: row.mint,
        tokenPrice: stale || row.tokenMicro === null ? null : row.tokenMicro.toString(),
        markPrice: stale || row.markMicro === null ? null : row.markMicro.toString(),
        premiumBps: premium === null ? null : premium.toString(),
        dexUsd: dex.usd,
        stale: stale || dex.stale || row.markMicro === null || row.markMicro === 0n,
        fetchedAt: catalog.fetchedAt,
      });
    }
    return { markets, fetchedAt: new Date().toISOString(), slot: await connection.getSlot("confirmed") };
  });

  app.get("/v1/offers", async (request, reply) => {
    const query = z.object({ mint: pubkey.optional(), lender: pubkey.optional() }).safeParse(request.query);
    if (!query.success) return bad(reply, "BAD_QUERY", "invalid query");
    const offers = await loadOffers(connection, programId, query.data);
    const funding = await fundOffers(connection, offers);
    return {
      offers: offers.map((offer) => ({ ...offer, funded: funding.get(offer.pubkey)?.funded ?? false, fundedReason: funding.get(offer.pubkey)?.fundedReason ?? "missing" })),
      slot: await connection.getSlot("confirmed"),
      fetchedAt: new Date().toISOString(),
      commitment: "confirmed",
    };
  });

  app.get("/v1/offers/:pubkey", async (request, reply) => {
    const params = z.object({ pubkey }).safeParse(request.params);
    if (!params.success) return bad(reply, "BAD_PUBKEY", "invalid pubkey");
    const offer = await loadOffer(connection, new PublicKey(params.data.pubkey));
    if (!offer) return bad(reply, "OFFER_NOT_FOUND", "offer not found", 404);
    const funding = await fundOffers(connection, [offer]);
    return { offer: { ...offer, ...funding.get(offer.pubkey) }, slot: await connection.getSlot("confirmed"), fetchedAt: new Date().toISOString(), commitment: "confirmed" };
  });

  app.get("/v1/offers/:pubkey/economics", async (request, reply) => {
    const params = z.object({ pubkey }).safeParse(request.params);
    if (!params.success) return bad(reply, "BAD_PUBKEY", "invalid pubkey");
    const offer = await loadOffer(connection, new PublicKey(params.data.pubkey));
    if (!offer) return bad(reply, "OFFER_NOT_FOUND", "offer not found", 404);
    const mint = await readMint(connection, new PublicKey(offer.mint));
    const facts = protocolEconomics({
      amountRaw: BigInt(offer.amountRaw),
      feeBps: mint.feeBps,
      maxFee: BigInt(mint.maxFee),
      collateralUsdc: BigInt(offer.collateralUsdc),
      feeUsdc: BigInt(offer.feeUsdc),
      feePending: mint.feePending,
    });
    if ("unavailable" in facts) return { ...facts, advisory: true, settlementIndependent: true, fetchedAt: new Date().toISOString() };
    return {
      receivedRaw: facts.receivedRaw.toString(),
      returnGrossRaw: facts.returnGrossRaw.toString(),
      extraRaw: facts.extraRaw.toString(),
      feeRaw: facts.feeRaw.toString(),
      collateralUsdc: facts.collateralUsdc.toString(),
      maxLossUsdc: facts.maxLossUsdc.toString(),
      feeBps: mint.feeBps,
      advisory: true,
      settlementIndependent: true,
      fetchedAt: new Date().toISOString(),
    };
  });

  app.get("/v1/opportunities", async () => {
    const catalog = await loadCatalog(config.PRESTOCKS_API_BASE);
    const offers = await loadOffers(connection, programId);
    const funding = await fundOffers(connection, offers);
    const rows = buildOpportunities(
      catalog.rows,
      offers.map((offer) => ({
        pubkey: offer.pubkey,
        mint: offer.mint,
        amountRaw: BigInt(offer.amountRaw),
        collateralUsdc: BigInt(offer.collateralUsdc),
        feeUsdc: BigInt(offer.feeUsdc),
        termSecs: BigInt(offer.termSecs),
        funded: funding.get(offer.pubkey)?.funded ?? false,
      })),
      catalog.ageMs,
    );
    return {
      opportunities: rows.map((row) => ({
        symbol: row.symbol,
        mint: row.mint,
        state: row.state,
        tokenPrice: row.state === "STALE_DATA" || row.state === "UNAVAILABLE" ? null : catalog.rows.find((item) => item.mint === row.mint)?.tokenMicro?.toString() ?? null,
        markPrice: row.state === "STALE_DATA" || row.state === "UNAVAILABLE" ? null : catalog.rows.find((item) => item.mint === row.mint)?.markMicro?.toString() ?? null,
        premiumBps: row.premiumBps === null ? null : row.premiumBps.toString(),
        fundedRaw: row.fundedRaw.toString(),
        bestOffer: row.bestOffer ? { pubkey: row.bestOffer.pubkey, collateralUsdc: row.bestOffer.collateralUsdc.toString(), feeUsdc: row.bestOffer.feeUsdc.toString(), termSecs: row.bestOffer.termSecs.toString(), amountRaw: row.bestOffer.amountRaw.toString() } : null,
        contextOnly: true,
      })),
      fetchedAt: catalog.fetchedAt,
      slot: await connection.getSlot("confirmed"),
      commitment: "confirmed",
    };
  });

  app.get("/v1/loans", async (request, reply) => {
    const query = z.object({ wallet: pubkey, role: z.enum(["lender", "borrower"]) }).safeParse(request.query);
    if (!query.success) return bad(reply, "BAD_QUERY", "invalid query");
    const now = Math.floor(Date.now() / 1000);
    const loans = (await loadLoans(connection, programId)).filter((loan) => loan[query.data.role] === query.data.wallet);
    const mints = new Map<string, Awaited<ReturnType<typeof readMint>>>();
    for (const loan of loans) {
      if (!mints.has(loan.mint)) mints.set(loan.mint, await readMint(connection, new PublicKey(loan.mint)));
    }
    return {
      loans: loans.map((loan) => {
        const mint = mints.get(loan.mint);
        const deferred = Boolean(mint?.paused || mint?.hookSet);
        return {
          ...loan,
          claimableNow: now >= Number(loan.claimAfterTs) && !deferred,
          deferred,
        };
      }),
      slot: await connection.getSlot("confirmed"),
      fetchedAt: new Date().toISOString(),
      commitment: "confirmed",
    };
  });

  app.get("/v1/loans/:pubkey", async (request, reply) => {
    const params = z.object({ pubkey }).safeParse(request.params);
    if (!params.success) return bad(reply, "BAD_PUBKEY", "invalid pubkey");
    const loan = await loadLoan(connection, new PublicKey(params.data.pubkey));
    if (!loan) {
      const settled = await sql<{ signature: string }[]>`select signature from locate.receipts where loan = ${params.data.pubkey} limit 1`;
      return reply.code(404).send({ error: { code: "LOAN_NOT_FOUND", message: "loan not found" }, settledBy: settled[0]?.signature ?? null });
    }
    return { loan, slot: await connection.getSlot("confirmed"), fetchedAt: new Date().toISOString(), commitment: "confirmed" };
  });

  app.post("/v1/receipts/:signature", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
    const params = z.object({ signature }).safeParse(request.params);
    if (!params.success) return bad(reply, "BAD_SIGNATURE", "invalid signature");
    const verified = await verifySignature(connection, programId, params.data.signature, usdc);
    if (verified.status === "rejected") return { status: "rejected", reason: verified.reason, receipts: [] };
    for (const event of verified.events) {
      await upsertReceipt(sql, {
        signature: params.data.signature,
        event,
        cluster: config.SOLANA_CLUSTER,
        programId: programId.toBase58(),
        slot: verified.slot,
        blockTime: verified.blockTime,
        commitment: verified.commitment,
        source: "client_submit",
        label: DEMO_SIGNATURES.has(params.data.signature) ? "self_originated_demo" : null,
      });
    }
    return { status: verified.status, receipts: verified.events };
  });

  app.get("/v1/receipts/:signature", async (request, reply) => {
    const params = z.object({ signature }).safeParse(request.params);
    if (!params.success) return bad(reply, "BAD_SIGNATURE", "invalid signature");
    const rows = await sql`select signature, event_index, kind, slot, commitment, raw_event from locate.receipts where signature = ${params.data.signature} order by event_index`;
    if (rows.length === 0) return bad(reply, "NOT_FOUND", "receipt not found", 404);
    return { receipts: rows, fetchedAt: new Date().toISOString() };
  });

  app.get("/v1/receipts", async (request, reply) => {
    const query = z.object({ wallet: pubkey.optional(), loan: pubkey.optional(), offer: pubkey.optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).safeParse(request.query);
    if (!query.success) return bad(reply, "BAD_QUERY", "invalid query");
    await catchUp(sql, connection, programId, config.SOLANA_CLUSTER, usdc);
    const rows = await sql`
      select signature, event_index, kind, slot, commitment, lender, borrower, loan, offer, mint, raw_event
      from locate.receipts
      where (${query.data.wallet ?? null}::text is null or lender = ${query.data.wallet ?? null} or borrower = ${query.data.wallet ?? null})
        and (${query.data.loan ?? null}::text is null or loan = ${query.data.loan ?? null})
        and (${query.data.offer ?? null}::text is null or offer = ${query.data.offer ?? null})
      order by slot desc
      limit ${query.data.limit}
    `;
    return { receipts: rows, fetchedAt: new Date().toISOString(), commitment: "confirmed" };
  });

  app.get("/v1/activity", async (request, reply) => {
    const query = z.object({ wallet: pubkey }).safeParse(request.query);
    if (!query.success) return bad(reply, "BAD_QUERY", "wallet is required");
    await catchUp(sql, connection, programId, config.SOLANA_CLUSTER, usdc);
    const receipts = await sql`select signature, kind, slot, raw_event from locate.receipts where lender = ${query.data.wallet} or borrower = ${query.data.wallet} order by slot desc limit 50`;
    const loans = (await loadLoans(connection, programId)).filter((loan) => loan.lender === query.data.wallet || loan.borrower === query.data.wallet);
    return { receipts, loans, fetchedAt: new Date().toISOString(), slot: await connection.getSlot("confirmed") };
  });

  app.get("/v1/evidence", async () => {
    await catchUp(sql, connection, programId, config.SOLANA_CLUSTER, usdc);
    const rows = await sql`select signature, kind, loan, slot, commitment, raw_event from locate.receipts where label = 'self_originated_demo' order by slot`;
    return {
      cluster: config.SOLANA_CLUSTER,
      label: "devnet test mint mirroring OPENAI's extensions; not a PreStocks token",
      receipts: rows,
      fetchedAt: new Date().toISOString(),
    };
  });

  app.post("/v1/theses", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
    const body = z.object({
      wallet: pubkey,
      mint: pubkey,
      offer: pubkey.optional(),
      kind: z.enum(["premium_compression", "relative_valuation", "mean_reversion", "event_driven", "other"]),
      note: z.string().min(1).max(140),
      currentPremiumBps: z.number().int().optional(),
      targetPremiumBps: z.number().int().optional(),
      acknowledgedNonBinding: z.literal(true),
    }).safeParse(request.body);
    if (!body.success) return bad(reply, "BAD_BODY", "invalid thesis");
    const rows = await sql<{ id: string }[]>`
      insert into locate.theses (cluster, wallet, mint, offer, kind, note, current_premium_bps, target_premium_bps, acknowledged_non_binding)
      values (${config.SOLANA_CLUSTER}, ${body.data.wallet}, ${body.data.mint}, ${body.data.offer ?? null}, ${body.data.kind}::locate.thesis_kind, ${body.data.note}, ${body.data.currentPremiumBps ?? null}, ${body.data.targetPremiumBps ?? null}, true)
      returning id
    `;
    return { id: rows[0]?.id };
  });

  app.get("/v1/theses", async (request, reply) => {
    const query = z.object({ wallet: pubkey }).safeParse(request.query);
    if (!query.success) return bad(reply, "BAD_QUERY", "wallet is required");
    const rows = await sql`select id, mint, offer, kind, note, current_premium_bps, target_premium_bps, created_at from locate.theses where wallet = ${query.data.wallet} and cluster = ${config.SOLANA_CLUSTER} order by created_at desc`;
    return { theses: rows, fetchedAt: new Date().toISOString() };
  });
}
