# EV-017 — Local scoped authorization and audit evidence

Date: 2026-11-04. Branch: `codex/EV-017-local-rbac-audit`, based on EV-016 commit `3a3bc1c`. Status: local foundation implemented; **EV-017 remains in progress**. Production auth is disabled. Native PostgreSQL/PostGIS migration, drift/rollback, full integration CI and live provider acceptance remain pending.

## Authorized scope

The owner explicitly approved: “Proceed with local-only EV-017, keep production auth disabled and live acceptance pending”. The dependency exception is recorded in `TASKS.md` and `06_Reference/02_decision_register.md`. It does not authorize subsequent task exceptions, production enablement or real account onboarding.

The change reaches the existing identity module/guards, shared API contracts/OpenAPI/SDK, Prisma schema/new up/down migration, unit/HTTP/database integration tests and setup/spec/progress docs. No frontend, new service or runtime dependency is added.

## Implemented policy

| Scope read | Required database grant | Boundary |
|---|---|---|
| Account | Active global USER or ADMIN | Exact mapped user's own UUID, including canonical-equivalent uppercase UUID paths |
| Dealer | Active DEALER_STAFF or DEALER_OWNER | Exact granted dealer scope UUID |

No ADMIN wildcard, client-supplied owner, token role or organization metadata grants access. Unknown/suspended users, missing/inactive/expired grants and scope mismatches are denied. EDITOR/MODERATOR and business mutations have no new permissions. These are scope-read probes; future domain actions need their own permission/ownership policies.

Minimal `users` map issuer + provider subject to an internal UUID and default to SUSPENDED. No provisioning/grant-management endpoint exists. Dealer scope UUIDs do not represent approved dealer profiles or implement EV-066 membership lifecycle. No existing catalogue data is changed/backfilled; reviewer FK reconciliation remains with editor/provisioning work.

`GET /api/v1/auth/access/{scope}/{scopeId}` composes the existing Clerk guard with the new permission guard. Success returns only `{ data: { authorized: true }, meta }`. Authentication failure is 401, malformed scope/UUID is 400, denied authorization is generic 403, and storage failure is generic 500. No identity/grants/audit data is returned. No-store applies through the authentication guard. Production's disabled auth denies before any authorization DB access.

The authorization service reads the app-owned identity and active/unexpired grants and appends an allow/deny decision in one RepeatableRead transaction. It returns only after the audit write succeeds; the guard throws a denial after the denial transaction commits. There is no permission cache. Audit storage failure prevents an allow response. Existing safe HTTP request-ID/route/status telemetry supplies monitoring without private claims.

## Database controls

- A new migration adds users, scoped grants and fixed-shape ACCESS_CHECK audit records; no existing tables or data are altered.
- SQL CHECK constraints enforce global/dealer role/scope combinations and nonempty identity bindings. Two partial unique indexes prevent duplicate global/per-dealer grants; a full user-ID index supports grant queries and FK checks.
- Prisma 7.10.1's `partialIndexes` preview is enabled to represent the indexes in the schema. The pinned CLI validates the model; no ORM upgrade was made. [Official Prisma guidance](https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/indexes).
- Audit rows contain actor UUID (nullable for unknown identities), fixed action, scope UUID, outcome, request UUID and time. No bearer, raw subject, email or arbitrary JSON is copied into evidence.
- UPDATE/DELETE/TRUNCATE triggers protect ordinary audit DML. An audit-only actor deletion test isolates its RESTRICT FK. Database owners/superusers remain a DDL trust boundary; no tamper-proof storage claim is made.
- Reviewed down.sql removes the new tables/types/function for disposable development rollback only. Production must preserve evidence and use a forward repair. The migration verifier's normal catalog/rollback checks remain required.

## Checks and results

