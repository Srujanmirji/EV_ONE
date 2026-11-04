# EV-048 — Exact EV energy savings evidence

Date: 2026-11-04. Branch: `feat/EV-048-savings-engine`, based on EV-019 commit `50c2eb5`. Status: locally verified; [hosted CI passed](https://github.com/Srujanmirji/EV_ONE/actions/runs/41767123619).

## Acceptance

Golden example: 1,000 km/month, 15 km/L, ₹100/L, 0.15 kWh/km and ₹8/kWh yields ICE ₹6,666.67, EV ₹1,200, monthly savings ₹5,466.67, annual savings ₹65,600 and 37-month simple payback for a ₹2 lakh premium. Figures are illustrative.

- Exact BigInt rational arithmetic from six-decimal inputs; independent final money rounding to integer paise, halves away from zero. Annual outputs multiply unrounded monthly amounts. Negative savings remain negative.
- Zero driving, free charging, omitted/zero/negative premiums, sub-paise positive savings and unrepresentable payback are tested. All amount outputs stay within safe integer bounds for supported inputs.
- Shared strict Zod request/result/envelope schemas and stateless public POST `/api/v1/calculators/ev-savings`. No DB writes, auth requirement, prices fetched or personal data collected. The existing request ID and telemetry pipeline apply; request values are not logged.
- Input units/bounds and exact precision rules documented in `API_CONTRACT.md`. Electricity is one user-supplied effective tariff; maintenance, depreciation, charging losses and finance are excluded. There is no guarantee of savings.
- Route registry/OpenAPI generation now supports JSON request bodies. SDK types regenerate from the same schema. The existing route contract integration fixture was updated for POST JSON requests, covering 200 and 400.

## Commands and results

| Command | Result |
|---|---|
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` | Pass |
| `pnpm test:unit` | 143 pass: API 75, contracts 27, web 27, UI 12, SDK 2 |
| `pnpm --filter @evone/api exec vitest run src/calculators/savings.test.ts` | 7 pass: golden example, negative savings, zero/free cases, premium semantics, signed half-paise rounding, tiny savings/payback safety, maximum bounds |
| Savings HTTP/SDK tests (part of API unit suite) | 7 pass against real local HTTP app with unused DB: generated SDK POST, matching envelope/header ID, strict invalid-input errors and malformed JSON |
| Savings contract tests (part of contracts unit suite) | 19 pass including zero denominators, nonfinite/string input, upper/lower bounds, unknown fields and excessive precision (including floating-point-near-multiple cases) |
| `pnpm contract:generate` | Generated OpenAPI and SDK from shared contracts; required JSON-body/ref tests pass |
| `git diff --check` | Pass |

Independent reviews found no calculation, validation, contract or TypeScript defects. API 75 and contracts 27 tests were independently run; all passed.

## Scope and remaining risks

- No UI changes; responsive/loading/form/error UI is EV-049. Existing `/calculator` remains a coming-soon page until that task.
- Full database-backed contract/browser suites were not rerun locally because Docker/PostgreSQL are unavailable. Hosted CI passed: 143 unit, 63 database/API/queue integration, 13 process and 192 browser checks (four expected skips). POST status/schema behavior is covered locally through SDK→HTTP tests; CI includes the generic route registry/schema suite.
- The pure engine expects its typed inputs to have passed `SavingsRequest`; the controller enforces this boundary. No new dependencies or migrations.
- No home/public split parameters, charging-loss factor, maintenance/TCO/EMI or live tariffs. One effective tariff follows the existing API plan; negative/zero premiums have explicit documented semantics. Extremely large precise paybacks return null rather than a rounded unsafe JSON integer.
- EV-020 remains unstarted: authenticated media access acceptance needs EV-016/EV-017. No public upload endpoint or R2 integration was added.
- Branch is based on still-open EV-019/EV-014 PRs. Keep its PR based on EV-019 until those merge, then rebase/retarget to main.

## Changed files

- New `apps/api/src/calculators/{savings,calculators.controller,calculators.module}.ts`, calculation and HTTP tests; API module registration.
- New `packages/contracts/src/savings.ts` and boundary tests; contract exports/registry routes/OpenAPI body support and tests.
- Generated `packages/contracts/openapi.json`, `packages/sdk/src/schema.ts`; existing API contract integration request fixtures.
- API/calculation specifications, README, task progress and this evidence.

## Rollback

Revert EV-048 as a unit and regenerate contracts/SDK. No DB or stored user state changes. Existing endpoints retain their contracts.
