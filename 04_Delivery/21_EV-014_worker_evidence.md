# EV-014 — Redis and BullMQ worker evidence

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Status: EV-014 complete.

**Done when:** a queued test event is handled, with retries. Proven against a real Redis locally and in CI, and by running the built worker process.

## What was built

- **Redis 7.4:** `redis:7.4-alpine` in `infra/docker/docker-compose.yml` (AOF on, `noeviction`) and as a CI service; `REDIS_URL` added to the env examples.
- **`packages/queue`:**
  - versioned event schemas (`system.ping.v1`);
  - `createRedisConnection` (`maxRetriesPerRequest: null`, as BullMQ workers require);
  - `createProducer`, which validates the payload and the event key (no `:`, at most 128 characters) and uses the key as the job id.
  - **Default job policy:** 5 attempts, exponential backoff starting at 1 s, completed jobs trimmed, failed jobs kept.
- **`apps/worker`:**
  - validated config, with `REDIS_URL` never echoed;
  - a BullMQ worker where unknown events and invalid payloads raise `UnrecoverableError` (no retries) and handler errors retry;
  - after the last attempt, or on rejection, `job.dead_letter` is logged with name, id, attempts and reason but no payload or error message, and the `onDeadLetter` hook is called (operator alerting attaches in EV-019);
  - JSON log lines;
  - `/health/live` and `/health/ready` (Redis ping with timeout, worker running, not draining);
  - SIGTERM drains health, waits for the job in progress, closes Redis and exits 0;
  - one production handler: the `system.ping.v1` heartbeat, which stores the last ping time.

## Deliberately not built

**The database outbox** (`notification_outbox`, 03_Engineering/06) has no producer yet. It should arrive with the first business event, which writes the outbox row in the same transaction. Building it now would be speculative. This is recorded in the observability doc.

## Tests

| Suite | Result | Covers |
|---|---|---|
| `apps/worker` unit | 4/4 | Config defaults, TLS URL, rejection without echo, concurrency bounds; JSON log line shape |
| `apps/worker` integration (real Redis, unique prefix per test) | 9/9 | Handled once; **retried twice then succeeded** (`attemptsMade` 3, two `job.retrying` logs, no dead letter); **dead-lettered after 3 attempts** with no payload in logs; invalid payload rejected on the first attempt; duplicate key runs once; producer validation; graceful close waits for the active job; production heartbeat; health 200 → 503 when draining |
| `apps/worker` e2e (built `dist/main.js`) | 2/2 | Starts, becomes ready, consumes a real ping, `job.completed` for that key, SIGTERM exits 0 with `worker.stopped`, payload absent from output; invalid `REDIS_URL` exits 1 without echoing the password |

**Mutation checks**, each restored afterwards:
- retrying invalid payloads fails "rejects an invalid payload immediately";
- skipping the dead-letter hook fails the dead-letter and rejection tests;
- dropping the job-id idempotency key fails 5 tests, including "runs an event key once".

## Verification

Local runs used Node 24.18.0 and pnpm 11.20.0, with Redis 7.0.15 from Ubuntu packages (Docker Hub returned 429 to this container; CI uses the official 7.4 image).

| Command | Actual result |
|---|---|
| `pnpm format:check`, `lint`, `typecheck`, `build`, `contract:check` | Pass |
| `pnpm verify:gates` | 23/23 probes rejected (now including @evone/queue and @evone/worker) |
| `pnpm test:unit`, `test:integration`, `test:e2e` | All pass; worker 4 + 9 + 2, web e2e 192 |

[Hosted Foundation checks run 41691256142](https://github.com/Srujanmirji/EV_ONE/actions/runs/41691256142) (commit `de2f8d4`) passed on Ubuntu with the Redis 7.4 and PostGIS services, including "Prove catalogue rules, API contract and queue retries against PostgreSQL and Redis" and `pnpm test:e2e` (the worker process suite).

## Incident during this task

**A Redis snapshot was committed.** `dump.rdb` (local test queue data only, no personal data) was committed in `de2f8d4`, because the local `redis-server` had been started with the repository as its working directory. It was removed in `1dd5b93`, `*.rdb` is now in `.gitignore`, and local Redis was restarted with its data directory in the scratchpad. The file remains in the history of `de2f8d4`; rewriting history was not done.

## Remaining gaps

- **Alerting on dead letters** waits for EV-019 (Sentry/PagerDuty account).
- **The API does not enqueue anything yet,** and its readiness check does not include Redis. Add both with the first API-produced event.
- **The production Redis host** (Railway) is not yet provisioned; the worker needs `REDIS_URL` plus `WORKER_HEALTH_HOST=0.0.0.0` and `WORKER_HEALTH_PORT` there.

## Rollback

Revert the EV-014 commits and remove the `redis` service. No database change.
