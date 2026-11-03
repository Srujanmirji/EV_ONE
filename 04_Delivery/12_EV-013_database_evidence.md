# EV-013 — Postgres + PostGIS and migrations evidence

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Status: EV-013 complete.

**Done when:** migrations are repeatable and the rollback strategy is documented. Repeatability and rollback are both proven in CI, not only described.

## Prerequisites

EV-012 complete. ADR-012 accepted by the owner (option A) on 2026-11-03. The deployment host's PostGIS support is still unverified and remains ADR-012's production gate.

## Changed files

- Database package: `packages/db/{package.json,prisma.config.ts,tsconfig.json,tsconfig.build.json,eslint.config.mjs,.gitignore}`, `prisma/schema.prisma`, `prisma/migrations/20261103150159_enable_postgis/{migration.sql,down.sql}`, `prisma/migrations/migration_lock.toml`, `src/index.ts`, `scripts/{lib,migrate-rollback,migrate-verify}.mjs`.
- Local infrastructure: `infra/docker/docker-compose.yml`, `infra/docker/postgres-init/10_postgis.sh`.
- API: `src/config/env.ts` (required `DATABASE_URL`), `src/database/database.check.ts` and test, `src/app.module.ts` (shutdown hooks), `src/main.ts`, `test/server.e2e.test.ts`, updated config and health tests, `.env.example`.
- Workspace: `package.json` (`db:*` scripts), `turbo.json` (`^build` before lint, typecheck and unit tests; `DATABASE_URL` passthrough), `pnpm-workspace.yaml` (Prisma build scripts allowed), `pnpm-lock.yaml`, `.prettierignore`, `.env.example`, `scripts/verify-quality-gates.mjs` (db probes), `.github/workflows/ci.yml` (PostGIS service, migration proof).
- Documentation: `DATABASE.md` (migration workflow and rollback strategy), `PROJECT_SETUP.md`, `README.md`, `06_Reference/02_decision_register.md` (ADR-012 accepted), `TASKS.md`, this record.

## Findings during implementation

1. **Prisma cannot roll back a successful migration.** `prisma migrate resolve --rolled-back` fails with P3012 ("not in a failed state"). `migrate:rollback` fills the gap: it reverts the latest applied migration only, requires `--confirm <name>`, and runs `down.sql` plus the history-row delete in one transaction.
2. **Prisma does not generate usable down scripts here.** `migrate diff --from-migrations … --to-empty --script` produced an empty script for the baseline. Down scripts are hand-written and verified by CI.
3. **The first verifier could not fail.** With `down.sql` replaced by `SELECT 1;`, Prisma's `migrate diff` still reported "no difference", because it ignores the extension drop. The verifier now also compares a system-catalog snapshot (extensions, relations, columns, indexes, constraints, enums) against the earlier migrations applied to a temporary database. The same mutation then fails, listing the leftover `postgis` extension and its tables.
4. **The stock PostGIS image database causes drift.** It pre-installs extensions Prisma flags. The Compose file replaces the image's init script, and CI creates its databases from `template0`.

## Verification

Local runs used Node 24.18.0, pnpm 11.20.0, and Docker with `postgis/postgis:17-3.5` (PostgreSQL 17.5, PostGIS 3.5.2).

| Command / check | Actual result |
|---|---|
| `pnpm db:up` | Healthy; `evone` and `evone_shadow` contain only `plpgsql` |
| `pnpm db:migrate:dev --name enable_postgis` | Baseline migration `CREATE EXTENSION IF NOT EXISTS "postgis"` |
| `pnpm db:migrate:verify` (empty DB) | 12/12 checks ok |
| Same, with `down.sql` = `SELECT 1;` | Exit 1: "post-rollback catalog equals the earlier migrations" FAIL, leftover objects listed |
| `pnpm db:migrate:rollback` with no or wrong `--confirm` | Exit 1, names the real latest migration, no change |
| `pnpm format:check`, `lint`, `typecheck`, `build` | Pass |
| `pnpm test:unit` | API 23/23; web 3/3 |
| `pnpm test:e2e` (`DATABASE_URL` = migrated DB) | API 4/4 (ready with database up; 503 with database unreachable and no host leak; refuses start without `DATABASE_URL`; invalid config not echoed); web 8/8 |
| `pnpm verify:gates` | All 9 probes rejected (format; typecheck and lint for web, API and db; unit tests for web and API) |

[Hosted Foundation checks run 41660702823](https://github.com/Srujanmirji/EV_ONE/actions/runs/41660702823) (commit `4e2bebd`) passed every step on Ubuntu, including "Create empty databases", "Prove migrations are repeatable and reversible", `db:migrate:deploy` and the end-to-end tests.

## Remaining gaps

- The production host is unverified for PostGIS, backups and point-in-time recovery (ADR-012 and ADR-015 production gates).
- No domain tables yet; EV-021 and EV-027 add them, each with a `down.sql`.
- `migrate:verify` reverts only the latest migration. Multi-step rollbacks are deliberately unsupported; use backups.
- Seed scripts (`db:seed:demo`) are not implemented; they belong with the first domain data.
- The DB package has no unit tests; its behaviour is covered by the verifier and the API end-to-end tests.

## Rollback of this task

Revert the EV-013 commits and `docker compose -f infra/docker/docker-compose.yml down -v` locally. No shared or production database was touched.
