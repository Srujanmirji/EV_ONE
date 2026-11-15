# EV-029 — Public Listing Search/Filter & Detail API Evidence

## Scope & Governance
- **Task:** `EV-029` — Implement listing search/filter API (`Depends: EV-027` · Done when: URL filters/cursor pagination/secure published reads).
- **Decision register:** `06_Reference/02_decision_register.md` (`EV-029 — Local-only listing search/filter API prerequisite exception`, owner approved 2026-11-15).
- **Status:** `[~]` In progress in `TASKS.md` (completed count remains `16 / 87`) until `EV-027` live Clerk identity/session acceptance is verified.

## What Was Implemented
1. **Contracts & Generated SDK (`packages/contracts`, `packages/sdk`)**
   - Added strict Zod schemas in `packages/contracts/src/listings.ts`:
     - `PublicListingSort`: `PRICE_ASC` (default), `PRICE_DESC`, `YEAR_DESC`, `ODOMETER_ASC`
     - `PublicSellerType`: `INDIVIDUAL_OWNER`
     - `PublicListingVehicle`, `PublicListingSummary`, `PublicListingPhoto`, `PublicListingDetail`
     - `PublicListingListResponse`, `PublicListingDetailResponse`, `PublicListingPathParams`, `PublicListingListQuery`
   - Registered two public `listings`-tagged operations in `packages/contracts/src/routes.ts`:
     - `listPublicListings` (`GET /listings`)
     - `getPublicListing` (`GET /used-evs/{slug}`) — uses `/used-evs/{slug}` matching the canonical `/used-evs/[slug]` route so it stays distinct from the bearer-guarded `GET /listings/{id}` seller draft endpoint (`getOwnListing`).
   - Regenerated `packages/contracts/openapi.json` and `packages/sdk/src/schema.ts`.

2. **Keyset Pagination & Range Validation (`apps/api/src/marketplace/listing-cursor.ts`)**
   - `encodeListingCursor` / `decodeListingCursor` bind the opaque base64url cursor to the active `sort` mode (`PRICE_ASC`, `PRICE_DESC`, `YEAR_DESC`, `ODOMETER_ASC`) and UUID `id` tie-breaker, avoiding `timestamptz(6)` millisecond truncation issues (`API_CONTRACT.md`).
   - `validateListingRanges` rejects inverted `minPricePaise > maxPricePaise` and `minYear > maxYear` ranges with `400 VALIDATION_ERROR` field-level errors.

3. **Secure Published Read Repository & Controller (`apps/api/src/marketplace/public-listing.repository.ts`, `public-listing.controller.ts`)**
   - Every read enforces:
     - `status: "PUBLISHED"` and `publishedAt: { not: null }`
     - `isDemo: false` when `NODE_ENV === "production"` (demo rows visible only outside production with `isDemo: true`)
     - Active seller (`seller.status === "ACTIVE"`) with an active, unexpired `GLOBAL` `USER` or `ADMIN` role assignment
     - Published canonical hierarchy (`variant`, `model`, and `brand` all `PUBLISHED`, and non-demo in production)
   - Never exposes `sellerUserId`, `mediaAssetId`, `objectKey`, signed storage URLs, unreviewed spec sources, or `reviewerId`.

## Verification Commands & Results
- `pnpm --filter @evone/contracts build && pnpm contract:generate` — regenerated `packages/contracts/openapi.json` and `packages/sdk/src/schema.ts`.
- `pnpm format:check` — passed across all 7 workspace packages.
- `pnpm lint` — passed with 0 warnings across all 7 workspace packages.
- `pnpm typecheck` — passed across all 7 workspace packages.
- `pnpm test:unit` — passed (including new unit tests in `apps/api/src/marketplace/listing-cursor.test.ts` covering cursor round-trips, sort mismatch rejection, range validation, and public summary/detail mappers).
- `pnpm build` — passed across all workspace packages.
- `pnpm contract:check` — passed with zero OpenAPI or SDK drift.
- Hosted GitHub Actions CI (`apps/api/test/contract.integration.test.ts` and `apps/api/test/public-listings.integration.test.ts`) verifies live PostgreSQL keyset pagination across all 4 sort modes, URL filter combinations, unpublished/suspended-seller hiding, production demo isolation, and `400 VALIDATION_ERROR` envelopes.

## Remaining Risks & Open Gates
- **Live Clerk Acceptance (`EV-005` / `EV-016` / `EV-017` / `EV-027`):** `EV-029` remains `[~]` in progress until a live Clerk development instance is configured and real seller/moderator sign-in and session claims are verified end to end.
- **Production Inventory (`EV-002` / `EV-077`) & Public Media Delivery (`EV-020`):** All current listings are flagged `isDemo: true` and are automatically excluded when `NODE_ENV=production`. Photo attachments expose only `id`, `position`, and `alt` metadata until public gallery rendering and live R2 bucket policies are approved.
