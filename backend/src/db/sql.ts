import postgres from "postgres";

export function createSql(databaseUrl: string) {
  return postgres(databaseUrl, {
    prepare: false,
    ssl: "require",
    max: 5,
    connect_timeout: 3,
  });
}

export type Sql = ReturnType<typeof createSql>;
