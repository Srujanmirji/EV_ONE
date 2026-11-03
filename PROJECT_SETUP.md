# Engineer Kickoff — From Planning Files to Running Repository

## EV-009 local foundation

The runnable workspace is now this directory; do not create a nested `evone` folder. Use Node `24.18.0` and pnpm `11.20.0`. The API needs PostgreSQL with PostGIS and Redis; Docker provides both locally. No provider credentials are needed.

```bash
pnpm install --frozen-lockfile
pnpm db:up
export REDIS_URL=redis://127.0.0.1:6379
export DATABASE_URL=postgresql://evone:evone_local_only@127.0.0.1:5432/evone
export SHADOW_DATABASE_URL=postgresql://evone:evone_local_only@127.0.0.1:5432/evone_shadow
pnpm db:migrate:deploy
pnpm dev
```

The Compose credentials are local-only placeholders. Database scripts: `db:migrate:dev`, `db:migrate:deploy`, `db:migrate:status`, `db:migrate:rollback --confirm <name>` `db:migrate:verify` (needs an empty database and a role with CREATEDB), `db:seed:demo` (fictional catalogue, never production) and `test:integration` (catalogue rules against a migrated database). The workflow and rollback strategy are in `DATABASE.md`.

The web preview runs at `http://127.0.0.1:3000` and the API at `http://127.0.0.1:4000/api/v1`. Root scripts dispatch through Turborepo. `pnpm start` serves the web build after `pnpm build`; `pnpm --filter @evone/api start` serves the built API.

API configuration is validated with Zod at startup (`apps/api/src/config/env.ts`); an invalid value stops the process with exit code 1 and names the variable without printing its value. `DATABASE_URL` and `REDIS_URL` are required; other variables have local defaults; see `apps/api/.env.example`. `/health/live` never touches dependencies. `/health/ready` returns 503 when any registered `ReadinessCheck` fails or exceeds `API_READINESS_TIMEOUT_MS`, and from the moment shutdown begins. EV-013 and EV-014 register their Postgres and Redis checks to `READINESS_CHECKS`. Inject providers with explicit `@Inject(Token)`: it keeps dependency injection working whichever compiler runs (tsc for builds, SWC for dev and tests).

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm verify:gates
pnpm --filter @evone/web exec playwright install chromium
pnpm test:e2e
```

Browser evidence is written to `apps/web/test-results/`; failed tests retain a trace. Fonts are self-hosted from the pinned Fontsource packages (Inter and Manrope, SIL Open Font License), with no Google Fonts request at build or runtime. The web shell (EV-011) renders the header, footer and one honest "not available yet" page per sitemap section, all driven by `apps/web/lib/site.ts`. Add or rename sections there; a unit test fails if a link has no page. Search indexing stays off (`INDEXING_ENABLED = false`; `robots.txt` disallows all, and every page is `noindex, nofollow`) until publishing is approved under ADR-002. Set `PUBLIC_WEB_URL` for canonical and sitemap URLs. The `/evs` catalogue (EV-024) reads the API on the server: set `API_BASE_URL` (for example `http://127.0.0.1:4000`) for `pnpm dev` and `pnpm start`. Without it, or if the API is down, the page shows an "unavailable" state rather than failing. Web browser tests start the built API on port 4100 themselves and need `REDIS_URL` plus `DATABASE_URL` pointing at a migrated database with `pnpm db:seed:demo` applied. It collects no user data and has no inventory, checkout or lead intake.

Unit tests use Vitest; put `*.test.ts` files beside the code they cover. API process tests live in `apps/api/test/*.e2e.test.ts` and run against `dist/`. Playwright specs live in `apps/web/tests/`. pnpm settings (`engineStrict`, `saveExact`, `allowBuilds`) live in `pnpm-workspace.yaml` because pnpm 11 ignores them in `.npmrc`, so installs on any Node other than 24.18.0 fail. In sandboxes whose preinstalled Chromium does not match the pinned Playwright, set `PW_CHROMIUM_EXECUTABLE` to that binary instead of installing another browser. `pnpm contract:generate` regenerates `openapi.json` and the SDK types from `packages/contracts`, and `pnpm contract:check` fails if the committed copies are stale (see `API_CONTRACT.md`, OpenAPI generation). Seed scripts below are future acceptance targets, not implemented commands.

