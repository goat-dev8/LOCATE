import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const frontend = "FRONTEND";
const dist = "FRONTEND/dist";
mkdirSync("evidence/qa", { recursive: true });

if (!existsSync(frontend)) {
  const record = {
    status: "blocked",
    reason: "FRONTEND has not been delivered. No Chrome E2E was run and no pass was recorded.",
    fetchedAt: new Date().toISOString(),
  };
  writeFileSync("evidence/qa/frontend-absent.json", JSON.stringify(record, null, 2));
  console.log("blocked: FRONTEND is absent");
  process.exit(2);
}

const check = spawnSync(process.execPath, ["sdk/tools/check-frontend.mjs", frontend], { stdio: "inherit" });
if (check.status !== 0) process.exit(check.status ?? 1);
if (!existsSync(dist)) {
  console.log("blocked: FRONTEND/dist is absent. Build the delivered app before E2E.");
  process.exit(2);
}
console.log("checker passed; browser E2E still has to be run against this build");
