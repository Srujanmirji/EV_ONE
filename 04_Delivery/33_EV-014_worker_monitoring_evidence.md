# EV-014 / EV-019 — Worker monitoring follow-up

Date: 2026-11-05. Branch: `codex/EV-014-EV-019-worker-monitoring`. Owner-authorized adaptation of PR #22; no new task completion claim. EV-019 remains in progress pending live Sentry issue/alert confirmation.

## Behavior

- Reuses the NestJS worker in `apps/api/src/worker.ts`, its build, dependency versions and existing telemetry. No new workspace/service or business producer.
- Worker-only `GET /health/live` and `/health/ready` default to loopback port 4010. Config validates an IP bind and port 0–65535; port 0 selects an ephemeral listener. The actual port is included in the allowlisted `worker.ready` record. API routes/contracts stay unchanged.
- Readiness requires the running, unpaused, non-draining consumer and healthy lifecycle/socket states on both Redis connections, plus a Redis read within two seconds. Status is rechecked after the read. Liveness remains independent. Probe responses contain only status/draining, never driver errors.
- Shutdown marks readiness false before draining, closes the health listener and flushes telemetry.
- Successful probe processing writes an ISO timestamp to `evone:worker:last-probe-at` before completion. This key is outside BullMQ's job namespace; custom job IDs cannot collide with it. No payload or personal data is stored. Failed/invalid handling leaves it unchanged; failed storage follows the existing retry policy.
- Retries emit `worker.job_retrying` warnings. BullMQ's terminal `finishedOn` distinguishes exhaustion/immediate rejection and triggers `worker.job_failed` plus optional Sentry reporting. Three attempts and bounded 100-job retention remain unchanged; no separate DLQ.

## Local verification

Node 24.18.0, pnpm 11.20.0; Redis 8.10.3 on a disposable loopback port, with persistence disabled. No user Redis/database is modified. Real SDK transport tests use a local receiver.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass; existing lockfile and dependencies unchanged |
| `pnpm format:check`, `pnpm contract:check`, `pnpm verify:gates`, `git diff --check` | Pass; generated contracts unchanged; all negative gate probes rejected |
| `pnpm exec turbo run lint typecheck test:unit build` | Pass across all workspace packages; 23 tasks, 302 unit tests (API 160, web 95, contracts 33, UI 12, SDK 2) |
| `REDIS_URL=redis://127.0.0.1:<isolated-port> pnpm --filter @evone/api exec vitest run --config vitest.integration.config.ts test/queue.integration.test.ts` | 7 pass: readiness outage, transient retry, terminal exhaustion, invalid payload rejection, heartbeat persistence/job-ID collision, storage failure recovery/privacy, graceful drain |
| `REDIS_URL=redis://127.0.0.1:<isolated-port> pnpm --filter @evone/api exec vitest run --config vitest.e2e.config.ts test/worker.e2e.test.ts test/telemetry.e2e.test.ts` | 9 pass: built worker health/job/heartbeat/shutdown, startup Redis outage and safe config failure; fatal error/smoke/transport/privacy regressions |

Unit coverage includes paused/stopped/draining states, both Redis sockets reconnecting, a consumer disconnect during the read, rejected/hung reads, unknown paths, no-store headers, private config defaults and invalid input. Real SDK unit tests verify terminal-worker events reach local ingestion. Code and TypeScript reviews approved after fixing consumer readiness and heartbeat/job-key collision issues.

## Changed files and limits

Worker config/foundation/health/startup modules, telemetry event/port allowlist, their tests, API env example, Turbo dev forwarding, README, setup/system/task/decision docs and this evidence. No frontend, database, migration, auth or public contract changes.

A heartbeat records consumed probes, not a periodic timer; operators must enqueue probes and choose a freshness threshold. Readiness does not prove customer-business handlers or heartbeat freshness. Keep the health listener private. Live Sentry project/issue/alert delivery and production deployment remain unverified. Full database/browser tests are delegated to hosted CI; no hosted success is claimed in this local evidence.

## Rollback

Revert this follow-up commit and restart the worker. The timestamp key can remain harmlessly or be removed explicitly; no business data or schema is changed. Original local changes are preserved separately and are not part of this branch.
