# EV-016 — Local API authentication evidence

Date: 2026-11-04. Branch: `codex/EV-016-local-clerk-auth`, based on EV-005 commit `b1e6a47`. Status: local implementation verified; **EV-016 remains in progress**. [PR #12](https://github.com/Srujanmirji/EV_ONE/pull/12), commit `3a3bc1c`, passed [PR CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41774522945) and [push CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41774499776): 245 unit, 65 integration, 16 process and 216 browser checks (four expected skips). Real Clerk integration and production rollout remain unverified.

## Approved scope and dependency exception

The owner explicitly approved proceeding locally while EV-005's live sign-in acceptance remains pending, with production authentication disabled and neither task marked complete prematurely. The exception is recorded in `06_Reference/02_decision_register.md` and `TASKS.md`. It does not authorize EV-017/RBAC or any production integration.

## Implemented boundary

- `AUTH_MODE` defaults to `disabled`. The sole enabled mode is `clerk-local`, accepted only in development/test with loopback API binding, exact HTTPS development Clerk issuer, nonempty audience, exact loopback authorized-party origin and a validated RSA-2048 SPKI public key. Production/non-loopback/invalid-key settings fail startup before listening. No secret key is needed.
- `ClerkGuard` authenticates canonical bearer headers only, rejects duplicates/oversize/malformed values, clears any prior request actor, sets no-store on all outcomes and returns a generic 401 with `WWW-Authenticate: Bearer` on denial. Cookies and query credentials are ignored.
- The actual pinned Clerk SDK checks signatures, issuer, audience, authorized party and time claims. Additional guards require RS256, nonempty/bounded subject, explicit well-formed audience, representable integer NumericDates and direct expiry/future-time comparisons, preserving EV-005's discovered edge-case fixes.
- A successful request receives a frozen server-side actor containing subject and issuer only. No role/permission/profile data is trusted or exposed. No account records, database writes or migrations were added.
- `GET /api/v1/auth/session` is the sole protected probe and returns only `{ data: { authenticated: true }, meta }`. It is distinct from the planned `/me` profile API. Default disabled mode denies every request. Public health/catalogue/calculator routes do not acquire a global guard.
- The shared schema/OpenAPI registry declares the new response and HTTP bearer security requirement; SDK types were regenerated. Database-backed contract fixtures now send concrete authorized 200 and unauthenticated 401 requests.
- Existing HTTP telemetry records safe route/status/request IDs. Its config-key allowlist now includes auth variable **names only**, so startup errors remain diagnosable without values, tokens or identity claims.

The verifier uses a **pinned public key**, not a production JWKS refresh/revocation implementation. Rotation requires updating configuration. Offline tokens can remain valid until expiry after logout. The API owns verification; no web-to-Nest sign-in wiring or resource authorization is claimed.

## Verification

| Command/check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass; existing Clerk backend 3.26.6 version reused for API |
| `pnpm lint`, `pnpm typecheck` | Pass across workspace; one new process-test lint assertion was corrected before the final pass |
| `pnpm test:unit` | **245 pass**: API118, contracts28, web85, UI12, SDK2 |
| `pnpm --filter @evone/api build` | Pass; real built-process checks below use this output |
| `pnpm contract:generate` | Pass, including production API/web builds and generated SDK |
| SHA-256 comparison before/after regeneration | OpenAPI JSON and SDK schema unchanged on a second generation |
| `DATABASE_URL=postgresql://unused@127.0.0.1:1/unused pnpm --filter @evone/api exec vitest run --config vitest.e2e.config.ts test/server.e2e.test.ts -t 'local Clerk'` | **Three pass**, five unrelated tests skipped by filter: production mode refused, public bind refused, invalid PEM refused with safe field-name logging |

The new identity suite has 42 cases covering disabled/config boundaries, malformed URLs/keys, valid SDK HTTP requests/request-ID/schema, immutable/minimal actor, no role grant, cookie/query rejection, missing/malformed/oversize tokens, expiry/extreme dates/wrong issuer/audience/authorized party/empty subject, tampering/algorithm/key mismatch, duplicate headers, public endpoints and token/identity log exclusion. One additional telemetry test checks the allowlist and rejects injected `key=value` strings.

Nest HTTP tests use real listeners and the real SDK/verifier with fresh ephemeral RSA keys. A deliberately unused DB object and unreachable dummy DB URL prove these requests do not access persistence. Built-process refusal tests exit before a DB/Redis connection is created. No provider-issued identity is represented by the synthetic fixtures.

Read-only security/integration review found no defects. TypeScript review found the auth config-name telemetry omission; it was fixed and retested. Both reviews approved after the process-test lint fix. No frontend design or component changed, so no new visual polish/browser suite was required.

## Files and documentation

- `apps/api/src/identity/`: local config schema, verifier, request guard, status controller/module and HTTP/security tests.
- API app/config/observability: module registration, validated defaults, safe config-key logging and regression checks.
- `apps/api/test/auth-fixture.ts`, contract integration and built-process tests: synthetic fixtures, authorized contract calls and refusal evidence.
- `packages/contracts` and `packages/sdk`: session envelope, route/security metadata, generated schemas and security test.
- API env example, setup/API docs, README, task checklist, decision register and this evidence. Prior EV-005 CI results also reconciled from PR #11.

## Remaining acceptance and rollback

Docker and `psql` are unavailable on this host. The full migrated PostgreSQL/Redis integration/contract suite and unrelated process/browser suites were not rerun locally; CI must run them. Hosted CI passed after this local snapshot; deployment remains unverified.

A real development instance, actual template claims/SDK sessions, web→API flow, cookie/CSRF behaviour, provider key rotation/revocation and production approval remain pending. EV-005 and EV-016 stay `[~]`; completed progress remains **16/87**. No EV-017 scoped access control is implemented or unlocked by this work.

Rollback: keep `AUTH_MODE=disabled` or revert this task. No persisted data/migration requires recovery; the public read/energy APIs retain their previous behaviour.
