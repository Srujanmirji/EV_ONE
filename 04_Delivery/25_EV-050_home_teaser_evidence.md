# EV-050 — Homepage savings teaser evidence

Date: 2026-11-04. Branch: `codex/EV-050-home-savings-teaser`, based on verified focus-fix commit `17b9ad3` (PR #9). Status: locally complete; hosted CI result will be recorded in the pull request.

## Acceptance

The homepage has one compact graphite teaser after the existing ecosystem navigation. It uses the established Manrope/Inter typography, graphite/paper/titanium palette and shared `buttonClasses`; no new tokens, dependencies, client state, network requests or data persistence were added.

“Estimate my energy costs” is a real `/calculator` link. It opens the blank calculator rather than loading illustrative values. Copy describes user-supplied driving, efficiency and energy prices, says the result is an estimate rather than a guarantee, and explicitly excludes maintenance, depreciation, charging losses and finance. No amounts, market tariffs, vehicle photos, verified claims or mockup figures appear.

This static section has no asynchronous loading/error/empty states of its own. Those states belong to the working calculator destination and remain covered by EV-049. The complete homepage/search/inventory hierarchy remains EV-062/EV-063.

## Commands and results

| Command/check | Result |
|---|---|
| `pnpm --filter @evone/web build` | Pass; production Next build |
| `pnpm --filter @evone/web typecheck` | Pass |
| `pnpm --filter @evone/web lint` | Pass after removing the temporary local browser config |
| `pnpm --filter @evone/web test:unit` | 37 pass |
| `DATABASE_URL=postgresql://unused@127.0.0.1:1/unused pnpm --filter @evone/web exec playwright test tests/preview.spec.ts tests/ui-kit.spec.ts --config playwright.teaser-local.config.ts --grep 'preview renders\|homepage energy\|^.* › / has no\|unknown routes'` | 12 pass: preview/overflow, 404 recovery, teaser caveats and keyboard navigation at 375/768/1280/1920px; this filter did not select axe |
| `DATABASE_URL=postgresql://unused@127.0.0.1:1/unused pnpm --filter @evone/web exec playwright test tests/ui-kit.spec.ts --config playwright.teaser-local.config.ts --grep '/ has no WCAG'` | 4 pass: homepage axe WCAG 2.2 AA, no violations at all four widths |
| Impeccable detector on `apps/web/app/page.tsx` | `[]` |
| Visual polish / restraint | Inspected rendered 375/1280px screenshots; measured layout through viewport assertions. Existing fonts/tokens, compact single block, no gradients/glow/animation/icons or fabricated metrics |
| Keyboard | Real tab order from skip link through header/ecosystem to teaser, visible outlines at every stop, white focus outline on graphite, CTA ≥44px; Enter reaches blank calculator |

The temporary local config inherited all four normal viewport projects, used two workers and started only the real built Next app on loopback port 3100. These routes do not need API/DB access; the required database URL was a deliberately unreachable dummy value. The config was removed after testing. The first lint attempt caught only its anonymous default export; final lint without it passes. One exploratory `--list` filter selected no tests; the final axe command above selected the intended four.

React, TypeScript and integration reviews found no actionable issues. Only a light theme exists. Typography/layout inspected at mobile and desktop; no additional decorative polish was needed. Global body/focus/selection conventions remain intact.

## Files and progress

- `apps/web/app/page.tsx`: static teaser and shared button-style link.
- `apps/web/tests/preview.spec.ts`: caveats, tab path, visible focus, tap height and blank-calculator arrival.
- `02_UI_UX/02_screen_specs.md`: UX-01 implemented scope.
- `README.md`, `TASKS.md`: 16/87 complete, savings 3/3; EV-048/049 hosted CI results reconciled.
- Prior savings evidence: hosted verification links/counts updated to actual results.

## Remaining limits / rollback

No new hosted CI or deployment verification for EV-050; no database/API suites rerun for this static change. EV-049's verified baseline has 153 unit, 63 integration, 13 process and 208 browser checks passing in CI (four expected skips). This branch depends on its unmerged focus follow-up. Main does not yet contain the complete savings stack.

No full screen-reader certification. Live Sentry alert receipt remains pending under EV-019. The next prerequisite is EV-005 auth vendor/model approval; auth/RBAC and licensed/approved providers block the other implementation paths. Reverting this task removes only the teaser/test/docs and leaves the calculator intact.
