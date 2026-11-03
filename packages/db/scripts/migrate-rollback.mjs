#!/usr/bin/env node
// Rolls back the LATEST applied migration using its reviewed down.sql.
// Prisma has no down migrations and `migrate resolve --rolled-back` only
// accepts failed migrations, so this runs down.sql and removes the history
// row in ONE transaction: either both happen or neither does.
//
// Usage: pnpm --filter @evone/db migrate:rollback --confirm <migration_name>
// The name must match the latest applied migration, so a typo or a stale
// terminal cannot roll back the wrong thing. Production: see DATABASE.md
// "Migration rollback" — prefer forward fixes and take a backup first.
import { readFileSync } from "node:fs";
import {
  downScriptPath,
  hasDownScript,
  latestApplied,
  requireEnv,
  withClient,
} from "./lib.mjs";

const confirmIndex = process.argv.indexOf("--confirm");
const confirmed =
  confirmIndex > -1 ? process.argv[confirmIndex + 1] : undefined;
const url = requireEnv("DATABASE_URL");

await withClient(url, async (client) => {
  const latest = await latestApplied(client);
  if (!latest) {
    console.error("No applied migrations to roll back.");
    process.exit(1);
  }
  if (confirmed !== latest) {
    console.error(`Latest applied migration is ${latest}.`);
    console.error(`Re-run with --confirm ${latest} to roll it back.`);
    process.exit(1);
  }
  if (!hasDownScript(latest)) {
    console.error(`${latest} has no down.sql; write and review one first.`);
    process.exit(1);
  }
  const sql = readFileSync(downScriptPath(latest), "utf8");
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      "DELETE FROM _prisma_migrations WHERE migration_name = $1",
      [latest],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`Rollback of ${latest} failed and was reverted.`);
    throw error;
  }
  console.log(`Rolled back ${latest}.`);
});
