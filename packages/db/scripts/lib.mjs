import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

export const migrationsDir = new URL("../prisma/migrations/", import.meta.url)
  .pathname;

/** Migration folder names in apply order (Prisma's timestamp prefix sorts). */
export function migrationNames() {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function downScriptPath(name) {
  return join(migrationsDir, name, "down.sql");
}

export function hasDownScript(name) {
  return existsSync(downScriptPath(name));
}

export function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    console.error(`${key} is not set.`);
    process.exit(1);
  }
  return value;
}

export async function withClient(connectionString, fn) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Latest migration Prisma recorded as successfully applied, or null. */
export async function latestApplied(client) {
  const { rows } = await client.query(
    `SELECT migration_name FROM _prisma_migrations
     WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
     ORDER BY migration_name DESC LIMIT 1`,
  );
  return rows[0]?.migration_name ?? null;
}

/**
 * Structural fingerprint of the database from the system catalog:
 * extensions, relations (incl. views), columns, indexes, constraints,
 * non-extension functions, user triggers and enum types,
 * excluding Prisma's own history table. Independent of Prisma's diff, which
 * does not report every change (it ignores some extension drops).
 */
export async function schemaSnapshot(client) {
  const queries = {
    extensions: `SELECT extname FROM pg_extension WHERE extname <> 'plpgsql' ORDER BY 1`,
    relations: `SELECT n.nspname || '.' || c.relname || ':' || c.relkind::text
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND c.relname NOT LIKE '_prisma_migrations%' ORDER BY 1`,
    columns: `SELECT table_schema || '.' || table_name || '.' || column_name || ' ' ||
        data_type || ' ' || udt_name || ' ' || is_nullable || ' ' || coalesce(column_default, '')
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        AND table_name <> '_prisma_migrations' ORDER BY 1`,
    indexes: `SELECT indexdef FROM pg_indexes
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        AND tablename <> '_prisma_migrations' ORDER BY 1`,
    constraints: `SELECT conrelid::regclass::text || ' ' || conname || ' ' || pg_get_constraintdef(oid)
      FROM pg_constraint WHERE connamespace = 'public'::regnamespace
        AND conrelid::regclass::text <> '_prisma_migrations' ORDER BY 1`,
    functions: `SELECT p.oid::regprocedure::text FROM pg_proc p
      WHERE p.pronamespace = 'public'::regnamespace
        AND NOT EXISTS (SELECT 1 FROM pg_depend d
          WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
      ORDER BY 1`,
    triggers: `SELECT pg_get_triggerdef(t.oid) FROM pg_trigger t
      WHERE NOT t.tgisinternal
        AND t.tgrelid::regclass::text NOT LIKE '_prisma_migrations%' ORDER BY 1`,
    enums: `SELECT t.typname || ':' || string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
      FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid GROUP BY t.typname ORDER BY 1`,
  };
  const snapshot = {};
  for (const [key, sql] of Object.entries(queries)) {
    const { rows } = await client.query({ text: sql, rowMode: "array" });
    snapshot[key] = rows.map((row) => String(row[0]));
  }
  return snapshot;
}

export function snapshotDiff(expected, actual) {
  const lines = [];
  for (const key of Object.keys(expected)) {
    const want = new Set(expected[key]);
    const have = new Set(actual[key]);
    for (const item of want)
      if (!have.has(item)) lines.push(`missing ${key}: ${item}`);
    for (const item of have)
      if (!want.has(item)) lines.push(`unexpected ${key}: ${item}`);
  }
  return lines;
}
