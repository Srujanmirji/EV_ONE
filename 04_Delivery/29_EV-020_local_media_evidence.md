# EV-020 — Local private media foundation

Status: **in progress**, 2026-11-04. Owner confirmed “No bucket yet; implement and test locally”. EV-012 is complete; local identity/RBAC has passed hosted CI, while real Clerk acceptance remains pending. Production auth/media are disabled. No Cloudflare resources or real credentials were created or used.

## Implemented scope

- Strict, authenticated `/media/presign`, `/media/{id}/complete` and `/media/{id}/read-url`, with shared Zod/OpenAPI/generated SDK and one concrete HTTP request per documented response.
- Default-disabled configuration; enabled mode refuses production/non-loopback API binds and requires local Clerk. Pinned AWS SDK S3 SigV4 implementation, explicit API Sharp dependency reusing the already installed version. R2/local origins only; credentials and signed URLs never enter telemetry.
- ACTIVE database user plus active/unexpired global USER or ADMIN grant, issuer+subject lookup and owner checks on every operation. No cross-owner ADMIN privilege, JWT role trust, dealer-to-personal-media inference, caller object key, filename or remote-fetch URL.
- Five-minute PUT capability for a server-owned private quarantine key, signed content type and exact byte length. Actual fetched object metadata/body length are checked again with a bounded stream and timeout.
- JPEG/PNG/WebP only, 1–5242880 bytes, matching magic/decoded format, 16-million-pixel decode limit, reject animation, decoder warning/error rejection, rotate/resize to at most 1200×1200 WebP and discard metadata. Synthetic images only. This is image validation/re-encoding, **not malware-scan certification**.
- MediaAsset PENDING/READY/REJECTED state, restrictive owner FK and SQL type/size/ready-key checks. Asset changes and immutable action audit append commit together; every action records the media resource UUID. Failed audit releases no capability response.
- Row-locked completion, unique per-attempt output keys and signing only the winning committed key. A delayed write after transaction expiration can leave a private orphan but cannot overwrite another completion's object. READY retries do not consume replacement uploads. Invalid objects become REJECTED, transient storage failures leave PENDING, cross-owner and missing IDs return identical 404s.
- Private read URLs last 60 seconds, with WebP content type/private no-store. Original deletion is attempted after commit; failure emits only a fixed event. URLs already issued remain bearer capabilities until expiry. Replayed PUTs can recreate quarantine objects until expiry.
- Migration up/down; development rollback refuses to erase media audit evidence. No existing catalogue/media is published/backfilled, no UI added, no new service or worker introduced.

## Verification

Commands run from repository root unless noted:

| Command | Result |
|---|---|
| `pnpm --filter @evone/db generate` | Prisma client generated |
| `pnpm --filter @evone/contracts build` then `pnpm --filter @evone/contracts contract:generate` and `pnpm --filter @evone/sdk contract:generate` | OpenAPI and SDK regenerated together |
| `pnpm --filter @evone/api test:unit` | 147 pass, including bounded validator, config restrictions, no URL on audit failure, owner isolation and delayed transaction/orphan-key regression |
| `node /tmp/ev020-pglite-api.mjs` | Five API/Prisma/Nest integration tests pass using local S3 HTTP fixture; one native concurrency test excluded from this serialized adapter run |
| `node /tmp/ev020-pglite-contract.mjs` | 19 pass: all 17 new media response cases plus exact-route/concrete-request coverage; 23 unrelated cases excluded |
| `node /tmp/ev020-sql-smoke.mjs` | 12 supplemental assertions pass: up/down/reapply, type/size/FK/READY constraints, immutable target and rollback refusal preserving evidence |
| `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm format:check` | All pass |
| `pnpm test:unit` | 275 pass across workspace |
| `node /tmp/ev020-pglite-process.mjs` | 16 process checks pass against a temporary PGlite socket and disposable local Redis |
| `pnpm verify:gates` | All quality gates reject deliberately invalid input |

The temporary harnesses reuse installed PGlite 0.4.3/socket dependencies, add no repository dependency and do not certify native PostgreSQL/PostGIS, drift or concurrency. The initial full contract run on this stand-in had 35 passes/7 failures (catalogue read cases returned 500); it is not accepted as a full contract pass. An initial concurrent completion attempt on the serialized socket returned one 503 and one 200; the source concurrency test remains unchanged in the normal native CI suite, and the temporary focused harness explicitly excludes it. Five media integration tests and all 17 media contract responses pass on fresh stand-in instances. Native CI must establish the full result. The first plain `pnpm --filter @evone/api test:e2e` invocation could not start the server/worker suites because DATABASE_URL/REDIS_URL were absent (six telemetry checks passed); the temporary process harness supplied isolated dependencies and all 16 passed.

Database tests additionally cover invalid type/size/owner, ready-key state, asset rollback on audit failure and immutable missing-resource target. The standard PostgreSQL CI runs them alongside both concurrent completion requests and the full contract suite.

## Review and limits

Code/security, TypeScript and database reviews were requested under the requesting-code-review skill. Fixed findings: malformed URL refinement now returns a safe configuration error; audit carries the media UUID; each attempt writes a unique output key rather than a shared key. No frontend was changed, so visual/mobile/focus checks do not apply to this backend slice.

Before completion: pass native PostgreSQL migration/drift/rollback/concurrency/full integration CI; create an owner-approved private development bucket; confirm public access is off, bucket-scoped credentials, real SigV4 type/length/expiry enforcement and browser CORS; establish quarantine lifecycle/orphan cleanup; complete live auth/RBAC acceptance. Re-encoding does not replace a future scanning policy/provider. Production enablement, public gallery/listing attachment, upload UI, quotas and background processing are outside this local slice. Processing currently holds a row lock during bounded I/O; upgrade to a worker before production volume. Progress remains 16/87 complete.
