# EV-026 — Compare 2–3 EV variants evidence

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Status: EV-026 complete.

**Done when:** missing fields handled; mobile comparison usable.

| Criterion | How it is met | Proof |
|---|---|---|
| Missing fields handled | Unknown values show "—" (`aria-hidden`) with screen-reader text "Not stated", plus a legend; known-vs-unknown counts as a difference; sources and checked dates appear only next to stated values | Unit "marks rows that differ, including known vs unknown"; browser "unknown values show a dash read as 'Not stated'" |
| Mobile comparison usable | Table inside a focusable `role="region"` (`tabindex=0`, labelled by the caption) that scrolls sideways; sticky row labels; "Scroll the table sideways…" hint under 640 px; the page itself never scrolls sideways; remove links with 44 px targets | Browser "stays usable on small screens" at 375/768/1280/1920 px: region scrolls, page does not, the row label stays at the left edge after scrolling; axe clean |

## What was built

- **API `GET /compare?variantIds=a,b[,c]`** (planned in API_CONTRACT.md):
  - `CompareQuery` accepts 2–3 distinct UUIDs (case-insensitive duplicate check) and returns full variant details with reviewed sources, in the requested order.
  - If any variant is unpublished or missing it returns 404, with the same message as a missing one, so publication state does not leak.
  - Contract, OpenAPI and SDK were regenerated, and contract-test requests were added for 200, 400 and 404.
- **`/compare` page:**
  - `?ids=` holds the comparison, so links are shareable, and `diff=1` shows only differing rows.
  - It uses the same labels, units and source rules as the variant page (`lib/specs.ts`).
  - Columns link to the variant pages and carry a demo label; with 3 columns each has a remove link.
  - States: choose variants, add one more, invalid link, not available, service unavailable.
- **Range honesty:** when claimed ranges use different test standards, a note says "Ranges are not directly comparable", and equal km under different standards still counts as a difference.
- **"Add to comparison" on variant pages:**
  - A tray of up to 3 ids in `localStorage`, read with `useSyncExternalStore`; every access is guarded, so it is an optional convenience.
  - "Comparison is full (3)" when full, and "Compare N variants" once there are 2 or more.
  - Visiting `/compare` syncs the tray to the URL.

## Decisions

- **The route is `/compare`, not `/evs/compare`.** `/evs/{brand}` would otherwise shadow a brand with the slug "compare". Noted in `02_UI_UX/03_user_flows_sitemap.md`.
- **The URL is the source of truth;** the tray only helps build it.

## Defects found and fixed

1. **Page-wide horizontal overflow at 375 px with 3 variants.** Two plausible fixes (`min-w-0` on the wrapper, then on `<body>` children) did not resolve it. Measuring every ancestor showed all containers fit, but the screen-reader-only text in cells (`position: absolute`) escaped the non-positioned scroll container and widened the document. Making the region `relative` fixed it, and removing `relative` makes the small-screen test fail again. The two `min-w-0` changes stay as correct defensive fixes.
2. **`aria-pressed` on a link** (the differences toggle) was flagged by axe and removed. The link text states the action.
3. **React rule `set-state-in-effect`** flagged the first tray hook, and `SyncTray` wrote to storage during render. Both were rewritten: `useSyncExternalStore` for the tray, and an effect for the sync.

## Mutation checks

- **Diff ignoring the range standard (km only)** fails the unit test "flags claimed ranges measured under different test standards".
- **Removing `relative` from the scroll region** fails the 375 px small-screen browser test.

## Verification

Local runs used Node 24.18.0, pnpm 11.20.0, and PostGIS with the demo seed.

| Command | Actual result |
|---|---|
| `pnpm format:check`, `lint`, `typecheck`, `build`, `verify:gates` | Pass |
| `pnpm contract:check` (after commit) | Pass |
| `pnpm test:unit` | web 27, api 35, ui 12, contracts 7, sdk 2 |
| `pnpm test:integration` | api 38 (compare order, all-or-nothing 404, 400 cases, contract), db 18 |
| `pnpm test:e2e` | web 192 passed, 4 skipped by design; api 4. After the scroll hint, `tests/compare.spec.ts` 32/32 |

Screenshots at 1280 px and 375 px were inspected; the missing scroll affordance on phones led to the hint.

[Hosted Foundation checks run 41684765959](https://github.com/Srujanmirji/EV_ONE/actions/runs/41684765959) (commit `79ec468`) passed on Ubuntu in about 4.5 minutes, including the contract check, API integration (compare endpoint) and `pnpm test:e2e` with the compare suite at four widths.

## Changed files

- Contracts and SDK: `packages/contracts/src/{catalogue,routes}.ts`, `openapi.json`, `packages/sdk/src/schema.ts`.
- API: `src/catalogue/{catalogue.controller,catalogue.repository,catalogue.mapper}.ts` (shared `variantDetailSelect`, `toVariantDetail`), `test/{catalogue,contract}.integration.test.ts`.
- Web:
  - `app/compare/page.tsx`, `components/compare/{tray.ts,add-to-compare.tsx}`, `lib/{compare,compare.test}.ts`;
  - `app/evs/[brand]/[model]/[variant]/page.tsx` (Add to comparison), `app/layout.tsx` (`min-w-0`);
  - `tests/compare.spec.ts`.
- Documentation: `API_CONTRACT.md`, `02_UI_UX/03_user_flows_sitemap.md`, `TASKS.md`, this record.

## Remaining gaps

- **The tray is per browser** (localStorage); it has no account sync until auth exists.
- **No prices in the comparison** (no `vehicle_prices` table yet).
- **The API returns 404 for a whole comparison** if one variant is unpublished. The page asks the visitor to choose again rather than showing a partial comparison.

## Rollback

Revert the EV-026 commits. The API endpoint is additive; no schema change.
