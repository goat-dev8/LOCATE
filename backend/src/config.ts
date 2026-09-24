import { z } from "zod";

const pubkey = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SOLANA_CLUSTER: z.enum(["devnet", "mainnet-beta", "localnet"]),
  SOLANA_RPC_URL: z.string().url(),
  LOCATE_PROGRAM_ID: pubkey,
  JUPITER_API_BASE: z.string().url(),
  PRESTOCKS_API_BASE: z.string().url(),
  CORS_ALLOWED_ORIGINS: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(10000),
  GIT_SHA: z.string().min(1).default("dev"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".") || "env").join(", ");
    throw new Error("invalid configuration: " + fields);
  }
  return parsed.data;
}
