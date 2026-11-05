# EV-022 — Local catalogue editor and review workflow

Status: **in progress**, local implementation verified 2026-11-05. The owner approved “Proceed with local-only EV-022 exception”. Production auth remains disabled; no live Clerk application exists and no production rollout is implied. Completed task count remains **16/87**.

## Working scope and boundaries

The development-only `/admin/catalogue` workspace creates new catalogue entries. An ACTIVE database EDITOR/ADMIN saves its own draft and submits the saved revision. A different ADMIN reviews citations and either requests changes with a reason or atomically publishes the brand/model/variants/spec sources as demo data. Existing published models are not edited. Availability/date remain UNKNOWN/null because this slice does not collect model-level provenance. No media, prices, role provisioning, CMS service or new project dependency is added.

Draft documents stay separate from public catalogue rows. Save, submit and review use row locks and optimistic revisions; stale actions return 409. Rejected drafts can be edited/resubmitted; submitted drafts cannot change underneath review. Published snapshots are immutable. Approval uses existing deferred provenance/publish guards and commits catalogue rows, the snapshot transition and immutable resource-specific audit together. A uniqueness race retries once to record its conflict denial; persistent DB conflicts fail closed. Last actor account UUID and timestamp are shown without copying provider identities or PII into the UI/audit.

The API checks issuer/subject mappings and active, unexpired GLOBAL EDITOR/ADMIN grants on every operation. Users/dealer grants do not authorize catalogue work. Editors cannot read another editor’s drafts; missing/inaccessible drafts share 404. Admins can read all drafts but cannot edit another owner’s content or approve their own draft. Caller reviewer identities/timestamps and token role claims are not trusted. Citation wording, source kind and credential-free HTTPS URL are entered explicitly; the approving admin supplies the attestation, while reviewer/time are server-generated.

## Files and contracts

- `apps/api/src/catalogue/catalogue-editor.{controller,service}.ts` and existing module wiring: list/create/read/save/submit/review, authorization, safe conflicts and atomic publication. Fixed `catalogue.editor_failed` telemetry carries request ID only.
- `packages/contracts/src/catalogue-editor.ts`, route registry/index, generated `openapi.json` and SDK: strict document/request/view schemas; every documented response has a concrete HTTP request. Numeric SQL bounds, unique variant slugs, citation coverage, review attestation and rejection reason are enforced.
- `packages/db/prisma/schema.prisma` and `20261104100000_catalogue_drafts`: JSON draft/review state; restrictive owner/reviewer/model FKs and indexes; state CHECK; immutable published UPDATE/DELETE and no-TRUNCATE protections. Development rollback refuses to erase used catalogue evidence.
- `apps/web/app/admin/catalogue`, `components/catalogue-editor`, `lib/catalogue-editor`: existing EVONE components/tokens, local Clerk wrapper, bounded same-origin web gateway to a fixed loopback API, forms, queue and review. `CATALOGUE_EDITOR_ENABLED` defaults off; production page/gateway return 404. The API independently inherits disabled-by-default local authentication and production startup refusal.
- New contract/API/DB/UI/gateway/browser tests and synthetic fixtures; web Vitest resolves its existing `@/` alias. Setup/API/database/task/decision docs are updated. EV-020’s prior passing hosted CI is reconciled without marking it complete.

## Verification

Commands run from the repository root:

