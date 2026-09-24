import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnvFile() {
  const text = readFileSync(resolve(root, ".env"), "utf8");
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index);
    if (!process.env[key]) {
      process.env[key] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

function publicTables(sql: postgres.Sql) {
  return sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `;
}

async function appliedVersions(sql: postgres.Sql): Promise<string[]> {
  const exists = await sql<{ reg: string | null }[]>`
    select to_regclass('locate.schema_migrations')::text as reg
  `;
  if (!exists[0]?.reg) return [];
  const rows = await sql<{ version: string }[]>`
    select version from locate.schema_migrations order by version
  `;
  return rows.map((row) => row.version);
}

async function main() {
  loadEnvFile();
  const direct = process.env.DIRECT_URL;
  if (!direct) throw new Error("DIRECT_URL is required for migrations");
  const pooled = process.env.DATABASE_URL;
  if (!pooled) throw new Error("DATABASE_URL is required");

  const admin = postgres(direct, { prepare: false, ssl: "require", max: 1 });
  const before = (await publicTables(admin)).map((row) => row.table_name);
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../migrations");
  const files = readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
  const applied = new Set(await appliedVersions(admin));
  const ran: string[] = [];
  for (const file of files) {
    const version = file.slice(0, 3);
    if (applied.has(version)) continue;
    const body = readFileSync(resolve(dir, file), "utf8");
    await admin.begin(async (tx) => {
      await tx.unsafe(body);
    });
    ran.push(version);
  }
  const after = (await publicTables(admin)).map((row) => row.table_name);
  const versions = await appliedVersions(admin);
  const locate = await admin<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'locate' and table_type = 'BASE TABLE'
    order by table_name
  `;
  await admin.end({ timeout: 5 });

  const pool = postgres(pooled, { prepare: false, ssl: "require", max: 1 });
  const pooledVersions = await pool<{ version: string }[]>`
    select version from locate.schema_migrations order by version
  `;
  await pool.end({ timeout: 5 });

  const samePublic = before.join() === after.join();
  const report = {
    ran,
    versions,
    pooledVersions: pooledVersions.map((row) => row.version),
    locateTables: locate.map((row) => row.table_name),
    publicUnchanged: samePublic,
    publicTableCount: after.length,
    fetchedAt: new Date().toISOString(),
  };
  const outDir = resolve(root, "evidence/backend");
  mkdirSync(outDir, { recursive: true });
  const out = resolve(outDir, "migration-" + report.fetchedAt.replace(/[:.]/g, "") + ".json");
  writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ ran, versions: report.versions, publicUnchanged: samePublic, locateTables: report.locateTables }));
  if (!samePublic) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "migration failed");
  process.exit(1);
});
