# EV-021 — Brand/model/variant schema and seeds evidence

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Status: EV-021 complete.

**Done when:** the schema supports source-referenced real specs. It goes further: the database refuses to publish a stated spec that has no reviewed `https` source.

## Changed files

- Schema and migration: `packages/db/prisma/schema.prisma`; `prisma/migrations/20261103152727_catalogue/{migration.sql,down.sql}`. Prisma generated the tables; the checks, view, functions and triggers are hand-written.
- Seed: `packages/db/src/seed-demo.ts`, `src/seed-demo-cli.ts`, `src/index.ts` exports.
- Tests: `packages/db/test/catalogue.integration.test.ts`, `packages/db/vitest.config.ts`.
- Tooling: `packages/db/scripts/lib.mjs` (catalog snapshot now covers functions and triggers), `packages/db/package.json` (`generate`, `test:integration`, `seed:demo`), `turbo.json` (`generate` task; `test:integration`), root `package.json` (`test:integration`, `db:seed:demo`), `.github/workflows/ci.yml` (integration and seed steps), `pnpm-lock.yaml`.
- Documentation: `DATABASE.md` (catalogue implementation and deviations), `PROJECT_SETUP.md`, `TASKS.md`, this record.

## Rules and how each was proven

| Rule | Enforced by | Proof |
|---|---|---|
| Stated spec needs a reviewed `https` source to publish | Deferred constraint trigger + `ev_variant_unsourced_specs` view | Integration tests: no source, unreviewed source, partial sources all refused; fully sourced publishes |
| Unknown spec (NULL) needs no source | View ignores NULLs | Test: all-NULL variant publishes |
| Sources and status can change in one transaction | `DEFERRABLE INITIALLY DEFERRED`; re-reads row at commit | Tests: add-source-and-publish and publish-then-revert in one transaction |
| Published data stays sourced | Triggers on `spec_sources` and `ev_variants` | Tests: delete source, un-review source, add unsourced spec, delete published variant all refused |
| Publish order brand → model → variant | Publish check + parent guard trigger | Tests: variant under draft model refused; unpublishing parents of published children refused |
| Range paired with test standard; positive units; slug format; complete reviews | CHECK constraints | Tests for each |
| Seed is fictional, idempotent, never production | `seedDemoCatalogue` | Tests: refuses `NODE_ENV=production`; double run converges; all rows `is_demo`, `DEMO` names, `example.com` sources, zero unsourced published specs |

**Mutation checks:**
- With the `ev_variants_publish_guard` trigger dropped, 6 of the 18 integration tests fail.
- With `down.sql` missing a function drop, `db:migrate:verify` fails and names `evone_parent_publish_guard()`. Before this task the catalog snapshot did not include functions or triggers, so that rollback gap would have passed.

## Also fixed

**A latent race from EV-013.** `@evone/db`'s `build` and `lint` scripts each ran `prisma generate` into `src/generated`, and Turbo could run them concurrently. That surfaced here as "src/generated exists and is not empty but doesn't look like a generated Prisma Client". Generation is now a single cached Turbo task (`generate`) that `build`, `lint`, `typecheck` and `test:unit` depend on. Three forced parallel `lint typecheck build` runs passed.

## Deliberate deviations (recorded in DATABASE.md)

- **No stored `data_status` column.** The `ev_variant_unsourced_specs` view computes it, so the rule and the status cannot disagree.
- **`spec_sources.reviewer_id` has no foreign key** until users exist (EV-016/017).
- **`vehicle_prices` is deferred** to the first task that shows prices.
- **Vehicle types (SCOOTER, MOTORCYCLE, CAR, THREE_WHEELER) were chosen by the implementer.** The owner should confirm whether commercial vehicles are in scope.

## Verification

Local runs used Node 24.18.0, pnpm 11.20.0, and PostgreSQL 17.5 / PostGIS 3.5.2 in Docker.

| Command | Actual result |
|---|---|
| `pnpm format:check`, `lint`, `typecheck`, `build`, `contract:check` | Pass |
| `pnpm verify:gates` | 15/15 probes rejected |
| `pnpm db:migrate:verify` (empty DB, 2 migrations) | 12/12 checks ok |
| `pnpm test:integration` | 18/18 |
| `pnpm db:seed:demo` | Seeded; second run idempotent |
| `pnpm test:unit` | 40/40 (api 28, contracts 7, web 3, sdk 2) |
| `pnpm test:e2e` | API 4/4, web 8/8 |

[Hosted Foundation checks run 41665429328](https://github.com/Srujanmirji/EV_ONE/actions/runs/41665429328) (commit `a2dd290`) passed all 20 steps on Ubuntu in about 3 minutes. These include "Prove migrations are repeatable and reversible" (two migrations), "Prove catalogue publishing rules against PostgreSQL" (18 tests), "Prove the demo seed runs on a migrated database", and `pnpm lint`, which hit the Prisma generation race locally.

## For the next tasks

- EV-022 (editor) gets publish safety from the database. Its UI should read `ev_variant_unsourced_specs` to show editors what is missing before they try to publish.
- EV-023 (read endpoints) must return only `PUBLISHED` rows, exclude `is_demo` in production, and always show `range_standard` with `claimed_range_km`.

## Rollback

`pnpm db:migrate:rollback --confirm 20261103152727_catalogue` on non-production databases (drops all catalogue data), or revert the EV-021 commits.
