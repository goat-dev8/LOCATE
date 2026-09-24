import postgres from "postgres";

function sslMode(databaseUrl: string): "require" | false {
  return /localhost|127\.0\.0\.1/.test(databaseUrl) ? false : "require";
}

export function createSql(databaseUrl: string) {
  return postgres(databaseUrl, {
    prepare: false,
    ssl: sslMode(databaseUrl),
    max: 5,
    connect_timeout: 3,
  });
}

export type Sql = ReturnType<typeof createSql>;
