# ADR-012 spike — Prisma with PostGIS

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Outcome: ADR-012 **proposed**, awaiting owner acceptance. No application code changed.

## Question

Which Prisma version can EVONE pin for PostgreSQL + PostGIS (`DATABASE.md`: SRID 4326 points, GiST index for permitted cached charger data), and does its migration and query workflow hold up?

## Environment

- PostgreSQL 17.5 with PostGIS 3.5.2 (`postgis/postgis:17-3.5`, local Docker). Databases created from `template0` unless stated.
- Node 24.18.0. Packages: `prisma` 7.10.1, `@prisma/client` 7.10.1 and `@prisma/adapter-pg` 7.10.1 (current stable, released 2026-10-15; 8.0.0-rc.30 exists and was not tested), `pg` 8.23.1, TypeScript 6.0.3.
- Run in a throwaway directory outside the repository. Prisma's documentation site was unreachable from this session (network policy), so every result below comes from running the installed packages, not from documentation.

## Results

| # | Check | Result |
|---|---|---|
| 1 | Native `Geometry(Point, 4326)` / `Geography(...)` field type | **Not supported.** Schema validation error P1012 |
| 2 | `@db.Geometry(...)` / `@db.Geography(...)` native type attribute | **Not supported.** "Native type Geometry is not supported for postgresql connector" |
| 3 | `extensions = [postgis]` in the datasource | Requires `previewFeatures = ["postgresqlExtensions"]` (still preview in 7.10.1) |
| 4 | `Unsupported("geography(Point, 4326)")?` + `@@index([geom], type: Gist)` | Valid. The migration emits `CREATE EXTENSION IF NOT EXISTS "postgis"`, a `geography(Point, 4326)` column and a `USING GIST` index |
| 5 | Drift loop: re-run `migrate dev` after init | No changes; `--create-only` produced only an empty migration |
| 6 | `migrate diff` migrations→schema and live DB→schema (`--exit-code`) | Exit 0, "No difference detected" for both |
| 7 | `migrate deploy` on two fresh databases, run twice each | Applied once, then "No pending migrations"; drift check exit 0 |
| 8 | Client `create`/`findMany` with optional geography column | Works; `geom` is omitted from client types and results |
| 9 | Write/read coordinates via parameterised `$executeRaw`/`$queryRaw` | Exact round trip (75.124, 15.364) |
| 10 | `ST_DWithin` radius query with `ST_Distance` ordering | Correct, distance-ordered results (782 m, 8 722 m; 70 km point excluded) |
| 11 | GiST index use (20 003 rows, `ANALYZE`) | `Index Scan using charge_stations_geom_idx` |
| 12 | **Required** `Unsupported(...)` column | **Client loses `create()`** (TS2339). Geography columns must be nullable, with the not-null rule enforced in SQL if needed |
| 13 | `migrate deploy` onto a database with extra pre-installed extensions (`postgis_topology`, `postgis_tiger_geocoder`, `fuzzystrmatch`) | Deploy succeeds and the schema diff is clean |
| 14 | `migrate dev` on that same database | **Drift reported** for the extra extensions, and Prisma asks for a reset |
| 15 | `prisma migrate reset` run by an agent | Refused by Prisma 7 without explicit user consent. Repeatability was proven with fresh databases instead (row 7); nothing was dropped |

All coordinates and station names were fictional (`DEMO ...`). No provider data was used.

## Conclusions

1. **The claim in `DATABASE.md` was wrong for the current release.** Prisma 7.10.1 still has no first-class PostGIS types. Spatial columns are `Unsupported`, and spatial reads and writes go through parameterised raw SQL. That is workable and safe, but spatial queries are not type-checked by Prisma.
2. Migrations, drift detection and index creation work correctly with this pattern, so Prisma Migrate can own the PostGIS schema.
3. Two rules are needed: geography columns must be nullable, and local development databases must be created from `template0` (or contain only `postgis`). The stock image's default database pre-installs extra extensions that break `migrate dev`.
4. Spatial code is small in this product: charging only, which is still gated by ADR-006 licensing. Containing raw SQL in one charging repository costs less than adding a second ORM.

## Not verified

