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

## EV-019 observability (local implementation; live acceptance pending)

API/worker processes emit one JSON record per event. `http.completed`/`http.aborted` include status, duration, matched route template and request UUID; `http.failed` uses the same UUID. An invalid inbound ID is replaced. Correlation is passed explicitly per request, so concurrent requests cannot overwrite each other's IDs. No auth identity exists yet, so no user/role fields are emitted.

Logs and Sentry events use a strict allowlist: request/event UUIDs, method, matched route, numeric status/duration/attempt/failure counts. Config variable **names** appear only in startup logs. Headers, concrete paths/query strings, bodies, user/contact data, connection details, raw errors/stacks and SDK breadcrumbs/context are excluded. This limits diagnostics to event category and correlation metadata. Nest's default logger/automatic Sentry integrations are disabled to keep raw exception data out of alternate log paths; fatal process handlers emit sanitized records and exit 1.

`SENTRY_DSN` is optional, private to backend processes and absent by default. To configure later, place the approved project's HTTPS DSN in `apps/api/.env` or the deployment secret environment (never in source, chat, browser variables or logs). `NODE_ENV` labels events as development/test/production. HTTP DSNs are accepted only on loopback for local transport tests. No real project is configured by this task.

```bash
pnpm build
# With SENTRY_DSN configured securely:
pnpm --filter @evone/api telemetry:smoke
```

The smoke command sends only `telemetry.test`. Exit 0 means the SDK request received a successful HTTP ingestion response; it does **not** prove an issue was stored or an alert delivered. Rejected responses, network errors and flush timeouts fail the command and emit `telemetry.delivery_failed` without endpoint details. API/worker failures continue to log when telemetry is unavailable; this observability dependency does not change API readiness. Shutdown drains resources, captures cleanup failures and flushes Sentry with a two-second bound.

Live acceptance remaining: create/select the EVONE Sentry project, approve its retention/access and alert destination, configure the DSN, run the smoke command, confirm the issue and actual alert receipt, then attach evidence and complete EV-019. Until then, leave its task in progress.

Local checks requiring neither a database nor a Sentry account:

```bash
pnpm --filter @evone/api test:unit
pnpm --filter @evone/api build
pnpm --filter @evone/api exec vitest run --config vitest.e2e.config.ts test/telemetry.e2e.test.ts
```

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

## EV-049 calculator

Set `API_BASE_URL=http://127.0.0.1:4000` in the web environment and run the API/web as above. Open `/calculator`, enter values or use the labeled illustrative example, then Calculate estimate. The Server Action calls `POST /api/v1/calculators/ev-savings` through the generated SDK with a five-second timeout and validates the response. The API needs no data for this pure endpoint. Production API readiness still depends on its configured database/Redis services.

The form's optional purchase premium is **rupees** with up to two decimals; it is validated and converted to integer paise server-side. Six-decimal precision applies to other inputs. No inputs/results are saved in browser storage, database or request logs. Errors preserve controlled field values. No tariff defaults, vehicle prices or guarantee of savings is implied. A single effective home/public electricity tariff is entered; no automatic tariff-mix calculation or charging-loss assumption is added.

Run unit tests with `pnpm test:unit`; the normal CI/database setup runs new calculator browser tests with `pnpm --filter @evone/web exec playwright test tests/calculator.spec.ts`. They cover keyboard-only calculation, input errors, negative/zero results, loading, transport failure/retry, stale-result clearing and axe at four viewport widths. Evidence and local fixture details: `04_Delivery/24_EV-049_calculator_evidence.md`.

## EV-005 — Isolated Clerk development spike

Owner selected Clerk for a development spike on 2026-11-04 and confirmed no instance exists yet. The local verification tests need no account, credentials, database or internet. Real provider sign-in remains unverified; EV-005 stays in progress, and EV-016/RBAC are not unlocked by this scaffold.

Run `pnpm --filter @evone/web test:unit`. The suite uses ephemeral RSA keys and a loopback JWKS server with the actual Clerk SDK. Component tests reuse the repository's React Testing Library/jsdom versions and mock provider hooks; they do not prove real sign-in. `@clerk/nextjs` 7.9.24 and `@clerk/backend` 3.26.6 are pinned; declared peer ranges support the pinned Next.js/React/Node stack. The existing openapi-typescript TypeScript-5 peer warning remains; no new Clerk peer conflict was found.

To view the unconfigured state without sending provider requests:

```bash
AUTH_SPIKE_ENABLED=true pnpm --filter @evone/web dev
```

