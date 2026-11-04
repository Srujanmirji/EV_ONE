# EV-019 — Backend observability local evidence

Date: 2026-11-04. Branch: `feat/EV-019-observability`, based on `ee82240` from still-open EV-014 PR #5. **Status: in progress.** User confirmed no Sentry project exists and authorized local implementation/testing. Hosted issue and actual alert receipt remain outstanding; completion stays 13/87 tasks.

## What works locally

- API and worker output JSON with fixed event names, timestamps, levels and validated metadata. Startup failures name invalid config keys but never their values. Default Nest logging is disabled; fatal handlers replace raw Node exception output and exit 1.
- Existing `X-Request-ID` UUID generation/validation is reused. Completion, abort and 5xx events share the response/envelope ID. Matched Express route templates exclude concrete path parameters/query strings. Unknown routes omit route metadata. Concurrent-request tests verify IDs stay separate.
- Optional `@sentry/node` 11.10.0 client with explicit manual events and no automatic integrations. `beforeSend` rebuilds events from an allowlist and preserves only validated environments and correlation fields. Missing `SENTRY_DSN` keeps external reporting disabled. HTTPS is required except for loopback transport tests.
- Raw messages/stacks, headers, bodies, query values, contacts, job payloads, breadcrumbs, users, SDK context and connection details are omitted rather than relying on pattern-based redaction. Diagnostic scope is event category, route, status and correlation metadata.
- Errors in HTTP handling, queue/worker operation, startup and fatal processes are reported. Cleanup hooks all run even if one throws; cleanup failures are captured before the two-second telemetry close/flush. Worker shutdown flushes in `finally`.
- The smoke command emits `telemetry.test`; local HTTP acceptance exits 0, rejected ingestion/network failure exits nonzero. Delivery failures remain visible in local logs without raw endpoint/error details. Acceptance by an ingestion endpoint does not prove alert receipt.

## Verification

Node 24.18.0, pnpm 11.20.0, Redis 8.10.3 on isolated loopback port 16379. Sentry tests use a real Node SDK and a local HTTP receiver; no project or third-party account is contacted.

| Command | Result |
|---|---|
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | Pass |
| `pnpm test:unit` | 109 pass: API 61, web 27, UI 12, contracts 7, SDK 2 |
| `pnpm build`, `pnpm contract:check` | Pass; public API contracts unchanged |
| `REDIS_URL=redis://127.0.0.1:16379 pnpm --filter @evone/api exec vitest run --config vitest.integration.config.ts test/queue.integration.test.ts` | 5 pass; existing retries, terminal failures, validation, readiness and drain behavior retained |
| `REDIS_URL=redis://127.0.0.1:16379 pnpm --filter @evone/api exec vitest run --config vitest.e2e.config.ts test/worker.e2e.test.ts` | 2 pass; real built worker processes job and stops, invalid config stays private |
| `pnpm --filter @evone/api exec vitest run --config vitest.e2e.config.ts test/telemetry.e2e.test.ts` | 6 pass; fatal exception/rejection privacy and exit 1, missing DSN refusal, smoke HTTP 200/403 outcomes and bounded shutdown when ingestion hangs |
| `DATABASE_URL=postgresql://evone:unused@127.0.0.1:1/evone REDIS_URL=redis://127.0.0.1:16379 pnpm --filter @evone/api exec vitest run --config vitest.e2e.config.ts test/server.e2e.test.ts -t 'Redis down\|refuses to start\|database is unreachable'` | 4 pass; one DB-success test excluded because PostgreSQL unavailable |
| `git diff --check` | Pass |

Unit regressions cover log/event allowlists, concurrent request correlation, request-secret omission, invalid DSNs, real SDK transport acceptance, HTTP rejection and network-refusal detection, environment preservation and cleanup-failure capture before flush. Review found transport-flush vs acceptance and environment/shutdown ordering issues; all corrected and reviewed again.

## Remaining acceptance and limits

- **EV-019 is not complete:** no real Sentry project, stored issue, alert rule/destination or actual alert delivery confirmed. Configure securely and follow `PROJECT_SETUP.md` before checking it off. No credentials are needed in chat.
- New changes have not run hosted CI. Full database/browser suites were not rerun locally: Docker/PostgreSQL unavailable. Existing EV-014 CI passes, but it does not validate these changes.
- No UI changes; viewport/theme/focus checks do not apply. No browser telemetry, distributed tracing/replay, PII collection, infrastructure deployment or business alert policies added.
- Privacy intentionally removes raw exception text/stacks and automatic SDK context. Diagnosis relies on fixed error categories, matched route, request/event IDs, status and timing. Auth user/role fields wait for EV-016/EV-017.
- `SENTRY_DSN` absent disables reporting; logger still works. HTTP DSNs restricted to loopback are test-only. The worker/API keep serving during telemetry outages; a delivery-failure log requires operator observation until alerting is configured.
- Branch is stacked on the unmerged EV-014 branch; it must be rebased onto main after PR #5 merges before a standalone main-targeted PR.

## Changed files

- New `apps/api/src/observability/{config,telemetry,http,fatal,smoke}.ts`, privacy/correlation unit tests and `apps/api/test/telemetry.e2e.test.ts`.
- API config/createApp/exception filter/main/AppModule, worker entry/queue log events, API/worker process expectations.
- API scripts/dependency, lockfile, private env examples and Turbo development environment forwarding.
- `TASKS.md`, `README.md`, `PROJECT_SETUP.md`, notifications/observability engineering doc and this evidence file.

## Rollback

Revert EV-019 as a unit; no migrations or public API contract changes. Unset `SENTRY_DSN` to disable reporting immediately. Keep EV-014 Redis/worker setup intact.