- **The deployment host's PostGIS support** (Railway or another managed Postgres). This needs an account and network access this session did not have. It remains an explicit gate before production.
- Prisma 8 (release candidate only).
- TypedSQL (`previewFeatures = ["typedSql"]`) as a way to type the raw spatial queries. Evaluate it in EV-051 if raw SQL grows.

## Reproduction

`prisma.config.ts` sets `schema`, `migrations.path`, `datasource.url` from `DATABASE_URL` and `shadowDatabaseUrl` from `SHADOW_DATABASE_URL`.

Schema:

```prisma
generator client {
  provider        = "prisma-client"
  output          = "../generated/prisma"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  extensions = [postgis]
}

model ChargeStation {
  id                String   @id @default(uuid()) @db.Uuid
  provider          String
  providerStationId String   @map("provider_station_id")
  name              String
  geom              Unsupported("geography(Point, 4326)")?
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@unique([provider, providerStationId])
  @@index([geom], type: Gist)
  @@map("charge_stations")
}
```

Generated migration:

```sql
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateTable
CREATE TABLE "charge_stations" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_station_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "geom" geography(Point, 4326),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charge_stations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "charge_stations_geom_idx" ON "charge_stations" USING GIST ("geom");

-- CreateIndex
CREATE UNIQUE INDEX "charge_stations_provider_provider_station_id_key" ON "charge_stations"("provider", "provider_station_id");
```

Commands: `npx prisma migrate dev --name init`; `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code`; `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`; `npx prisma migrate deploy` against new databases; `node probe.ts`.

Probe (`probe.ts`, run with Node 24 type stripping):

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const out = (k: string, v: unknown) => console.log(k.padEnd(28), JSON.stringify(v));

// Hubli-ish coordinates; all data fictional.
const a = await prisma.chargeStation.create({ data: { provider: "demo", providerStationId: "A", name: "DEMO A" } });
out("client create (no geom)", { ok: !!a.id, keys: Object.keys(a) });
await prisma.$executeRaw`UPDATE charge_stations SET geom = ST_SetSRID(ST_MakePoint(${75.124}, ${15.364}), 4326)::geography WHERE id = ${a.id}::uuid`;
await prisma.$executeRaw`INSERT INTO charge_stations (id, provider, provider_station_id, name, geom) VALUES (gen_random_uuid(), 'demo', 'B', 'DEMO B', ST_SetSRID(ST_MakePoint(${75.20}, ${15.40}), 4326)::geography), (gen_random_uuid(), 'demo', 'C', 'DEMO C', ST_SetSRID(ST_MakePoint(${74.50}, ${15.86}), 4326)::geography)`;
const read = await prisma.chargeStation.findMany({ orderBy: { providerStationId: "asc" } });
out("findMany fields", Object.keys(read[0]!));
const near = await prisma.$queryRaw<{ name: string; meters: number }[]>`
  SELECT name, ST_Distance(geom, ST_SetSRID(ST_MakePoint(${75.13}, ${15.36}), 4326)::geography)::int AS meters
  FROM charge_stations
  WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${75.13}, ${15.36}), 4326)::geography, ${15000})
  ORDER BY meters`;
out("nearby within 15km", near);
const coords = await prisma.$queryRaw<{ lng: number; lat: number }[]>`SELECT ST_X(geom::geometry) AS lng, ST_Y(geom::geometry) AS lat FROM charge_stations WHERE id = ${a.id}::uuid`;
out("round-trip coords", coords[0]);
await prisma.$executeRaw`INSERT INTO charge_stations (id, provider, provider_station_id, name, geom)
  SELECT gen_random_uuid(), 'bulk', g::text, 'DEMO bulk', ST_SetSRID(ST_MakePoint(68 + random()*29, 8 + random()*29), 4326)::geography FROM generate_series(1, 20000) g`;
await prisma.$executeRaw`ANALYZE charge_stations`;
const plan = await prisma.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
  "EXPLAIN SELECT id FROM charge_stations WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(75.13, 15.36), 4326)::geography, 15000)");
out("plan uses GiST index", plan.some((r) => r["QUERY PLAN"].includes("charge_stations_geom_idx")));
console.log(plan.map((r) => r["QUERY PLAN"]).join("\n"));
await prisma.$disconnect();
```