Visit `http://127.0.0.1:3000/auth-spike`. In production/test mode the page and POST verification route return 404 even if the flag is true. It has no public navigation link, sitemap entry or global Clerk middleware/provider.

When an owner-managed **development** instance is available, configure email verification first and place values only in ignored `apps/web/.env.local`:

| Variable | Requirement |
|---|---|
| `AUTH_SPIKE_ENABLED` | `true`, development server only |
| `AUTH_SPIKE_CLERK_PUBLISHABLE_KEY` | `pk_test_…` for the same instance as issuer |
| `AUTH_SPIKE_CLERK_ISSUER` | Exact `https://<instance>.clerk.accounts.dev` origin |
| `AUTH_SPIKE_AUDIENCE` | `evone-api-development`, matching the issued JWT |
| `AUTH_SPIKE_ORIGIN` | Exact browser origin; localhost/127.0.0.1/IPv6 loopback only, with port |
| `AUTH_SPIKE_CLERK_JWT_KEY` | Dashboard RSA-2048 SPKI **public** PEM key, quoted with real newlines as required by the dotenv format; never a private key |

No Clerk secret key is required by this networkless probe. Do not run account-provisioning CLI commands or enable paid plans as part of local setup. Do not place keys/tokens in chat, committed files, test reports or screenshots.