| Command/check | Result |
|---|---|
| `pnpm --filter @evone/db exec prisma validate` | Pass on pinned 7.10.1 |
| `prisma migrate diff --from-schema /tmp/ev017-before.prisma --to-schema prisma/schema.prisma --script` | Generated base DDL; normalized CREATE/index/FK statements exactly match the migration before the explicit CHECK/trigger additions |
| `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm build` | Pass across workspace; **263 unit tests** (API135, contracts29, web85, UI12, SDK2), production API/web builds |
| New local service/HTTP checks | 17 pass: scope boundaries, query filters, issuer/subject lookup, allowed/denied audit, audit-failure fail-closed, real SDK path/schema/HTTP pipeline, malformed and unauthenticated requests, uppercase UUIDs |
| OpenAPI/SDK | Regenerated and typed SDK access call passes; new regression verifies both required path parameters |
| `node /tmp/ev017-sql-smoke.mjs` | **14 supplemental SQL assertions pass** on installed PGlite 0.4.3: migration up, defaults, unique/check/FK constraints, immutable UPDATE/DELETE/TRUNCATE, explicit rollback after trigger error, down and reapply |
| `node /tmp/ev017-pglite-api.mjs` | **Six API integration tests pass** through PrismaPg/real Nest/SDK with a fresh PGlite socket instance; actual stored grants, uppercase scopes, role spoofing, revocation/expiry, suspension, audit outcomes and safe failures |
| Native PostgreSQL/PostGIS and full DB integration | Not run locally; Docker and psql unavailable. Required in normal CI |

The supplementary scripts live only in `/tmp` and reuse PGlite/socket dependencies already bundled with Prisma; no test framework or DB service was added to the repository. SQL checks apply **only this new migration** to a fresh in-memory instance; they do not prove the full PostGIS migration chain or Prisma introspection/drift behaviour. The socket backend is a serialized stand-in and does not establish native concurrency semantics.

An exploratory attempt to run the full database authorization suite through that socket adapter produced seven passes and four failures during transaction-error recovery (a missing retained audit row followed by connection failures). The direct SQL trigger/explicit-rollback smoke passed, and the API integration suite passed on a fresh instance. The adapter result is **not** accepted as a pass for the native DB suite, and tests were not weakened for it. Native execution must resolve the remaining verification before task completion.

The normal CI database suite contains 11 new cases for identity/defaults, duplicate grants, invalid scope combinations, audit mutation refusal and FK retention. Destructive audit mutation attempts are enclosed in transactions that always roll back, even if protections regress. The six new API integration cases and four concrete contract status requests run against the normal migrated CI database. Synthetic audit evidence and referenced actors intentionally remain in the disposable test DB.

## Review corrections

- Security/TypeScript review caught case-sensitive UUID comparisons; normalization now occurs once in the shared service and is covered for account/dealer paths in unit, HTTP and DB cases.
- Typecheck exposed a registered path-schema reference that omitted generated parameters. Reused the existing plain path-schema convention and added the OpenAPI/SDK regression.
- Database review requested the full FK/query index and a truly audit-only retention fixture; both were fixed and approved.
- Final security/integration, TypeScript and database reviews found no remaining source-level issues. This does not certify native DB behaviour or production readiness.

## Files, status and remaining limits

New/changed API files are the authorization service, permission guard, controller/module, unit/HTTP/integration tests and concrete contract fixtures. Prisma schema/migration/down.sql and database integration tests implement SQL controls. Shared identity/path/response contracts, route registry, OpenAPI and SDK were updated together. README, API/database/setup docs, task status and decision exceptions describe the scope. EV-016's prior hosted CI evidence was reconciled separately.

No production deployment, real Clerk/web→API flow, native migration/drift/rollback, full database/browser/process regression or new hosted CI was verified for this task. No role lifecycle/provisioning UI, role-management API, audit viewer, grant/status mutation auditing or protected business mutation policy is claimed. Future feature work must add those controls when introducing the corresponding operations.

EV-005, EV-016 and EV-017 stay in progress; completed progress remains **16/87**. No permission is granted to later dependency-blocked tasks. Keep `AUTH_MODE=disabled` for production. Rollback must preserve real audit data; the destructive down migration is for disposable development verification only.
