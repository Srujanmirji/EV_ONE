# EV-030 — Used EV Listing & Search Screen (`/used-evs`) Evidence

## Scope & Governance
- **Task:** `EV-030` — Build used EV listing/search screens (`Depends: EV-029,EV-015` · Done when: Desktop sidebar, mobile sheet, states and sorting).
- **Decision register:** `06_Reference/02_decision_register.md` (`EV-030 — Local-only used EV listing/search UI prerequisite exception`, owner approved 2026-11-15).
- **Status:** `[~]` In progress in `TASKS.md` (completed count remains `16 / 87`) until `EV-027` / `EV-029` live Clerk identity/session acceptance is verified.

## What Was Implemented
1. **Server-Side Loader, URL Filter Parser & Formatters (`apps/web/lib/used-evs.ts`, `apps/web/lib/format.ts`)**
   - `parseUsedEvFilters` validates URL query parameters against `PublicListingListQuery` (`@evone/contracts`), converts whole-rupee inputs (`minPriceInr`, `maxPriceInr`) into paise (`minPricePaise`, `maxPricePaise`), enforces range ordering (`minPricePaise <= maxPricePaise`, `minYear <= maxYear`), and rejects unknown query keys so invalid or tampered links render a clear `invalid-filters` recovery state.
   - `loadUsedEvs` fetches `/brands` and `/listings` (`limit: 12`) through the generated `@evone/sdk` client, mapping network or 5xx failures to `unavailable` and `400` responses (e.g. expired cursors) to `invalid-filters`.
   - Added `formatInrFromPaise`, `formatKilometres`, `formatOwnership`, `SELLER_TYPE_LABEL`, and `LISTING_SORT_LABEL` in `apps/web/lib/format.ts`.

2. **Responsive Filter/Sort Controls, Cards & States (`apps/web/app/used-evs/(list)/page.tsx`, `loading.tsx`, `apps/web/components/used-evs/*`)**
   - **Desktop sidebar & mobile bottom sheet:** `<aside>` at `lg` (`>= 1024px`) and `FilterSheet` (`<Modal placement="sheet" title="Filter listings">`) below `lg`, wrapping a plain GET `<form action="/used-evs">` inside a semantic `<search>` landmark.
   - **Sorting & filtering:** Supports `PRICE_ASC` (`Price: low to high`), `PRICE_DESC` (`Price: high to low`), `YEAR_DESC` (`Year: newest first`), and `ODOMETER_ASC` (`Kilometres: lowest first`), plus `Brand`, `Vehicle type` (`Car`, `Scooter`), `City`, `Max price (₹)`, `Min model year`, and `Max kilometres`.
   - **Truthful listing cards (`ListingCard`):** Displays brand, model, variant, year, city, asking price in INR with `Enquiry only (sale happens off-platform)`, kilometres driven, ownership ordinal, canonical battery/range with full test-cycle `<abbr title="...">` (`Not stated` when absent), photo count, published date, `Individual seller`, and `Demo data` badge when `isDemo` is `true`. Never displays fabricated verification or battery-inspection badges.
   - **States:** `loading.tsx` skeleton (`Loading used electric vehicles`), filtered empty state with `Clear filters`, unfiltered empty state (`No used listings have been published yet`, which is also what production renders since demo listings are hidden in `NODE_ENV=production`), `invalid-filters` state, and `unavailable` error state.

## Verification Commands & Results
- `pnpm format:check` — passed across all 7 workspace packages.
- `pnpm lint` — passed with 0 warnings across all 7 workspace packages.
- `pnpm typecheck` — passed across all 7 workspace packages.
- `pnpm test:unit` — passed (including new unit tests in `apps/web/lib/used-evs.test.ts` covering URL filter parsing, rupee-to-paise conversion, range validation, INR/km/ownership formatting, and SDK loader states).
- `pnpm build` — passed across all workspace packages.
- `pnpm contract:check` — passed with zero OpenAPI or SDK drift.
- Hosted GitHub Actions CI (`apps/web/tests/used-evs.spec.ts`) verifies `/used-evs` against live PostgreSQL + API across all 4 viewport widths (`375px` mobile, `768px` tablet, `1280px` desktop, `1920px` wide), including axe WCAG 2.2 AA compliance, mobile bottom sheet geometry, URL filter/sort persistence, 12-per-page keyset pagination, empty state recovery, and invalid filter handling.

## Remaining Risks & Open Gates
- **Live Clerk Acceptance (`EV-005` / `EV-016` / `EV-017` / `EV-027` / `EV-029`):** `EV-030` remains `[~]` in progress until a live Clerk development instance is configured and real seller/moderator sign-in and session claims are verified.
- **Used EV Detail Screen (`EV-031`):** Card titles link to `/used-evs/{slug}`, whose dedicated detail screen (`UX-03`) is tracked under `EV-031`.