## EV-014 worker

After `pnpm db:up`, export `REDIS_URL` as above. Start the worker in a separate terminal:

```bash
pnpm --filter @evone/api worker:dev
# Or, after pnpm build:
pnpm --filter @evone/api worker:start
```

The worker shares the API package/build but is a separate NestJS process; it needs only `REDIS_URL`, not a database connection. It consumes only `foundation.probe.v1` with `{ eventId: <UUID> }` from `evone-foundation`. This has no external side effects. No public enqueue endpoint exists. Integration tests enqueue a real probe, simulate a transient handler failure and prove retry recovery. To run just worker checks against an isolated Redis:

```bash
pnpm --filter @evone/api build
pnpm --filter @evone/api exec vitest run --config vitest.integration.config.ts test/queue.integration.test.ts
pnpm --filter @evone/api exec vitest run --config vitest.e2e.config.ts test/worker.e2e.test.ts
```

The queue defaults to three attempts with exponential backoff (100ms base), retaining up to 100 completed and 100 failed probes. Exhausted jobs remain in BullMQ's failed set for inspection; there is no separate DLQ/alert integration yet (EV-019 and future business consumers). Consumers reject unknown names and malformed payloads without retry. Logs contain fixed lifecycle/failure messages and attempt counts, never payloads or connection errors. SIGTERM stops intake and drains active work.

Local Compose uses Redis 8.10.3 with AOF persistence and `noeviction`; CI uses disposable Redis. Managed production Redis must use TLS (`rediss://`), private networking/access controls, persistence and no eviction. A probe is idempotent because it has no side effects; business outbox/idempotency/consent checks are added with business jobs. Producers must check Redis readiness before enqueueing: BullMQ can wait indefinitely for its first connection, even with its offline queue disabled. API readiness rejects immediately until connected, then verifies a real queue read.

## Stage 1 — later setup prerequisites
- GitHub repo private for initial work, team access and required review.
- Node LTS, pnpm, Docker, Postgres/PostGIS, Redis, provider sandbox accounts.
- Decisions: auth vendor, map provider rights/cost, accessories seller-of-record, finance legal gate.
- Add this documentation pack to `/docs` in the actual repo and root `AGENTS.md` for coding agents.

## Stage 2 — original blueprint scaffold target (historical)
```bash
mkdir evone && cd evone
git init
# Use the checked-in pnpm workspace/Turborepo template created in EV-009.
# Do NOT run package installs from this documentation alone until the repo exists.
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
EV-009 uses the existing root instead of duplicating this directory. Follow the runnable instructions above. Future application/service commands are added only with their tasks.

## Stage 3 — build order
1. EV-009–EV-020 scaffold, auth, contracts, schema.
2. EV-021–EV-037 model catalogue + real used-vehicle seller/buyer journey.
3. EV-039–EV-050 accessories first-party commerce and calculators.
4. EV-051–EV-067 charging/editorial/finance/account/dashboard.
5. EV-068–EV-078 QA and controlled deployment.
6. EV-079–EV-080 pilot learning before P1/P2 scale.

## Required local scripts once repo exists
- `pnpm dev`: run web/admin/API/worker with local dependencies.
- `pnpm lint`, `typecheck`, `test`, `test:integration`, `test:e2e`, `build`.
- `pnpm db:migrate:dev`, `db:migrate:deploy`, `db:seed:demo` (seed safely labelled demo only).
- `pnpm contract:generate` and `contract:check`.

## Demo data boundary
Development/demo stage may use fabricated EV listing entries **only if visibly tagged `DEMO / FICTIONAL`**. Production uses real seller permission and reliable specs. Do not mix production environments with seeded test IDs.

## What's not included in this zip
The complete runnable Next.js/NestJS application, API keys, licensed stock imagery, regulator approvals, partner agreements, and verified real inventory. This ZIP is the thorough handoff/specification and execution backlog for building that software.
