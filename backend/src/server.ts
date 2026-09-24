import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { Connection } from "@solana/web3.js";
import { loadConfig, type AppConfig } from "./config.js";
import { createSql, type Sql } from "./db/sql.js";
import { registerRoutes } from "./routes/register.js";

export const EXPECTED_MIGRATION = "002";

export function loadLocalEnv() {
  if (process.env.DATABASE_URL && process.env.SOLANA_RPC_URL) return;
  const path = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env");
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
  if (!process.env.SOLANA_CLUSTER) process.env.SOLANA_CLUSTER = "devnet";
  if (!process.env.SOLANA_RPC_URL && process.env.SOLANA_RPC_URL_DEVNET) {
    process.env.SOLANA_RPC_URL = process.env.SOLANA_RPC_URL_DEVNET;
  }
  if (!process.env.CORS_ALLOWED_ORIGINS) process.env.CORS_ALLOWED_ORIGINS = "http://localhost:5173";
  if (!process.env.PORT) process.env.PORT = "10000";
}

export async function buildServer(options?: {
  config?: AppConfig;
  sql?: Sql;
}): Promise<FastifyInstance> {
  const config = options?.config ?? loadConfig();
  const sql = options?.sql ?? createSql(config.DATABASE_URL);
  const app = Fastify({ logger: { level: "info", redact: ["req.headers.authorization"] } });
  await app.register(cors, {
    origin: config.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()),
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

  app.get("/health", async () => ({
    ok: true,
    version: "0.1.0",
    gitSha: config.GIT_SHA,
  }));

  app.get("/ready", async (_request, reply) => {
    try {
      const rows = await sql<{ version: string }[]>`
        select version from locate.schema_migrations order by version
      `;
      const versions = rows.map((row) => row.version);
      if (!versions.includes(EXPECTED_MIGRATION)) {
        return reply.code(503).send({ ok: false, reason: "migration" });
      }
      const connection = new Connection(config.SOLANA_RPC_URL, "confirmed");
      const slot = await connection.getSlot("confirmed");
      return { ok: true, migration: EXPECTED_MIGRATION, slot };
    } catch {
      return reply.code(503).send({ ok: false, reason: "dependency" });
    }
  });

  app.addHook("onClose", async () => {
    await sql.end({ timeout: 5 });
  });
  await registerRoutes(app, config, sql);
  return app;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  loadLocalEnv();
  const app = await buildServer();
  const config = loadConfig();
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
}
