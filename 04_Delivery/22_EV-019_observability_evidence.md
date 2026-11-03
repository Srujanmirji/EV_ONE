# EV-019 — Sentry, structured logging, request IDs evidence

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Status: **in progress.** Everything is built and tested except the live test alert, which needs a Sentry project (AGENTS rule 9: feature off, blocker reported).

**Done when:** PII redaction and test alert confirmed.

| Criterion | State | Proof |
|---|---|---|
| PII redaction | **Met** | 32 redaction tests (sensitive keys in camelCase and snake_case; emails, Indian mobiles, bearer tokens, JWTs, 4-4-4 digit groups and URL credentials masked; non-personal text such as UUIDs, kWh figures and status codes kept; no mutation; cycles). A Sentry capture-transport test shows an error with an email and a database password, plus a breadcrumb with a phone number, arrive redacted, while the alert name, service and requestId survive. Removing the `beforeSend`/`beforeBreadcrumb` redaction makes it fail (the email leaks). API tests show the access log drops query strings and a 500 is logged and reported without the email or password. |
| Test alert confirmed | **Blocked: needs a Sentry project/DSN** | `pnpm --filter @evone/api sentry:test` is implemented; it exits 1 without a DSN. To close: set `SENTRY_DSN`, build, run it, and confirm `sentry.test_alert` arrives with no personal data in its tags. |

## What was built

- **`@evone/observability`:**
  - `redact`, with key-based and pattern-based removal;
  - `createLogger`, which writes redacted JSON lines with a service name and child bindings;
  - `initErrorTracking`, off without a DSN. It sets `sendDefaultPii: false` and `tracesSampleRate: 0`, and `beforeSend` drops request body, cookies, headers, query string and user, then redacts the event (breadcrumbs are redacted too);
  - `captureError` and `captureAlert` (identifiers only).
  - `@sentry/node` is pinned at 10.78.0, the mature 10.x line; 11.x had been out for 6 days.
- **API:**
  - `http.request` access line per request (method, path without query, status, duration, requestId; health probes at debug);
  - 5xx errors logged as `http.error` (error name only) and reported tagged with requestId and route; 4xx errors not reported;
  - NestJS framework logs routed through the same logger;
  - new config `SENTRY_DSN` (https only), `APP_RELEASE` and `LOG_LEVEL`;
  - `sentry:test` script.
- **Request IDs:** EV-012 already accepts and generates `X-Request-ID`. Access logs, error logs and error reports now all carry it. Propagation to queued jobs comes with the first API-produced event.
- **Worker:**
  - the shared logger replaces the local one;
  - `SENTRY_DSN`, `APP_RELEASE` and `LOG_LEVEL` config;
  - dead letters raise `captureAlert("job.dead_letter", { event, jobId, reason })`;
  - error tracking is flushed on shutdown.

## Fixed along the way

- **The IP key rule wiped words ending in "ip"** (`ownership`), and the first test wrongly kept `clientIp`. Keys are now split from camelCase into words before matching; tests cover both directions.
- **Parallel Vitest runs shared and deleted one root module cache** (`ENOTEMPTY`), a flake risk for CI. Every Vitest config now sets a per-package `fsModuleCachePath`. Three forced parallel `test:unit` runs passed, and the root cache is no longer created.
- **Environment:** the Docker daemon and Redis were killed between turns. They were restarted detached; no code impact.

## Verification

Local runs used Node 24.18.0, pnpm 11.20.0, PostGIS and Redis.

| Command | Actual result |
|---|---|
| `pnpm format:check`, `lint`, `typecheck`, `build`, `contract:check` | Pass |
| `pnpm verify:gates` | 26/26 probes rejected (now including @evone/observability) |
| `pnpm test:unit` | observability 35, api 39, web 27, ui 12, contracts 7, worker 3, sdk 2 |
| `pnpm test:integration` | api 38, db 18, worker 9 |
| `pnpm test:e2e` | web 192, api 4, worker 2 |

[Hosted Foundation checks run 41697039761](https://github.com/Srujanmirji/EV_ONE/actions/runs/41697039761) (commit `d9422eb`) passed all steps on Ubuntu.

## Remaining to close EV-019

1. Create the Sentry project (owner/account decision; data region and retention per ADR-015).
2. Store `SENTRY_DSN` in the deployment secret store and in local `.env` only; never commit it.
3. Run `pnpm --filter @evone/api build`, then `pnpm --filter @evone/api sentry:test`.
4. Confirm the event in Sentry, and that its tags and breadcrumbs contain no personal data. Then mark EV-019 done.

**Also open:**
- The web app has no error tracking yet (add `@sentry/nextjs` with the same `beforeSend`).
- Alert routing (who gets paged) is an operations decision.

## Rollback

Revert the EV-019 commits. Without `SENTRY_DSN` nothing is sent; logging changes are additive.
