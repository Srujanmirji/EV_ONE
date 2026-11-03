# EV-014 — Redis/BullMQ worker evidence

Date: 2026-11-04. Branch: `feat/EV-014-redis-worker`. Status: locally complete; hosted CI pending.

**Acceptance:** a queued test event is handled with retries.

## Implementation

- BullMQ 6.5.4 and Redis 8.10.3. Local Compose binds Redis to loopback, persists AOF in a named volume and sets `maxmemory-policy=noeviction`. CI gets a disposable Redis service. Docker Registry confirmed `redis:8.10.3-alpine` exists (manifest HEAD 200).
- The approved separate worker is a NestJS application-context entry at `apps/api/src/worker.ts`, sharing the API build and dependencies. Run `pnpm --filter @evone/api worker:dev` or `worker:start`. No new service beyond the approved API + worker architecture (ADR-001).
- Only `foundation.probe.v1` on `evone-foundation` is implemented. A strict payload accepts one UUID `eventId`; processing returns it without side effects. Unknown job names or invalid payloads fail without retry. No public enqueue endpoint or customer/partner data exists.
- Producers default to three attempts with exponential backoff (100ms base), keeping up to 100 completed/failed probes. Workers reconnect through Redis outages. SIGTERM stops intake and drains active jobs before closing connections.
- API startup requires a private `REDIS_URL`; plain Redis and TLS Redis URLs are validated. Credentials, database number and IPv6 hosts are handled. Invalid values do not reach logs. The worker needs only Redis configuration.
- API liveness stays independent of dependencies. Redis readiness fails immediately before first connection, then checks an actual queue read. Dependency failures return 503 without connection details. Fixed worker connection/failure/completion logs contain no payloads or raw driver errors.
- Existing API config fixtures, built-process readiness expectations, browser API startup environment and Turbo environment forwarding were adapted. Public API schemas/routes and DB migrations did not change.

## Acceptance evidence

Local environment: Node 24.18.0, pnpm 11.20.0, native Redis 8.10.3 on isolated port 16379, loopback-only, no persistence. Test cleanup removes only jobs created by these suites; no Redis flush or DB reset.

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass after explicitly disabling optional `msgpackr-extract` native build; JS fallback used |
| `pnpm format:check` | Pass |
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test:unit` | 96 tests pass: API 48, web 27, UI 12, contracts 7, SDK 2 |
| `pnpm contract:check`, `git diff --check` | Pass; generated contracts/SDK unchanged and no whitespace errors |
| `pnpm build` | Pass, including Next.js production build and separate API/worker entries |
| `REDIS_URL=redis://127.0.0.1:16379 pnpm --filter @evone/api exec vitest run --config vitest.integration.config.ts test/queue.integration.test.ts` | 5 pass: immediate startup-outage readiness failure; transient failure succeeds on attempt 2; persistent failure retained after exactly 3 attempts; malformed event stops after 1 attempt; shutdown waits for active handler |
| `REDIS_URL=redis://127.0.0.1:16379 pnpm --filter @evone/api exec vitest run --config vitest.e2e.config.ts test/worker.e2e.test.ts` | 2 pass: built worker consumes a real queued job and exits gracefully on SIGTERM; malformed config exits 1 without leaking credentials |
| `DATABASE_URL=postgresql://evone:unused@127.0.0.1:1/evone REDIS_URL=redis://127.0.0.1:16379 pnpm --filter @evone/api exec vitest run --config vitest.e2e.config.ts test/server.e2e.test.ts -t 'Redis down\|refuses to start'` | 3 pass, 2 excluded by selection: built API stays live with Redis down and reports 503; missing/invalid config refused |

The first hosted run reached integration tests and exposed one missed `REDIS_URL` in the contract-test config fixture; the fixture was corrected to match the other in-process API tests. Redis integration checks passed in that run; full hosted verification remained pending at this correction.

Review found an IPv6 hostname-bracket bug and malformed-URL refinement exception; both fixed with regression tests. The initial outage integration test also exposed BullMQ's indefinite initial-connect wait; readiness now rejects before starting a Redis command while disconnected.

## Scope and limits

- Docker and PostgreSQL are unavailable on this host: Compose startup, full DB integration, DB-backed API readiness success and full browser regression were not rerun here. CI is configured to run them with Redis but has not run these uncommitted changes. No hosted CI success is claimed for EV-014.
- No UI changes, so mobile visual/focus/theme checks do not apply to this task.
- No production Redis deployment, TLS connection, AOF crash/restart drill or monitoring alert verified. Production provisioning and alerting remain EV-074/EV-019.
- BullMQ's documented limitation: Redis must be reachable at least once before raw producer commands fail fast on subsequent outages. Callers must check readiness before enqueueing; there are no production job producers yet. See [BullMQ fail-fast guidance](https://docs.bullmq.io/patterns/failing-fast-when-redis-is-down) and [connection guidance](https://docs.bullmq.io/guide/connections).
- Failed probes remain in the bounded failed set; no separate DLQ or operator alert integration exists yet. Business jobs still need durable outbox, idempotency and consent/RBAC checks under their own tasks.
- `bullmq@6.5.4` is pinned; pnpm recorded a version-specific release-age exception. Optional `msgpackr-extract` install scripts are disabled explicitly.

## Changed files

- `apps/api/src/queue/{config,foundation,redis.check}.ts`, `config.test.ts`; `apps/api/src/worker.ts`.
- API main/config, configuration/readiness fixtures, `test/queue.integration.test.ts`, `test/worker.e2e.test.ts`, existing API process tests.
- API package/env example, root env example, lockfile/pnpm workspace settings, Turbo environment forwarding, browser API-startup Redis environment.
- Compose and CI Redis services.
- `TASKS.md`, `README.md`, `PROJECT_SETUP.md`, `SYSTEM_DESIGN.md`, ADR-001 implementation note, this evidence file.

## Rollback

Revert EV-014 files and config changes together. No DB schema changes. Stop the worker before removing Redis configuration. Preserve the named Redis volume unless intentionally discarding local probe history.