| Command | Result |
|---|---|
| `pnpm --filter @evone/db generate` | Prisma client generated |
| `pnpm --filter @evone/contracts build`, contracts `contract:generate`, SDK `contract:generate` | OpenAPI and SDK regenerated together |
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | All pass |
| `pnpm test:unit` | **292 pass**: API 150, contracts 33, web 95, UI 12, SDK 2 |
| `node /tmp/ev022-native.mjs all` | **159 integration checks pass**: DB 36 and API/queue 123; includes all 37 new endpoint/status cases, six workflow cases, concurrency and three DB cases |
| `node /tmp/ev022-native.mjs sql` | **Five checks pass**: system-catalog-equal down/reapply, non-spatial Prisma drift, rollback refusal after evidence and retained audit evidence |
| `node /tmp/ev022-native.mjs e2e` | **16 process and 220 production browser checks pass**, four expected browser skips; includes editor/gateway production refusal at all four widths |
| `node /tmp/ev022-native.mjs browser` | **17 checks pass** through the real React workspace → signed synthetic JWT → real API/native DB, four widths, axe, keyboard, reduced motion, unpublished-before/published-after approval and rejection-field Enter safety |
| `pnpm verify:gates` | All gates reject deliberately invalid input |
| Impeccable manual detector | No findings (`[]`); visual and keyboard inspection performed separately |

Temporary tooling installed `embedded-postgres@18.6.0-beta.19` under `/tmp`; its native binary reports **PostgreSQL 18.6**. Clusters use disposable directories and loopback bindings and are stopped/removed by the harness. Redis is likewise a disposable loopback process. This is not a repository dependency, new deployed service or provider resource. All non-spatial migrations are applied; the installed binary has no PostGIS extension, so hosted PostgreSQL 17/PostGIS CI and the normal full migration engine remain required. The non-spatial drift target differs only by omitting the PostGIS extension declaration.

The first full E2E attempt omitted the standard fictional demo seed and failed four catalogue-card cases (196 passed, 20 not run, four expected skips). After using the repository’s existing `seedDemoCatalogue` on the fresh cluster, the unchanged suite passed 220 checks. Tests were not weakened. Early temporary browser-harness setup errors (CSS alias and axe context) were fixed before accepting its result.

The isolated browser fixture imports the real workspace and uses ephemeral signed synthetic identities against the unchanged API guard. It does not add an authentication bypass or fixture route to application code. It tests the editing/reviewing journey; gateway restrictions and session configuration have separate unit tests. It **does not establish real Clerk sign-in, cookies, token-template behaviour or logout/session switching**.

## UI polish and review

The established Manrope/Inter, pearl/white/ink system is retained. No new theme or decorative animation is added. Forms preserve failed input, mark field errors and focus the summary; canonical saved revisions replace inputs on accepted reload/discard. Submission requires a saved revision; review attestation/reason reset when changing drafts. Links to validated citations stay keyboard-accessible for reviewers. Save/transition success receives focus, list refresh failures distinguish already-recorded changes, and variant removal warns before discarding fields.

Required Impeccable polish and the frontend-ui restraint pass checked 375/768/1280/1920, keyboard-visible focus, source access, responsive overflow and reduced motion. Axe WCAG 2.2 AA scans pass in the exercised editor/review/publication states. The product has one light theme. Extra disabled-field opacity was removed so review content retains the established contrast. Enter in the rejection field cannot implicitly activate the first approval button; both UI regression and real-browser checks cover it.

Review fixes: FK indexes, audited concurrent publication conflicts, draft/review form remounting, keyboard source links and rejection-field Enter handling. Security/code, database, TypeScript and React reviews have no remaining actionable findings. Database-owner DDL remains an operational trust boundary, as in the existing audit foundation.

Screenshots contain only fictional data:

- [Desktop editor](evidence/EV-022/desktop-editor.png)
- [Mobile editor](evidence/EV-022/mobile-editor.png)
- [Desktop review](evidence/EV-022/desktop-review.png)
- [Mobile review](evidence/EV-022/mobile-review.png)

## Remaining acceptance

Run hosted PostgreSQL 17/PostGIS migration/rollback/drift and full CI after committing/pushing. Verify the real development Clerk sign-in/template/claims/cookies/session flow using separate approved editor/admin identities, including revocation and session switching. No project is configured and no credentials were requested. Production auth stays disabled. Existing published-model editing, model-level availability/date provenance and public production rollout are outside this new-entry local slice. EV-022 remains in progress until remaining acceptance is verified.
