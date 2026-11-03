# Sprint Plan — Dependencies, Parallel Work, Milestones

> Durations are **planning estimates**, not promises. Sprint = 1 week in a small team, with 2–4 parallel developers only when shared interfaces are stable. Stop if legal/data partner gates are blocked.

| Sprint | Primary focus | Key tasks | Demonstration |
|---|---|---|---|
| 0 | discovery, product/design decisions | EV-001–EV-008 | user interview summary, approved screens/architecture and vendor go/no-go |
| 1 | monorepo, tokens, API, DB, auth | EV-009–EV-020 | web shell + health checks + auth + deploy preview |
| 2 | canonical EV catalogue | EV-021–EV-026 | publish sourced vehicle model, compare variants |
| 3 | marketplace supply and browse | EV-027–EV-031 | submit draft listing, browse and view details |
| 4 | moderation and buyer leads | EV-032–EV-037 | approve listing and deliver real enquiry to seller |
| 5 | accessories catalogue/cart | EV-039–EV-044 | browse, check fit, add cart, checkout quote |
| 6 | payments/orders & calculator | EV-045–EV-050 | verified sandbox payment, order history, savings results |
| 7 | charging/editorial | EV-051–EV-057 | source-aware map/list, published real article |
| 8 | finance leads, homepage, account | EV-058–EV-067 | complete cohesive homepage and consent-gated lead |
| 9 | QA/hardening/UAT | EV-068–EV-073 | end-to-end passes, auth negatives and failure states |
| 10 | production preparation | EV-074–EV-078 | backups, policies, content audit, go/no-go |
| 11–14 | pilot + fixes | EV-079–EV-080 | validated contact conversations, ops metrics |

## Team parallelization
- **Design + frontend:** 01 design system, page handoff, responsive states. Cannot fabricate backend facts.
- **Core/backend:** DB, auth, catalogue, listings, enquiry and queue infrastructure.
- **Commerce/integrations:** products/orders/payment sandbox and later map/provider adapter.
- **QA/content/ops:** seed only real permissioned listings, editorial source checks, test matrix, compliance and launch runbook.

## Weekly checkpoints
Monday: assign EV IDs, check hard dependencies. Midweek: merge contract changes before UI/API implementation. Friday: demo usable flows against staging, update docs/task status and record decisions. Keep no more than ~2 tasks in progress per developer.

## Critical path
Auth+Postgres+catalogue → listing create/moderate → public listing detail → enquiry + notifications → real permissioned inventory → pilot. Accessories/payment is a parallel revenue path but cannot go live without reconciliation and operational fulfilment.

## Pilot gate
No half-tested finance/insurance delivery, no unknown availability green badges, no fake verified badges. If a provider/legal task is blocked, ship an honest informational landing with the integration disabled.
