# EV-025 — EV detail and variant pages evidence

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Status: EV-025 complete, with the photo-data limitation below (owner agreed 2026-11-03).

**Done when:** correct spec units, source dates, gallery and unknown states.

| Criterion | How it is met | Proof |
|---|---|---|
| Correct spec units | `lib/specs.ts` is the single place for labels and units: kWh (battery), km (range), kW (motor, AC, DC), formatted for en-IN | Unit test "formats every value with its unit" (mutation: dropping kWh fails it); browser checks 40.5 kWh, 1,200 km, 100 kW, 7.2 kW |
| Source dates | Each stated value lists its reviewed sources: site link (`rel="noopener noreferrer"`, screen-reader "external site"), kind, quoted value, effective date if any, checked date; the page states the most recent check | Browser: "effective 1 Jan 2026 · checked 20 Oct 2026", link href, "Most recently checked 20 Oct 2026"; an unreviewed "rumour" source is absent; sources attach only to their own field (mutation fails the unit test) |
| Gallery | `@evone/ui` `Gallery`: main image, previous/next, thumbnail strip with arrow keys and one tab stop, `aria-current`, polite "Photo n of m"; honest empty state | 3 unit tests; `/ui-kit` browser test with three original SVG examples (not vehicle photos); vehicle pages assert the empty figure and no `<img>` |
| Unknown states | NULL specs read "Not stated" with no source; a variant with no specs shows six "Not stated"; a model with no published variants says so | Browser "a variant with no stated specs…"; unit "keeps unknown values null…" |

## Limitation: no vehicle photos yet (AGENTS rules 6 and 9)

No licensed vehicle photos exist, and there is no media table or upload pipeline (EV-020, which needs Cloudflare R2). AGENTS.md forbids copyrighted imagery. Vehicle pages therefore render the gallery's empty state: "No photos yet. EVONE only shows photos it has permission to publish." When EV-020 adds media, pass the images to `Gallery`; no UI work is needed.

## Routes

- `/evs/[brand]/[model]`: model header (type, availability, demo label), breadcrumb, gallery, published variants with key specs linking to variant pages. Catalogue cards now link here.
- `/evs/[brand]/[model]/[variant]`: header, breadcrumb (`aria-current` on the last item), specification list (a `<dl>` that stacks on phones; no horizontal overflow at 375 px), source rows, and a "confirm with the manufacturer" caution.
- Both pages: per-page title and description, canonical, noindex; unavailable API → ErrorState with retry; unknown, draft or wrongly nested slugs → real HTTP 404.

## Defect found and fixed

**Soft 404s.** `app/evs/loading.tsx` (EV-024) created a streaming boundary for every `/evs/*` route, so `notFound()` rendered the 404 page with HTTP 200 for draft and unknown pages. The listing and its loading state moved into `app/evs/(list)/`. The browser test checks the status code for five not-found cases, and copying `loading.tsx` back to `/evs` makes it fail.

**Other fixes:**
- Source links showed only the source kind ("Other"); they now show the site name, with the kind in brackets.
- Screen-reader text was reworded.
- The demo seed no longer double-prefixes "DEMO".

## Tests and verification

Local runs used Node 24.18.0, pnpm 11.20.0, and PostGIS with the demo seed.

| Command | Actual result |
|---|---|
| `pnpm format:check`, `lint`, `typecheck`, `build`, `contract:check`, `verify:gates` | Pass |
| `pnpm test:unit` | web 21, ui 12, api 35, contracts 7, sdk 2 |
| `pnpm test:integration` | api 29, db 18 |
| `pnpm test:e2e` | web 160 passed, 4 skipped by design (pre-wording-fix run); after the wording fix, `tests/detail.spec.ts` 24/24 |

Screenshots of the variant page (1280 and 375 px) and the model page (1280 px) were inspected.

[Hosted Foundation checks run 41680514294](https://github.com/Srujanmirji/EV_ONE/actions/runs/41680514294) (commit `a7d2107`, job 126072610570) passed all 20 steps on Ubuntu in about 5 minutes, including `pnpm test:e2e` (2 min 9 s) with the detail, gallery and 404 checks against the CI PostgreSQL service.

## Changed files

- Web:
  - `app/evs/(list)/{page,loading}.tsx` (moved), `app/evs/[brand]/[model]/page.tsx`, `app/evs/[brand]/[model]/[variant]/page.tsx`;
  - `components/catalogue/{breadcrumbs,spec-list,unavailable,model-card}.tsx`;
  - `lib/{catalogue,specs,specs.test,site.test}.ts`;
  - `app/ui-kit/ui-kit.tsx`, `public/kit/photo-{1,2,3}.svg`;
  - `tests/{detail,ui-kit}.spec.ts`.
- UI: `packages/ui/src/{gallery.tsx,index.ts,components.test.tsx}`.
- DB: `packages/db/src/seed-demo.ts`.
- Documentation: `TASKS.md`, this record.

## Rollback

Revert the EV-025 commits. No schema or API change.
