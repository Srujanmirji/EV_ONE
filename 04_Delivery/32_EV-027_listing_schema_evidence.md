# EV-027 — Local listing, media and review schema

Status: **in progress**, 2026-11-05. The owner explicitly approved “Proceed with local-only EV-027 exception”. Production auth remains disabled; no public listing API/UI, real object integration, vehicle checkout or completion claim is introduced. Completed task count remains **16/87**.

## Scope and changed files

- `packages/db/prisma/schema.prisma`: Listing, ListingMedia, ListingReview and ListingHistory plus reverse relations to app users, canonical variants and existing private MediaAsset records. UUID identities/FKs, integer INR paise, status/version and indexed owner/variant/state/price/city/reference reads. No new dependency or service.
- `20261105050000_listing_foundation/migration.sql`: numeric/state/demo checks; transaction-context/global-role ownership guards; completeness/publish locking; media linkage/freeze; immutable separate reviews and generated history; atomic review/media version transitions.
- Reviewed `down.sql`: restores the earlier schema only while empty; refuses after listing/review/history use. No existing catalogue/auth/media row is backfilled, modified or deleted.
- `packages/db/test/listings.integration.test.ts`: 16 native database cases with synthetic users/catalogue/media metadata. Every attempted destructive review/history probe is enclosed in a transaction that always rolls back, including if its protection regresses.
- Database/domain/API/setup/task/decision docs describe the boundary; EV-022’s now-passing hosted CI is reconciled. No runtime OpenAPI/SDK route, frontend, CSS or auth configuration changed.

## Enforced behaviour

Partial owned DRAFT records are allowed. SQL rejects negative/zero prices, negative odometer, invalid slug/ownership/year/city values and non-demo listings. Submission/approval requires full vehicle data, an ACTIVE seller, a published canonical variant/model/brand and at least one READY same-owner image. Parent/variant FKs retain references; canonical share locks serialize validation against archival and a reverse guard protects published listings.

Trusted server writers must first resolve a cryptographically verified issuer/subject to the app user. They then set `evone.actor_id` and `evone.request_id` via parameterized `set_config(..., true)` inside a transaction. Guards recheck ACTIVE user and active/unexpired GLOBAL grants: USER/ADMIN for own mutations, MODERATOR/ADMIN for a different seller’s review. Cross-owner mutations, editor/dealer-only grants, missing context, expired/revoked grants and suspended actors are refused. The settings themselves are **not** identity verification or RLS; database credentials and owner-controlled DDL remain an operational trust boundary. No public writer exists yet.

The lifecycle follows the domain contract: DRAFT→PENDING_REVIEW→PUBLISHED/REJECTED; REJECTED→DRAFT; PUBLISHED→ARCHIVED/SOLD/PENDING_REVIEW; ARCHIVED→DRAFT. SOLD is terminal. Ordinary updates increment exactly once and future callers must match/lock the expected revision. Submitted rows are frozen. Sensitive published field edits unpublish into review; archiving/selling cannot smuggle content edits. Photo changes require owner archive/relist before editing.

Media links accept READY assets owned by the listing seller, unique asset/position, positions 0–11 and nonempty alt text. Attach/remove/reorder increments the parent revision and history in the same transaction. Linked owner/status/object key cannot change while attached. Metadata fixtures do not claim live uploaded objects or image/owner licensing acceptance.

Review inserts require the current submitted version, another ACTIVE moderator/admin and the same request context; rejection needs at least ten characters. They copy the server’s current redacted snapshot and atomically apply the decision/version/history. Direct publish without a matching review is refused. Review UPDATE/DELETE/TRUNCATE is refused; approval creates no inspection/battery/verified-dealer claim.

History records actor/request, every version/state and generated before/after snapshots. Only opaque IDs and numeric/state facts are copied; bigint prices remain exact strings. City, condition notes, alt text, arbitrary JSON and storage URLs are excluded. Its INSERT guard checks current actor/request/version and regenerates snapshots, preventing forged future versions from occupying the unique key. UPDATE/DELETE/TRUNCATE is refused. History failure rolls back its listing write. Listings cannot be hard-deleted through ordinary DML.

Dealer organisations/membership are not invented: this local foundation supports individual owners and refuses dealer-only grants. Those relations/policies remain EV-036/EV-066. Public reads later must also hide inactive sellers. API writers later must separately audit denied requests; a refused SQL transaction cannot retain its own denial row.

## Verification

Commands from repository root:

| Command | Result |
|---|---|
| `pnpm --filter @evone/db generate` | Generated Prisma client |
| `pnpm --filter @evone/db typecheck` and DB lint | Pass |
| `node /tmp/ev027-native.mjs all` | **175 full integration checks pass**: DB 52 + API/queue 123 |
| `node /tmp/ev027-native.mjs sql` | **Five migration checks pass**: catalog-equal down/reapply, non-spatial Prisma drift, used-evidence rollback refusal and retained history |
| `pnpm format:check`, `git diff --check` | Pass |
| `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm build` | Pass; **292 unit tests**; unchanged work may use Turbo’s valid cache |

Native cases cover context reset, partial drafts, cross-owner/identity changes, invalid values/demo flag, completeness, canonical publication, pending/foreign/duplicate media, parent history snapshots, linked-asset freeze, owner/moderator separation, rejection/resubmission, sensitive edit unpublishing, stale/concurrent review, immutable evidence, rollback on history failure, expired/revoked/suspended actors, forged history and both coordinated archival/approval race orders. SQLSTATE 40001 is asserted at Prisma’s mapped P2034 boundary.

Initial development run: 11/12 cases passed; its stale-version assertion expected the raw SQL message, while Prisma correctly returned P2034. The assertion was corrected to the exact driver conflict code. Security/database review identified an archival/approval race and a direct-history INSERT gap; locks/revalidation, generated-history validation and coordinated regressions fix both. No test was weakened to conceal a source failure.

The temporary harness reuses `/tmp` native PostgreSQL tooling installed for EV-022 (`embedded-postgres@18.6.0-beta.19`, binary reports PostgreSQL 18.6), disposable loopback clusters and Redis. No repository/runtime dependency or provider resource is added. All non-spatial migrations run; the temporary drift target omits only the unavailable PostGIS extension declaration. Native PostgreSQL 17/PostGIS and normal full migration-engine checks still belong to hosted CI. Context and SQL behaviour are not mocked, but these tests do not prove live Clerk identity propagation through future listing endpoints.

Security/code, database and TypeScript reviews report no remaining important findings. No UI was changed, so mobile/visual/keyboard/theme checks do not apply to this schema-only task. Existing API integration and contracts pass; browser suites were not repeated for this change.

## Remaining acceptance

Run hosted PostgreSQL 17/PostGIS migration/drift/rollback and full CI after commit/push. Complete the shared live auth/RBAC acceptance; keep production auth disabled. Add the separately tasked authenticated writer/read/moderation flows and their identity propagation/denial auditing before a public marketplace exists. Live storage, media/public access licensing, dealer membership, badge evidence, buyer enquiries and launch inventory permissions remain separate work. EV-027 stays in progress.