Create a development JWT template named `evone-api`, with audience `evone-api-development` and a short lifetime (for example 60 seconds). Inspect actual claim presence locally: `iss`, `aud`, `sub`, expiry and `azp` must match the configured instance, audience and browser origin. Do not print or commit the token. Missing audience is intentionally rejected rather than silently accepting a default session token. See [Clerk templates](https://clerk.com/docs/guides/sessions/jwt-templates).

The page contains the real SDK SignIn/SignUp hash flows. A signed-in session can request the scoped template token and check it through same-origin `POST /auth-spike/verify`. Only `{ verified: boolean }` is returned with `Cache-Control: no-store`; no identity/claims/token is displayed or logged. Sign-out uses the SDK. The template token stays in memory for that request; it is not stored by EVONE in localStorage, URLs or the database. The probe uses browser-to-server bearer verification only; the production Server Action/Nest integration remains EV-016.

The verifier pins RS256, issuer, audience, authorized party and the configured public key. It explicitly requires a nonempty subject, matching audience and valid NumericDates because the tested SDK allows missing audience/empty subject and has permissive behaviour for extreme timestamps. SDK signature validation is retained. The public key is **pinned**, so rotation requires updating it; remote JWKS tests demonstrate SDK mechanics, not automatic rotation in this probe. Offline tokens may remain valid until expiry after logout; no immediate revocation guarantee is made.

Before marking EV-005 complete, verify real development sign-up/sign-in/reload/sign-out, stale-session behaviour, email delivery/recovery, actual cookie flags, redirects/origins, CSRF/cache isolation, claims and rotation/revocation limits. Keep MFA, pricing, region/subprocessors and retention/export review explicit before production. Neither a mock session nor local JWT tests meet the live sign-in acceptance criterion.


## EV-016 — Local API bearer guard (in progress)

Owner approved a local-only exception to EV-005's live-instance prerequisite. Production authentication remains disabled; this does not complete EV-005/EV-016 or authorize EV-017.

The API defaults to `AUTH_MODE=disabled`; `/api/v1/auth/session` returns 401. To test with an eventual owner-managed development instance, use the EV-005 `evone-api` JWT template and configure ignored `apps/api/.env`:

- `AUTH_MODE=clerk-local`
- `NODE_ENV=development` (tests may use `test`)
- `API_HOST=127.0.0.1` (localhost and IPv6 loopback are also accepted)
- `AUTH_ISSUER`: exact development `https://<instance>.clerk.accounts.dev` origin, without a trailing slash/path.
- `AUTH_AUDIENCE=evone-api-development`, matching the template's `aud`.
- `AUTH_AUTHORIZED_PARTY=http://127.0.0.1:3000`, matching the token's `azp`, including port.
- `AUTH_JWT_KEY`: the instance's RSA-2048 SPKI **public** PEM key, not a secret/private key.

Malformed/missing auth configuration, non-loopback binding or production mode causes startup failure before a listener starts. Failure logs carry allowlisted variable names only. No secret key or online JWKS call is needed for this pinned-key local stage. A key change requires an explicit configuration update; offline tokens can outlive logout until expiry.

Call the protected endpoint through the generated SDK with `Authorization: Bearer <token>` kept in memory. Success returns only `authenticated: true` and request metadata, with `no-store`; invalid/expired/missing tokens get a generic 401 and bearer challenge. Do not paste real tokens into chat, terminal command history, fixtures or logs. This status probe grants no account/role/dealer permissions. Public endpoints remain accessible with auth disabled.

`pnpm --filter @evone/api test:unit` exercises real Nest/HTTP/SDK requests with ephemeral signatures and an unused database object. The new database-backed contract fixtures cover 200/401 in normal integration CI. Built-process tests refuse production/non-loopback/invalid-PEM startup. See `04_Delivery/27_EV-016_local_auth_evidence.md` for local commands and unrun checks. No UI or database migrations changed.


## EV-017 — Local scoped permissions and decision audit (in progress)

Apply the new migration only to a disposable local/staging database using the existing reviewed migration workflow. All new users start suspended; authentication alone does not provision an app user or grant access. There is no automatic role bootstrap or role-management endpoint. Actual development identities and scoped grants must come from a trusted owner-controlled provisioning process when that work is introduced; do not treat signed token metadata as authorization.

`GET /api/v1/auth/access/account/{userUuid}` and `/api/v1/auth/access/dealer/{scopeUuid}` use the EV-016 local bearer configuration, then read the app-owned user/grants and persist an audit outcome. No token or identity is printed in the response. Production still refuses local auth mode.

| Scope probe | Grant required | Boundary |
|---|---|---|
| Account | Active global USER or ADMIN | Exact mapped user's own UUID; no wildcard ADMIN bypass |
| Dealer | Active DEALER_STAFF or DEALER_OWNER | Exact granted dealer scope UUID |

Suspended identities and expired/inactive grants are denied. Each request rereads database state; transactionally written audit evidence must succeed before access is returned. Denied checks also persist evidence. This foundation covers scope reads; later feature mutations need per-action/ownership policies. No dealer verification or EV-066 membership flow is claimed.

Run unit checks now with `pnpm test:unit`. Real database checks use `pnpm db:migrate:verify` on an empty disposable verification DB, `pnpm db:migrate:deploy`, then `pnpm test:integration` with the normal migrated PostgreSQL/Redis environment. The new schema uses Prisma's supported partial-index preview feature and requires drift/rollback confirmation in CI. Retained synthetic audit rows are intentional; tests must never point at a production database. Audit UPDATE/DELETE/TRUNCATE tests always roll back their transaction even if protection fails.

This host lacks Docker/native PostgreSQL tools. Supplemental checks using Prisma’s already-installed PGlite dependency passed 14 SQL assertions and six API integration tests. The attempted full database suite hit socket-adapter error recovery failures, so native PostgreSQL/PostGIS migration, rollback, drift and full integration checks remain pending. Do not mark EV-017 complete or enable production auth until the remaining checks pass. See `04_Delivery/28_EV-017_local_rbac_evidence.md`.

## EV-022 local catalogue workspace

No live Clerk instance is configured. After completing the EV-005 local development setup, set `CATALOGUE_EDITOR_ENABLED=true` in the web’s ignored local environment file alongside `AUTH_SPIKE_ENABLED=true`, the development instance/template/public-key settings and loopback `API_BASE_URL`. Start the web in development and API with `AUTH_MODE=clerk-local`; production refuses enabled API local auth and the editor page/gateway are unavailable outside development.

Use only approved synthetic development identities. Their issuer/subject must map to ACTIVE app users with active, unexpired GLOBAL EDITOR or ADMIN grants in the disposable development database. There is no provisioning/grant-management endpoint; do not infer roles from JWT metadata. Use different editor/admin accounts in separate browser profiles/private windows for review while live session switching remains unverified. The web requests the existing `evone-api` token template; credentials/tokens must never be pasted into docs or logs.

Open `/admin/catalogue`: create a new brand/model/variant draft, add spec citations, save, submit, then sign in as a different admin and open the submitted entry. Open each cited source, compare its wording/value, explicitly attest and approve; alternatively request changes with a reason. The owner can edit/resubmit rejected entries. Stale revisions require reload; errors retain form values. New publication is marked demo. Availability/date remain unknown and existing published-model editing is outside this slice.

Without instance configuration the opted-in page shows an honest unavailable state without contacting a provider. The actual workspace→API→PostgreSQL browser checks use a temporary isolated UI fixture with signed synthetic JWTs; they do not prove real Clerk sign-in/cookies/logout. See `04_Delivery/31_EV-022_catalogue_editor_evidence.md` for exact verification and remaining gates.
