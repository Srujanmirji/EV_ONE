# EV-012 — NestJS API and health endpoints evidence

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Status: EV-012 complete.

**Done when:** startup config, liveness and readiness tests pass.

## Scope

ADR-001 approves NestJS. This task adds `apps/api` with configuration, two health endpoints and the shared plumbing they need: response envelopes, request IDs and an error filter. It adds no domain modules, database, Redis, auth or logging pipeline. Those are EV-013, EV-014, EV-016 and EV-019.

## Changed files

- API: `apps/api/package.json`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.e2e.config.ts`, `.env.example`.
- Source: `src/main.ts`, `src/create-app.ts`, `src/app.module.ts`, `src/config/{env,config.token}.ts`, `src/common/{envelope,request-id,http-exception.filter}.ts`, `src/health/{readiness,health.service,health.controller,health.module}.ts`.
- Tests: `src/config/env.test.ts`, `src/health/health.test.ts`, `test/server.e2e.test.ts`.
- Workspace: `pnpm-workspace.yaml` (`allowBuilds`), `pnpm-lock.yaml`, `turbo.json` (`dist/**` output), `.prettierignore`, `scripts/verify-quality-gates.mjs` (API probes).
- Documentation: `README.md`, `PROJECT_SETUP.md`, `TASKS.md`, this record.

## Pinned stack

NestJS 12.3.2 (`@nestjs/common`, `core`, `platform-express`); reflect-metadata 0.2.2; RxJS 7.8.2; Zod 4.6.7; TypeScript 6.0.3; Vitest 5.0.5 with unplugin-swc 2.0.0 and @swc/core 1.16.21; @swc-node/register 1.12.1 for `pnpm dev`; typescript-eslint 8.72.1.

NestJS 12 is ESM-only, so the API is an ESM package (`"type": "module"`, `nodenext`). Express is the HTTP adapter.

## Behaviour

| Endpoint | Healthy | Unhealthy |
|---|---|---|
| `GET /api/v1/health/live` | 200 `{data:{status:"ok"}, meta:{requestId}}` | — (no dependencies checked) |
| `GET /api/v1/health/ready` | 200 `status:"ready"` with per-check `up`/`down` | 503 `status:"not_ready"` when a check fails, exceeds `API_READINESS_TIMEOUT_MS`, or shutdown has begun |

- Readiness failures report only check names and up/down; error messages, hosts and ports never reach the response.
- `X-Request-ID` is accepted only as a UUID, otherwise replaced. It is returned as a header and in `meta.requestId`.
- Every error uses the contract envelope. Messages from 5xx errors are replaced with generic text.
- `Cache-Control: no-store` is set on probes, and `X-Powered-By` is removed.
- Invalid config exits with code 1. The output names the variable and rule but never prints the value.
- SIGTERM marks the API not ready, closes the server, then logs `Stopped gracefully on SIGTERM`.

Lint caught a real defect before commit. The readiness service called each check as a detached function, so class-based checks lost `this`. A future Postgres check would always have reported down. It is fixed, and a regression test covers it.

## Verification

Local runs used Node 24.18.0 and pnpm 11.20.0 on Linux.

| Command / check | Actual result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | Pass for web and API |
| `pnpm test:unit` | API 18/18 (config 9, HTTP 9); web 3/3 |
| `pnpm build` | Pass; API emits `dist/` |
| `pnpm test:e2e` | API 2/2 against `dist/main.js` (start + live + ready + graceful SIGTERM; invalid config refused without echoing value); web 8/8 |
| `pnpm verify:gates` | All 7 probes rejected (format; typecheck, lint, unit for web and API) |
| `pnpm --filter @evone/api dev` smoke | `/health/ready` 200; unknown route 404 in error envelope with `X-Request-ID` |

Hosted Foundation checks [run 41657126777](https://github.com/Srujanmirji/EV_ONE/actions/runs/41657126777) (commit `8e10e2e`) and [run 41657203342](https://github.com/Srujanmirji/EV_ONE/actions/runs/41657203342) (commit `7f0b481`) passed on Ubuntu.

## Remaining gaps

- No CORS, rate limiting or security headers middleware. Add them when the first browser-facing endpoint lands, not on probes.
- Logging is NestJS's default console logger. Structured logs, PII redaction and Sentry are EV-019.
- Readiness has no dependency checks yet. EV-013 and EV-014 must register Postgres and Redis checks.
- No OpenAPI output. Envelope types are local to the API until EV-018 moves them to `packages/contracts`.
- Not deployed. The Railway health-check configuration belongs to the deployment tasks.

## Rollback

Remove `apps/api` and revert the workspace edits. No deployment, migration or external data change occurred.
