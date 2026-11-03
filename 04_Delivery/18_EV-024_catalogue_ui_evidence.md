# EV-024 — EV catalogue listing UI evidence

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Status: EV-024 complete.

**Done when:** responsive filters and source-aware cards. Both are tested in a real browser against the real API and PostgreSQL at 375, 768, 1280 and 1920 px.

## What was built

- **`/evs`** (`apps/web/app/evs/page.tsx`): server-rendered on each request.
  - `lib/catalogue.ts` validates URL filters with the contract's `ModelListQuery`, then calls `/brands` and `/models` through `@evone/sdk`.
  - `API_BASE_URL` is server-only, never `NEXT_PUBLIC_`.
  - The loader never throws. The outcome is `ok`, `invalid-filters` (bad or hand-edited URL, or an expired cursor the API answers with 400) or `unavailable` (missing config, unreachable or failing API; details are logged server-side only).
- **Filters** (`components/catalogue/filter-form.tsx`):
  - brand and vehicle type in a plain GET form, so they are kept in the URL, shareable, survive reload and work without JavaScript;
  - a sidebar from 1024 px;
  - below that, a "Filters (n)" button opens the same form in the shared Modal with the new `placement="sheet"` (bottom-anchored under 640 px, UX-02).
- **Source-aware cards** (`components/catalogue/model-card.tsx`):
  - brand, model, vehicle type, availability, and a "Demo data" label when `isDemo`;
  - battery as a min–max span, and claimed range listed per test standard (`<abbr>` with the full name, e.g. "Modified Indian Driving Cycle"), never merged across standards;
  - "Not stated" for unknowns;
  - footer: "N variants · M reviewed sources · checked <date>", or "Specifications not published yet".
  - Cards do not link anywhere yet, because the model detail page is EV-025.
- **States:**
  - loading skeleton (`app/evs/loading.tsx`);
  - "No models have been published yet" (what production shows today);
  - "No models match these filters" with Clear;
  - "These filters are not valid" with Clear;
  - "The catalogue is unavailable right now" with Try again.
- **Pagination:** 12 per page, with Next page and Back to first page links that keep the filters.

## Supporting API change (additive)

The EV-023 `ModelSummary` had no specs, so a card could not be source-aware. `ModelSummary.specSummary` adds `variantCount`, `batteryKwh {min,max}|null`, `claimedRanges[{standard,minKm,maxKm}]`, `reviewedSourceCount` and `lastReviewedAt`, all computed from published variants and reviewed sources only. Contracts, `openapi.json` and the SDK were regenerated; `contract:check` passes. Covered by mapper unit tests (standards kept separate, empty model) and an integration test (an unreviewed draft source and an unpublished variant are excluded).

## Tests

| Suite | Count | Notes |
|---|---|---|
| `apps/web/lib/catalogue.test.ts` | 9 | Filter parsing (unknown params dropped, empty = none, invalid rejected); loader with a fake API: filters and page size forwarded, invalid filters never call `/models`, API 400 → invalid, 503 or unreachable → unavailable, missing `API_BASE_URL` → unavailable; URL builder |
| `apps/web/tests/catalogue.spec.ts` | 6 × 4 widths | Demo cards labelled and source-aware with standard tooltip (axe); "Not stated"; filters via sidebar or bottom sheet, URL persistence and reload; 12 + 2 pagination keeping filters; empty with Clear (axe); invalid links (axe) |
| API unit and integration | 35 / 29 | Including specSummary |

Browser-test fixtures are inserted with plain SQL through `pg` in one transaction, so the database publish rules apply; they are removed afterwards. (Importing the Prisma client into Playwright failed: Playwright's Babel transform cannot compile the generated client.) Playwright now starts the built API on port 4100 against `DATABASE_URL`, alongside the web server.

**Mutation checks**, desktop:
- removing the range standard from cards fails "lists demo models with labelled, source-aware cards";
- dropping `brandId` from pagination links fails "paginates 12 at a time and keeps filters".

**Corrected test issues:**
- Next.js injects a route announcer with `role="alert"`, so alert and status assertions are now scoped to `<main>`.
- The mobile filter dialog first rendered centred, not as a sheet. The `sheet` placement was added, and the test asserts that the panel touches the bottom edge at 375 px.

Screenshots at 1280 px and 375 px (sheet open) were inspected.

## Verification

Local runs used Node 24.18.0 and pnpm 11.20.0, with PostGIS in Docker and the demo seed applied.

| Command | Actual result |
|---|---|
| `pnpm format:check`, `lint`, `typecheck`, `build`, `verify:gates` | Pass |
| `pnpm contract:check` (after commit) | Pass |
| `pnpm test:unit` | web 18, api 35, ui 9, contracts 7, sdk 2 |
| `pnpm test:integration` | api 29, db 18 |
| `pnpm test:e2e` | web 132 passed (4 skipped by design), api 4 |

[Hosted Foundation checks run 41676438270](https://github.com/Srujanmirji/EV_ONE/actions/runs/41676438270) (commit `cefda65`) passed all 20 steps on Ubuntu in about 5 minutes. This includes `pnpm test:e2e`, the first CI run in which Playwright starts the built API against the CI PostgreSQL service and the seeded demo catalogue.

## Changed files

- Contracts and SDK: `packages/contracts/src/catalogue.ts`, `openapi.json`, `packages/sdk/src/schema.ts`.
- API: `src/catalogue/{catalogue.repository,catalogue.mapper,catalogue.mapper.test}.ts`, `test/catalogue.integration.test.ts`.
- UI: `packages/ui/src/modal.tsx` (`placement`).
- Web:
  - `app/evs/{page,loading}.tsx`, `components/catalogue/{model-card,filter-form,filter-sheet}.tsx`;
  - `lib/{catalogue,catalogue.test,format,site,site.test}.ts`;
  - `tests/{catalogue,shell}.spec.ts`, `playwright.config.ts`;
  - `package.json` (`@evone/sdk`, `@evone/contracts`; dev `pg`, `@types/pg`), `.env.example`.
- Workspace: `turbo.json` (web `test:e2e` depends on `@evone/api#build`), `pnpm-lock.yaml`.
- Documentation: `PROJECT_SETUP.md`, `TASKS.md`, this record.

## Remaining gaps

- **Production shows the honest empty state** until real sourced specs are entered. That needs the editor (EV-022), which is blocked by the auth vendor decision (EV-005 → EV-016/017).
- **No result total:** the API has none, so the page says "Showing N models" for the current page.
- **No caching:** the page is fully dynamic. Add revalidation when traffic justifies it.
- **Cards do not link to detail pages** until EV-025.

## Rollback

Revert the EV-024 commits. The API change is additive; no schema or data change.
