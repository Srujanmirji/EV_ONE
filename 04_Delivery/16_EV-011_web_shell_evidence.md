# EV-011 — Web app shell and routes evidence

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Status: EV-011 complete.

**Done when:** nav/footer, basic SEO and responsive shell work.

## Gate note

EV-004 (final UI reference and sitemap sign-off) is still open. The shell follows the planned sitemap in `02_UI_UX/03_user_flows_sitemap.md` and the structure of `assets/approved_ui_reference.png`. All sections live in one registry (`apps/web/lib/site.ts`), so a sitemap change after EV-004 edits one file. The mockup's counts, badges, prices and sample vehicles are deliberately not reproduced (AGENTS rule 3).

## What was built

- **Header** (`components/site-header.tsx`): EVONE wordmark linking home; five primary section links (Used EVs, Explore EVs, Accessories, Charging, News) from 1024 px up, with `aria-current="page"` on the active section; a "Sell your EV" pill from 640 px up. The header is sticky.
- **Mobile navigation** (`components/nav-client.tsx`): below 1024 px a Menu/Close button with `aria-expanded` and `aria-controls` toggles a panel holding all primary links plus Sell. Escape closes it and returns focus to the button; following a link closes it. Touch targets are at least 44 px.
- **Footer** (`components/site-footer.tsx`): graphite band with the preview disclosure and links to all eight sections.
- **Section pages**: `/used-evs`, `/evs`, `/accessories`, `/charging`, `/news`, `/sell`, `/calculator`, `/finance`. Each uses `ComingSoon` and states plainly that the feature is not available (UX-01). `/finance` states that EVONE does not collect finance or insurance enquiries (ADR-007).
- **Home**: the hero is kept inside the shell, followed by a "What EVONE will cover" grid that says nothing in it is available yet.
- **SEO**:
  - `metadataBase` from `PUBLIC_WEB_URL`, a title template (`%s · EVONE`), and per-section title, description, canonical and Open Graph;
  - viewport and theme colour;
  - `robots.txt` and `sitemap.xml` generated from the registry.
- **Indexing**: one switch, `INDEXING_ENABLED = false`, keeps every page `noindex, nofollow` and makes `robots.txt` disallow all until ADR-002 clears publishing.
- **Tokens**: `mist` (#EFF1F5) and `line` (#E4E7EC) added from UI_UX.md.

## Changed files

`apps/web/app/{layout,page,robots,sitemap}.ts(x)`, `app/{used-evs,evs,accessories,charging,news,sell,calculator,finance}/page.tsx`, `app/globals.css`, `components/{site-header,nav-client,site-footer,coming-soon}.tsx`, `lib/site.ts`, `lib/site-metadata.ts`, `lib/site.test.ts`, `lib/site-metadata.test.ts`, `tests/shell.spec.ts`; docs `README.md`, `PROJECT_SETUP.md`, `TASKS.md`, this record.

## Tests and mutation checks

| Test | Covers | Mutation that must fail it | Result |
|---|---|---|---|
| `lib/site.test.ts` (5) | Unique hrefs and labels, every href has a page file, honest availability text, at most 6 primary links, indexing off | `/charging` renamed to `/chargers` | Fails "only links to pages that exist" |
| `tests/shell.spec.ts`, per section × 4 widths | 200, `<h1>`, title, description, canonical, noindex, status text, no horizontal overflow, no console errors | — | Pass |
| Mobile menu (375 and 768 px) | `aria-expanded`, links visible, Escape closes and restores focus, closes on navigation | Focus restore removed | **First version passed anyway** (focus was already on the toggle). Fixed to Tab into the menu first; it then fails at both widths |
| Desktop navigation (1280 and 1920 px) | Links visible, Menu hidden, navigation works, `aria-current` correct | — | Pass |
| Footer, robots.txt, sitemap.xml | Every section linked; `Disallow: /`; every section listed | — | Pass |
| `tests/preview.spec.ts` (existing) | Home hero, skip link, focus, overflow, icon, 404 recovery | — | Pass with the shell in place |

Screenshots at 1280 px (home, `/evs`) and 375 px (home, menu open on `/news`) were inspected. The layout follows the reference structure with no overflow or overlap defects.

## Verification

Local runs used Node 24.18.0, pnpm 11.20.0, and full Chromium via `PW_CHROMIUM_EXECUTABLE`.

| Command | Actual result |
|---|---|
| `pnpm format:check`, `lint`, `typecheck` | Pass |
| `pnpm build` | 13 static routes, including `/robots.txt` and `/sitemap.xml` |
| `pnpm test:unit` | web 9/9 (plus api 33, contracts 7, sdk 2) |
| `pnpm test:e2e` | web 52 passed, 4 skipped by design (desktop-only test at mobile and tablet widths, mobile-only test at desktop and wide); api 4 |
| `pnpm verify:gates`, `contract:check`, `test:integration` | Pass |

[Hosted Foundation checks run 41669888052](https://github.com/Srujanmirji/EV_ONE/actions/runs/41669888052) (commit `75a07f8`) passed all 20 steps on Ubuntu in about 3 minutes, including `pnpm test:e2e` with the shell browser suite in full Chromium.

## Remaining gaps

- **EV-004 sign-off** may change sections or labels; edit `lib/site.ts` only.
- **Design system (EV-015):** buttons, links and cards are styled inline with Tailwind and should become shared components.
- **No account or login entry** in the header yet; it depends on auth (EV-005 → EV-016).
- **The homepage is not the full UX-01 composition** (search bar, featured listings and so on). Those need real data and their own tasks.
- **Indexing must be switched on deliberately** after ADR-002, with `PUBLIC_WEB_URL` set to the production origin.

## Rollback

Revert the EV-011 commits. Static pages only; no data, schema or API change.
