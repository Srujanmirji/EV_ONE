# EV-023 — Catalogue read endpoints evidence

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Status: EV-023 complete.

**Done when:** pagination, published-only reads and schema contract tests. All three are covered by integration tests against PostgreSQL, and each guard was proven by breaking it.

## Endpoints (base `/api/v1`)

| Endpoint | Behaviour |
|---|---|
| `GET /brands` | Published brands with at least one published model, with their vehicle types; ordered by name |
| `GET /models` | Published models; `brandId` and `vehicleType` filters; `limit` 1–50 (default 20); opaque `cursor`; ordered by `(name, id)` |
| `GET /brands/{brandSlug}/models/{modelSlug}` | Published model with its published variants |
| `GET /variants/{id}` | Published variant: specs plus the reviewed source behind each stated value |

**Rules:**
- **Published only.** Brand, model and variant must all be `PUBLISHED`; anything else returns 404, the same as missing.
- **Demo data.** `is_demo` rows are hidden when `NODE_ENV=production` and flagged `isDemo` elsewhere.
- **Spec values.** `claimedRange` is `{ km, standard }` or `null`, and unknown specs are `null`.
- **Sources.** Unreviewed sources and reviewer identity are never exposed.
- **Bad input.** Invalid or unknown parameters and tampered cursors return 400 `VALIDATION_ERROR` with per-field `fields`.

## Deviations from the original plan (documented in API_CONTRACT.md)

1. **`/models/{slug}` became `/brands/{brandSlug}/models/{modelSlug}`.** EV-021 makes model slugs unique per brand only, so a bare model slug can match two models.
2. **Ordering is `(name, id)`, not `(createdAt, id)`.** `created_at` is `timestamptz(6)`, but a JavaScript `Date` keeps only milliseconds, so a timestamp cursor would compare inexactly and could skip or repeat rows. Text and UUID compare exactly, and name order suits catalogue browsing.
3. **Out of scope:** `/compare` belongs to EV-026, and `/model-prices` waits for a `vehicle_prices` table (deferred in EV-021).

## Changed files

- Contracts: `packages/contracts/src/catalogue.ts` (new schemas, query and path params), `src/routes.ts` (4 routes, 400/404 responses), `src/openapi.ts` (OpenAPI parameters from Zod, refs to shared enums), `src/index.ts`, regenerated `openapi.json`.
- SDK: regenerated `packages/sdk/src/schema.ts`.
- API: `src/catalogue/{catalogue.module,catalogue.controller,catalogue.repository,catalogue.mapper,cursor}.ts`, `src/common/validation.ts` (`RequestValidationError`), `src/common/http-exception.filter.ts` (VALIDATION_ERROR with fields), `src/database/database.token.ts`, `src/app.module.ts` (DB in DI), `src/main.ts`, `vitest.integration.config.ts`, `package.json` (`test:integration`).
- Tests: `src/catalogue/{cursor,catalogue.mapper}.test.ts` (unit); `test/support.ts`, `test/catalogue.integration.test.ts` (14), `test/contract.integration.test.ts` (moved from `src/contract.test.ts`; now has a concrete request for every documented status); `src/health/health.test.ts`.
- CI: `.github/workflows/ci.yml`, renamed integration step.
- Documentation: `API_CONTRACT.md`, `TASKS.md`, this record.

## Mutation checks

| Deliberate break in `catalogue.repository.ts` | Failing test |
|---|---|
| Variants under a model not filtered by status | "hides unpublished models, variants and brands everywhere" |
| `includeDemo = true` regardless of environment | "is visible and labelled outside production, absent in production" |
| Cursor tiebreak `id >= cursor` instead of `>` | "walks every published model exactly once, ordered by (name, id), across pages" |

Each break failed exactly one test, and the file was restored after each.

The contract test also fails when any documented (operation, status) pair lacks a concrete request, so a newly documented 4xx cannot go untested.

## Verification

Local runs used Node 24.18.0, pnpm 11.20.0, and PostgreSQL 17.5 / PostGIS 3.5.2.

| Command | Actual result |
|---|---|
| `pnpm format:check`, `lint`, `typecheck`, `build` | Pass |
| `pnpm contract:check` | Pass against committed files (before committing, it correctly reported the regenerated files as changed) |
| `pnpm verify:gates` | 15/15 probes rejected |
| `pnpm test:unit` | api 33, contracts 7, web 3, sdk 2 |
| `pnpm test:integration` | api 28 (catalogue 14 + contract 14), db 18 |
| `pnpm test:e2e` | api 4, web 8 |

[Hosted Foundation checks run 41668025897](https://github.com/Srujanmirji/EV_ONE/actions/runs/41668025897) (commit `e9ac9a1`) passed all 20 steps on Ubuntu, including "Prove openapi.json and the SDK match the contracts" and "Prove catalogue rules, endpoints and API contract against PostgreSQL". The docs commit `ed2e54e` also passed ([run 41668083646](https://github.com/Srujanmirji/EV_ONE/actions/runs/41668083646)).

## Remaining gaps

- **No caching headers or rate limiting** on public reads. Add them before traffic (EV-068 to EV-078 hardening) or with the first browser consumer (EV-024).
- **`/brands` is unpaginated.** That is fine for a bounded brand list; revisit if it grows past roughly 200.
- **Name order uses the database collation** (`en_US.utf8` in the Compose image). The production host's collation should match to keep cursor order stable across environments.

## Rollback

Revert the EV-023 commits. Read-only endpoints; no data or schema change.
