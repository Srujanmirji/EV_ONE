# EV-028 — Local sell-your-EV multi-step wizard and listing writer API

Status: **in progress**, 2026-11-15. The owner approved the local-only EV-028 prerequisite exception while EV-027 and EV-020 remain in progress pending live Clerk and R2 bucket acceptance. Production auth and the `/sell` wizard stay disabled in production; no public listing API, moderation queue UI, badge claim or vehicle checkout is enabled. Completed task count remains **16/87**.

## Working scope and boundaries

The development-only `/sell` workspace (`LOCAL_SELL_ENABLED=true` plus the local Clerk development spike configuration) lets an authenticated, ACTIVE individual seller (`GLOBAL` `USER` or `ADMIN` grant) create, autosave, resume, preview and submit private demo EV listing drafts across nine steps:

1. **Vehicle type** (`preferredVehicleType`, stored before a canonical variant is chosen)
2. **Model & variant** (published canonical brand → model → variant picker matching the selected vehicle type)
3. **Year & kilometres** (`year` ≤ next UTC year, nonnegative integer `odometerKm`)
4. **Condition & ownership** (`ownershipCount` 1–50, `conditionNotes` without personal data)
5. **Photos** (1–12 validated private `READY` media assets owned by the seller, with required alt text and private signed preview URLs)
6. **Asking price** (decimal INR input converted losslessly to positive integer `askingPricePaise` string)
7. **Seller & privacy** (city-only location; explicit seller declaration bound to the current saved revision)
8. **Private preview** (owner-only preview labeled `Demo data` with `referrerPolicy="no-referrer"` private image previews)
9. **Submit** (`POST /listings/{id}/submit` transitions `DRAFT` → `PENDING_REVIEW`; never publishes directly)

In production (`NODE_ENV=production` or `LOCAL_SELL_ENABLED` unset), `/sell` renders the honest ComingSoon section page and `/sell/api/*` returns `404` with `Cache-Control: no-store`.

## Changed and added files

- **Database (`packages/db`)**:
  - `prisma/schema.prisma` & `prisma/migrations/20261105080000_local_listing_writer/{migration.sql,down.sql}`: adds `LISTING_ACCESS` and `LISTING_SUBMIT` to `AuditAction`, adds nullable `preferred_vehicle_type` to `listings`, updates `evone_listing_snapshot` to record `preferredVehicleType`, and adds `evone_listing_preference_guard` so variant selection must match `preferred_vehicle_type` and post-publish preference edits require `PENDING_REVIEW`. Reviewed `down.sql` refuses rollback once listing writer evidence exists.
- **Contracts & SDK (`packages/contracts`, `packages/sdk`)**:
  - `packages/contracts/src/listings.ts`, `routes.ts`, `index.ts`, `openapi.json`, `packages/sdk/src/schema.ts`: strict Zod schemas and OpenAPI 3.1 / typed SDK definitions for `listOwnListings`, `createListingDraft`, `getOwnListing`, `saveListingDraft`, `submitListingDraft`, `attachListingPhoto`, `editListingPhoto` and `removeListingPhoto`.
- **API (`apps/api`)**:
  - `src/marketplace/{marketplace.module.ts,listing.controller.ts,listing.service.ts,listing.service.test.ts}`: bearer-guarded owner-only listing writer setting transaction-local `evone.actor_id` and `evone.request_id`, enforcing optimistic version checks under `FOR UPDATE`, auditing allow/deny outcomes (including a fresh denial audit when a SQL guard aborts the transaction), and reporting `listing.operation_failed` on unexpected database errors.
  - `test/listing-wizard.integration.test.ts` & `test/contract.integration.test.ts`: PostgreSQL + synthetic S3 media + JWT integration tests and full OpenAPI contract coverage across all documented status codes (`200`, `400`, `401`, `403`, `404`, `409`, `503`).
- **UI & Web (`packages/ui`, `apps/web`)**:
  - `packages/ui/src/{field.tsx,index.ts}`: accessible `TextAreaField` component.
  - `apps/web/lib/private-api-gateway.ts`: shared loopback bearer/JSON gateway with origin check, 128 KiB body cap and `no-store` headers, used by both `/admin/catalogue/api` and `/sell/api`.
  - `apps/web/app/sell/page.tsx` & `apps/web/app/sell/api/[[...path]]/route.ts`: opt-in `/sell` page and allowlisted private seller gateway.
  - `apps/web/lib/sell/{config.ts,request.ts,values.ts,config.test.ts,gateway.test.ts}` & `apps/web/components/sell/{session.tsx,workspace.tsx,wizard.tsx,use-draft.ts,fields.tsx,vehicle-picker.tsx,photos.tsx,workspace.test.tsx}`: multi-step wizard, serialized autosave queue, conflict recovery and unit tests.
  - `apps/web/tests/sell.spec.ts`: Playwright browser test verifying production refusal of the wizard and `/sell/api/*` across all four viewports.

## Verification

| Check | Result |
|---|---|
| `pnpm format:check` | Pass |
| `pnpm lint` | Pass (10/10 tasks, `--max-warnings 0`) |
| `pnpm typecheck` | Pass (10/10 tasks) |
| `pnpm test:unit` | Pass (**313 unit tests**: API 163, web 103, contracts 33, UI 12, SDK 2) |
| `pnpm contract:check` | Pass (`openapi.json` and `packages/sdk/src/schema.ts` in sync) |
| Hosted CI ([run 43685509068](https://github.com/Srujanmirji/EV_ONE/actions/runs/43685509068)) | Pass on PostgreSQL 17/PostGIS + Redis + Chromium: migration repeatability/rollback/drift, `listing-wizard.integration.test.ts`, full 8-route contract matrix in `contract.integration.test.ts`, demo seed and browser E2E at four widths |

## Remaining acceptance

- Verify live Clerk development sign-in, `evone-api` token template, session cookies, logout and account switching against `/sell` (shared with EV-005/EV-016/EV-017).
- Verify live Cloudflare R2 presigned upload, `Content-Length`/`Content-Type` enforcement, browser CORS and private signed preview reads (shared with EV-020).
- Keep `LOCAL_SELL_ENABLED` unset and production auth disabled outside local development. EV-028 remains `[~]` in progress and completed task count stays **16/87** until live provider acceptance is recorded.
