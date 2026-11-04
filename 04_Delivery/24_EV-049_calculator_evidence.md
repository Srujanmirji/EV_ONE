# EV-049 — Calculator UI evidence

Date: 2026-11-04. Branch: `feat/EV-049-savings-calculator`, based on local EV-048 commit `890f25a`. Status: implemented and pushed in PR #8; initial hosted CI exposed a focus race, corrected in a follow-up PR (hosted verification pending).

## Working flow

`/calculator` replaces its coming-soon page. The form submits to a Server Action, which validates numeric values and optional rupees, converts the premium to integer paise and calls the EV-048 endpoint through the generated SDK. Response schemas are checked before rendering. `API_BASE_URL` stays server-side; the estimate has a five-second network timeout. No external account or user identity is needed and no calculator inputs/results are persisted.

The initial form is blank. "Load illustrative example" is opt-in and clearly labeled. The result includes monthly/yearly savings or additional cost, monthly cost bars, annual cost rows, optional simple payback and exclusions. No saving is guaranteed; values are not market tariffs or vehicle prices. Input labels carry units, including kWh/km (not kWh/100km) and optional purchase premium in rupees.

Loading, empty, field-invalid, unavailable and populated states work. Controlled values survive validation/transport failures. Edits hide stale results. Keyboard submit moves focus to the first invalid input or the result region, with explicit scroll offset below the sticky header. Negative and zero scenarios stay honest.

## Verification

| Command/check | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` | Pass across workspace; 153 unit tests (API75, contracts27, web37, UI12, SDK2) |
| `pnpm --filter @evone/web build` | Pass, production Next.js build |
| `pnpm format:check`, `git diff --check` | Pass |
| `pnpm --filter @evone/web exec playwright test tests/calculator.spec.ts tests/ui-kit.spec.ts --config playwright.calculator-local.config.ts --grep 'calculator\|/ui-kit has no\|ui-kit is not\|form shows\|modal traps\|gallery moves'` | 40 pass using the temporary local config described below; four widths 375/768/1280/1920 |
| Calculator browser tests | 16 pass: real SDK/API golden results, keyboard-only controls/focus, invalid-field focus/value retention, stale-result clearing, higher EV costs, zero driving, pending state, aborted-request recovery/retry |
| Shared UI regression + calculator initial axe | 24 pass: ui-kit/calculator axe, noindex, modal focus, validation and gallery at four widths |
| Axe WCAG 2.2 AA | No violations in tested initial/populated/invalid states; labels, descriptions and keyboard checks supplement automation |
| Control boundary measurement | Computed border `rgb(116,123,135)` on actual white control background: **4.2634:1**, above 3:1 |
| Impeccable polish | Detector `[]`; 375/1280 screenshot inspection and one confirmation round. Focus/header overlap and weak shared input borders fixed in one batch |

Reviews found no remaining integration, numeric, React or TypeScript issues. All production code/validation deltas reviewed; temporary config was excluded and removed.

## Hosted CI follow-up

Initial hosted run [41767127772](https://github.com/Srujanmirji/EV_ONE/actions/runs/41767127772) passed earlier gates but failed the mobile invalid-field focus assertion. Focus scheduled inside the async action could run before React re-enabled the pending fieldset. Focus now runs in an effect after the completed response commits. The existing calculator suite passed **48 checks** (`--repeat-each=3`, all four widths) against the built app/API after this fix; web lint, typecheck, 37 unit tests and production build also pass. React review found no issues. No assertion was weakened.

## Local browser fixture

Docker/PostgreSQL are unavailable on this host. The local browser run used the **real built Next.js app and real built Nest calculator route/engine**, with `createApp` supplying an unused DB object and no readiness checks on loopback port 4100. Calculator requests do not use database persistence. Next ran on 3100 with `API_BASE_URL=http://127.0.0.1:4100`. A temporary `playwright.calculator-local.config.ts` inherited all four normal viewport projects, disabled automatic servers and used two workers. It was removed after verification; fixture source lived in `/tmp/evone-calculator-qa-api.mjs`. No production flags/bypasses were added.

Normal CI uses the existing real migrated PostgreSQL/Redis setup and picks up `tests/calculator.spec.ts` automatically. Full database/browser regressions remain unrun locally; no live deployment claim is made.

## Acceptance / polish details

- Existing palette/fonts/shell inherited; visual direction stated in chat before implementation and preserved in `02_UI_UX/08_EV-049_calculator_direction.md`.
- Body contrast checked by axe against rendered surfaces. Input/select border contrast was measured separately and fixed through the shared token/component.
- Every control uses a real label, at least 44px target and visible keyboard focus. No hover-only interaction. Focused results clear the sticky header (browser assertion top ≥72px).
- Only a light theme exists. Shared loading motion respects reduced motion; no decorative motion introduced.
- First browser run's error tests accidentally matched Next's route-announcer alert as well as the product alert. Selectors were scoped to Calculation results; no product error state was missing.
- No screen-reader certification or field hardware test was performed. Comprehensive all-flow accessibility remains EV-068.

## Screenshots

Local artifacts (ignored by git) from the confirmation run:
- `apps/web/test-results/calculator-calculator-subm-59861-nd-stays-usable-by-keyboard-mobile/calculator-success.png`
- `apps/web/test-results/calculator-calculator-subm-59861-nd-stays-usable-by-keyboard-desktop/calculator-success.png`

## Changed files

- Calculator page/action, calculator/results components, form metadata/helpers/API boundary and unit/browser tests.
- Site registry availability and homepage intro corrected for available catalogue/calculator routes.
- Shared input/select border token and classes (UI-kit regressions verified).
- UX/spec/setup/README/task progress, visual direction and this evidence.

## Remaining scope / rollback

EV-050 homepage savings teaser remains open. Tariff mixing, charging losses/TCO/finance are outside this base calculator. EV-019 still awaits a live Sentry alert; EV-020 access controls need auth/RBAC.

PR #8 was merged into its EV-048 base branch externally. The focus follow-up targets that branch, which contains the calculator; main does not yet contain the full stack. Revert EV-049 as a unit to restore its placeholder; preserve the independent EV-048 API. No stored data/migrations are affected.
