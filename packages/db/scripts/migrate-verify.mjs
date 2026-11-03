#!/usr/bin/env node
// EV-013 acceptance check, run in CI against an EMPTY database:
//  1. every migration ships a down.sql;
//  2. `migrate deploy` applies cleanly, and a second deploy is a no-op;
//  3. the database matches schema.prisma (no drift);
//  4. rolling back the latest migration leaves exactly the catalog state
//     produced by the earlier migrations alone (built in a temporary
//     database, so the role needs CREATEDB);
//  5. re-deploying after the rollback restores the full schema.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  hasDownScript,
  latestApplied,
  migrationNames,
  migrationsDir,
  requireEnv,
  schemaSnapshot,
  snapshotDiff,
  withClient,
} from "./lib.mjs";

const url = requireEnv("DATABASE_URL");
requireEnv("SHADOW_DATABASE_URL");

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};
const prisma = (...args) => {
  const result = spawnSync("prisma", args, {
    encoding: "utf8",
    env: process.env,
  });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
};
const noDrift = (...target) =>
  prisma(
    "migrate",
    "diff",
    "--from-config-datasource",
    ...target,
    "--exit-code",
  ).status === 0;

const names = migrationNames();
check(names.length > 0, `found ${names.length} migration(s)`);
const missing = names.filter((name) => !hasDownScript(name));
check(
  missing.length === 0,
  `every migration has down.sql${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`,
);

await withClient(url, async (client) => {
  const { rows } = await client.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'",
  );
  check(rows[0].n === 0, "target database starts empty");
});

check(
  prisma("migrate", "deploy").status === 0,
  "first migrate deploy succeeds",
);
const second = prisma("migrate", "deploy");
check(
  second.status === 0 && second.out.includes("No pending migrations"),
  "second migrate deploy is a no-op",
);
check(
  noDrift("--to-schema", "prisma/schema.prisma"),
  "database matches schema.prisma",
);
const fullSnapshot = await withClient(url, schemaSnapshot);

const latest = await withClient(url, latestApplied);
check(latest === names.at(-1), `latest applied is ${names.at(-1)}`);
const rollback = spawnSync(
  process.execPath,
  [
    new URL("./migrate-rollback.mjs", import.meta.url).pathname,
    "--confirm",
    latest,
  ],
  { encoding: "utf8", env: process.env },
);
check(rollback.status === 0, `rollback of ${latest} succeeds`);

// Expected post-rollback state: the earlier migrations' SQL applied to a
// throwaway database, compared through the system catalog.
const afterRollback = await withClient(url, schemaSnapshot);
const tempName = `evone_verify_${randomBytes(4).toString("hex")}`;
const tempUrl = new URL(url);
tempUrl.pathname = `/${tempName}`;
await withClient(url, (client) =>
  client.query(`CREATE DATABASE ${tempName} TEMPLATE template0`),
);
try {
  const expected = await withClient(tempUrl.toString(), async (client) => {
    for (const name of names.slice(0, -1)) {
      await client.query(
        readFileSync(join(migrationsDir, name, "migration.sql"), "utf8"),
      );
    }
    return schemaSnapshot(client);
  });
  const differences = snapshotDiff(expected, afterRollback);
  for (const line of differences) console.log(`      ${line}`);
  check(
    differences.length === 0,
    "post-rollback catalog equals the earlier migrations",
  );
} finally {
  await withClient(url, (client) =>
    client.query(`DROP DATABASE IF EXISTS ${tempName}`),
  );
}

check(
  prisma("migrate", "deploy").status === 0,
  "re-deploy after rollback succeeds",
);
check(
  noDrift("--to-schema", "prisma/schema.prisma"),
  "database matches schema.prisma again",
);
const finalSnapshot = await withClient(url, schemaSnapshot);
check(
  snapshotDiff(fullSnapshot, finalSnapshot).length === 0,
  "re-deployed catalog equals the original deploy",
);

if (failures > 0) {
  console.error(`${failures} migration check(s) failed.`);
  process.exit(1);
}
console.log("Migrations are repeatable and reversible.");
