# EVONE — Master Implementation Task File

**Status key:** `[ ]` not started, `[~]` in progress (use `- [x]` when complete). EV-009, EV-010, EV-011, EV-012, EV-013, EV-015, EV-018, EV-021, EV-023 and EV-024 are verified locally and in hosted CI. Effort is relative: S ≤ 1–2 dev days; M 3–5; L 6–10+ (estimates, not commitments).

Task IDs reference the specs in `PRD.md`, `UI_UX.md`, `DATABASE.md`, `API_CONTRACT.md`. Dependencies are hard unless owner records an approved exception.

**Execution rule:** claim one task, create branch `feat/EV-###-slug`, record tests/screenshots/proof in PR, update this checklist and the decision log. Do not take a P1 task before its P0 dependency.


## Discovery (8 tasks)

- [ ] **EV-001** · P0 · S · **Interview 10 dealers and 15 buyers**  
  Depends: `-` · **Done when:** Interview notes and top 5 recurring pain points documented.
- [ ] **EV-002** · P0 · S · **Obtain permission for real seed listing inventory**  
  Depends: `-` · **Done when:** At least 20 seller-consented real listing leads documented or launch scope revised.
- [ ] **EV-003** · P0 · S · **Confirm domain brand and IP checks**  
  Depends: `-` · **Done when:** Brand decision and trademark risk review recorded.
- [ ] **EV-004** · P0 · M · **Approve final UI reference and sitemap**  
  Depends: `-` · **Done when:** Desktop/mobile homepage and core screens signed off.
- [ ] **EV-005** · P0 · S · **Agree authentication vendor and implementation model**  
  Depends: `-` · **Done when:** JWT verification and sign-in flows spike completed.
- [ ] **EV-006** · P0 · M · **Validate charging data provider and map terms**  
  Depends: `-` · **Done when:** Coverage, pricing, caching and attribution permitted in writing.
- [ ] **EV-007** · P0 · M · **Get legal assessment of finance/insurance lead model**  
  Depends: `-` · **Done when:** Partner contracts/approved wording and go/no-go documented.
- [ ] **EV-008** · P0 · S · **Lock first-party accessories fulfillment process**  
  Depends: `-` · **Done when:** Stock ownership, shipping, returns and support rules approved.

## Foundation (12 tasks)

- [x] **EV-009** · P0 · S · **Create pnpm Turborepo monorepo**
  Depends: `EV-004` · **Done when:** apps and packages install/build under CI.
  Owner-approved prerequisite exception: accepted ADR-001 (2026-11-03); EV-004 stays open. Workspace/web preview implemented; frozen install, lint, formatting, strict typecheck, production build and 8 browser tests pass locally and in [hosted CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41651932287). [Files, commands and evidence](04_Delivery/08_EV-009_foundation_evidence.md).
- [x] **EV-010** · P0 · S · **Set lint, typecheck, format and unit tooling**
  Depends: `EV-009` · **Done when:** CI fails invalid types and formatting.
  Vitest added; `pnpm verify:gates` proves typecheck, format, lint and unit tests reject broken probes, and Node 24.18.0 is now enforced at install. Passes locally and in [hosted CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41655114949). [Files, commands and evidence](04_Delivery/09_EV-010_tooling_evidence.md).
- [x] **EV-011** · P0 · M · **Create Next.js web app shell and routes**
  Depends: `EV-009` · **Done when:** Nav/footer, basic SEO and responsive shell work.
  Header with mobile menu, footer, honest "not available yet" page per sitemap section, title template/descriptions/canonicals, robots.txt and sitemap.xml with indexing off until ADR-002; one registry (`apps/web/lib/site.ts`). 52 browser checks at four widths, mutation-tested; passing locally and in [hosted CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41669888052). Follows the planned sitemap; EV-004 sign-off still open. [Evidence](04_Delivery/16_EV-011_web_shell_evidence.md).
- [x] **EV-012** · P0 · M · **Create NestJS API and health endpoints**
  Depends: `EV-009` · **Done when:** Startup config, liveness and readiness tests pass.
  `apps/api` (NestJS 12, ESM) with Zod-validated startup config and `/api/v1/health/{live,ready}`; 18 unit and 2 built-process tests pass locally and in [hosted CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41657126777). Readiness registry awaits EV-013/EV-014 checks. [Files, commands and evidence](04_Delivery/10_EV-012_api_health_evidence.md).
- [x] **EV-013** · P0 · M · **Provision Postgres+PostGIS and migrations**
  Depends: `EV-012` · **Done when:** Migrations repeatable and rollback strategy documented.
  `packages/db` (Prisma 7.10.1 per accepted ADR-012) with PostGIS baseline, reviewed `down.sql`, confirm-guarded rollback and `db:migrate:verify` (repeat deploy, drift, catalog-checked rollback, redeploy) passing locally and in [hosted CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41660702823). Strategy in `DATABASE.md`; production host PostGIS/PITR unverified. [Evidence](04_Delivery/12_EV-013_database_evidence.md).
- [ ] **EV-014** · P0 · S · **Provision Redis+BullMQ worker**  
  Depends: `EV-012` · **Done when:** Queued test event handled with retries.
- [x] **EV-015** · P0 · M · **Build global design tokens and components**
  Depends: `EV-011` · **Done when:** Tokens, buttons, inputs, cards, modals, empty/error states.
  `@evone/ui`: UI_UX.md tokens, Button, TextField/SelectField/Checkbox, Card, native-dialog Modal, EmptyState/ErrorState/Skeleton; shell migrated; `/ui-kit` reference (noindex). axe WCAG 2.2 AA clean on every page at four widths; two real a11y defects fixed; mutation-tested. Muted text kept at `#596170` because the spec's `#747B87` fails AA. Passing locally and in [hosted CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41672655002). [Evidence](04_Delivery/17_EV-015_ui_evidence.md).
- [ ] **EV-016** · P0 · M · **Integrate managed auth with API**  
  Depends: `EV-005,EV-012` · **Done when:** Expired/invalid JWT rejected server-side.
- [ ] **EV-017** · P0 · M · **Implement scoped RBAC and audit middleware**  
  Depends: `EV-016` · **Done when:** Cross-account and cross-dealer access blocked in tests.
- [x] **EV-018** · P0 · M · **Create contracts and SDK generation pipeline**
  Depends: `EV-012` · **Done when:** OpenAPI and TS SDK generated from validated schemas.
  `packages/contracts` (strict Zod → OpenAPI 3.1 `openapi.json`) and `packages/sdk` (generated types + `createEvoneClient`); `contract:check`, API route/schema contract test and SDK-driven API e2e all mutation-tested and passing locally and in [hosted CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41663040938). [Evidence](04_Delivery/13_EV-018_contracts_evidence.md).
- [ ] **EV-019** · P0 · S · **Set up Sentry, structured logging, request IDs**  
  Depends: `EV-012` · **Done when:** PII redaction and test alert confirmed.
- [ ] **EV-020** · P0 · S · **Configure R2 uploads and media validation**  
  Depends: `EV-012` · **Done when:** Presigned uploads, type/size checks and access controls.

## Catalogue (6 tasks)

- [x] **EV-021** · P0 · M · **Create brand/model/variant schema and seeds**
  Depends: `EV-013` · **Done when:** Schema supports source-referenced real specs.
  Catalogue tables with `spec_sources`; the database refuses to publish a stated spec without a reviewed https source (deferred triggers, 18 mutation-tested PostgreSQL integration tests). Fictional `DEMO` seed, never production. Passing locally and in [hosted CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41665429328). Deviations (computed coverage view instead of `data_status`; prices deferred; vehicle types to confirm) in `DATABASE.md`. [Evidence](04_Delivery/14_EV-021_catalogue_evidence.md).
- [ ] **EV-022** · P0 · M · **Build catalogue editor forms and permissions**  
  Depends: `EV-021` · **Done when:** Editors create drafts, admin approves publish.
- [x] **EV-023** · P0 · M · **Implement catalogue read endpoints**
  Depends: `EV-021,EV-018` · **Done when:** Pagination, published-only and schema contract tests.
  `GET /brands`, `/models` (keyset pagination on name+id), `/brands/{brandSlug}/models/{modelSlug}`, `/variants/{id}` with reviewed provenance; published-only and demo-hidden-in-production; contract test covers every documented status. Mutation-tested; passing locally and in [hosted CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41668025897). Path and sort deviations in `API_CONTRACT.md`. [Evidence](04_Delivery/15_EV-023_catalogue_api_evidence.md).
- [x] **EV-024** · P0 · M · **Build EV catalogue listing UI**
  Depends: `EV-015,EV-023` · **Done when:** Responsive filters and source-aware cards.
  `/evs`: server-rendered via SDK; URL-persistent GET filters (sidebar, bottom sheet on mobile); cards with battery, range per test standard, "Not stated", demo label and reviewed-source count/date (additive API `specSummary`); loading/empty/invalid/unavailable states; 12-per-page pagination. Browser tests against real API + PostgreSQL at four widths with axe; mutation-tested; passing locally and in [hosted CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41676438270). [Evidence](04_Delivery/18_EV-024_catalogue_ui_evidence.md).
- [ ] **EV-025** · P0 · M · **Build EV detail and variant page**  
  Depends: `EV-023` · **Done when:** Correct spec units, source-date, gallery and unknown states.
- [ ] **EV-026** · P0 · S · **Build compare 2–3 EV variants**  
  Depends: `EV-025` · **Done when:** Missing fields handled; mobile comparison usable.

## Marketplace (12 tasks)

- [ ] **EV-027** · P0 · M · **Create listings/media/review schema**  
  Depends: `EV-021,EV-017` · **Done when:** State transitions and ownership constraints enforced.
- [ ] **EV-028** · P0 · L · **Build sell-your-EV multi-step form**  
  Depends: `EV-027,EV-020` · **Done when:** Draft, autosave, image upload, preview, submit flow.
- [ ] **EV-029** · P0 · M · **Implement listing search/filter API**  
  Depends: `EV-027` · **Done when:** URL filters/cursor pagination/secure published reads.
- [ ] **EV-030** · P0 · L · **Build used EV listing/search screens**  
  Depends: `EV-029,EV-015` · **Done when:** Desktop sidebar, mobile sheet, states and sorting.
- [ ] **EV-031** · P0 · M · **Build used EV detail screen**  
  Depends: `EV-029` · **Done when:** Gallery, sourced specs, price, seller and contact CTA.
- [ ] **EV-032** · P0 · M · **Build admin review queue**  
  Depends: `EV-028,EV-017` · **Done when:** Approve/reject reason and immutable moderation audit.
- [ ] **EV-033** · P0 · S · **Implement badge evidence and expiry rules**  
  Depends: `EV-032` · **Done when:** No badge without approved verification record.
- [ ] **EV-034** · P0 · M · **Build enquiry capture/status/anti-spam**  
  Depends: `EV-031,EV-017` · **Done when:** Consent and seller notification; flood tests pass.
- [ ] **EV-035** · P0 · S · **Build saved vehicles and seller lead inbox**  
  Depends: `EV-034` · **Done when:** Only owner/dealer scoped leads visible.
- [ ] **EV-036** · P0 · S · **Build seller and verified dealer profiles**  
  Depends: `EV-032` · **Done when:** Claims and seller type accurately displayed.
- [ ] **EV-037** · P0 · S · **Build my listings edit/archive/mark sold**  
  Depends: `EV-028` · **Done when:** State changes authorized and tracked.
- [ ] **EV-038** · P1 · L · **Add independent battery inspection partner process**  
  Depends: `EV-033` · **Done when:** Signed report provenance and expiration verified.

## Commerce (9 tasks)

- [ ] **EV-039** · P0 · M · **Create product/inventory/catalogue schema**  
  Depends: `EV-013,EV-017` · **Done when:** Nonnegative stock, compatibility status represented.
- [ ] **EV-040** · P0 · M · **Build product CMS and inventory admin**  
  Depends: `EV-039` · **Done when:** Price, stock, media and compatibility editable.
- [ ] **EV-041** · P0 · M · **Build accessories category/product pages**  
  Depends: `EV-039,EV-015` · **Done when:** Vehicle filters and no false compatibility claims.
- [ ] **EV-042** · P0 · S · **Build product detail and compatibility checker**  
  Depends: `EV-041` · **Done when:** CONFIRMED/UNCONFIRMED/INCOMPATIBLE distinctly labeled.
- [ ] **EV-043** · P0 · M · **Build cart and persisted user cart**  
  Depends: `EV-039,EV-016` · **Done when:** Server validates stock and recalculates totals.
- [ ] **EV-044** · P0 · M · **Build checkout address/shipping/tax quote**  
  Depends: `EV-043,EV-008` · **Done when:** Total shown before payment and persisted snapshot.
- [ ] **EV-045** · P0 · L · **Integrate Razorpay order/payment webhook**  
  Depends: `EV-044` · **Done when:** Signature, amount, currency and replay tests pass.
- [ ] **EV-046** · P0 · M · **Build order history/status/email**  
  Depends: `EV-045` · **Done when:** Only trusted payments show paid; customer sees status.
- [ ] **EV-047** · P0 · M · **Implement refunds/cancellations admin flow**  
  Depends: `EV-046` · **Done when:** Reconciliation and role approvals recorded.

## Savings (3 tasks)

- [ ] **EV-048** · P0 · S · **Implement exact EV energy savings formula**  
  Depends: `EV-018` · **Done when:** Golden tests and realistic validation bounds pass.
- [ ] **EV-049** · P0 · M · **Build calculator UI/results/chart**  
  Depends: `EV-048,EV-015` · **Done when:** Units, caveats and inputs accessible on mobile.
- [ ] **EV-050** · P0 · S · **Build homepage savings teaser**  
  Depends: `EV-049` · **Done when:** No fake guarantee; links to calculator.

## Charging (4 tasks)

- [ ] **EV-051** · P0 · M · **Implement licensed charger data adapter**  
  Depends: `EV-006,EV-018` · **Done when:** Source, update time, unknown status preserved.
- [ ] **EV-052** · P0 · M · **Create charging map/list and filters**  
  Depends: `EV-051` · **Done when:** Map/list parity, error/degraded states and attribution.
- [ ] **EV-053** · P0 · S · **Build charger detail screen**  
  Depends: `EV-052` · **Done when:** Connectors, kW, last updated, navigate CTA.
- [ ] **EV-054** · P0 · S · **Build user station error reports**  
  Depends: `EV-052` · **Done when:** Spam limited and admin triage possible.

## Editorial (3 tasks)

- [ ] **EV-055** · P0 · M · **Create article drafts/publish workflow**  
  Depends: `EV-017` · **Done when:** Roles, preview, revision and citation fields work.
- [ ] **EV-056** · P0 · M · **Build journal and article screens**  
  Depends: `EV-055,EV-015` · **Done when:** Responsive editorial layout, metadata and SEO.
- [ ] **EV-057** · P0 · S · **Curate launch content editorially**  
  Depends: `EV-056` · **Done when:** ≥8 genuine attributed useful articles; no fictional reviews.

## Finance (4 tasks)

- [ ] **EV-058** · P0 · S · **Build EMI calculator and tests**  
  Depends: `EV-007,EV-018` · **Done when:** Zero-interest edge and rounding validated.
- [ ] **EV-059** · P0 · M · **Build separate loan/insurance lead forms**  
  Depends: `EV-058,EV-017` · **Done when:** Purpose/partner consent explicit and logged.
- [ ] **EV-060** · P0 · M · **Implement partner lead dispatch queue**  
  Depends: `EV-059,EV-014` · **Done when:** Only approved partner and valid consent; retries audited.
- [ ] **EV-061** · P0 · S · **Create admin finance queue with restricted views**  
  Depends: `EV-060` · **Done when:** Only assigned authorized staff see PII.

## Home (2 tasks)

- [ ] **EV-062** · P0 · M · **Build cinematic homepage/search/shortcuts**  
  Depends: `EV-015,EV-030,EV-025` · **Done when:** Matches approved reference, no fake metrics.
- [ ] **EV-063** · P0 · M · **Build curated previews/CTAs**  
  Depends: `EV-062,EV-041,EV-050,EV-052,EV-056` · **Done when:** Hierarchy preserved; modules navigate correctly.

## Accounts (2 tasks)

- [ ] **EV-064** · P0 · M · **Build buyer/seller account dashboard**  
  Depends: `EV-016,EV-035,EV-046` · **Done when:** Favourites, enquiries, orders and settings work.
- [ ] **EV-065** · P0 · S · **Build consent, privacy and deletion request UI**  
  Depends: `EV-016` · **Done when:** Revocation and export path documented/tested.

## Dealer (2 tasks)

- [ ] **EV-066** · P0 · M · **Create dealer membership and staff authorization**  
  Depends: `EV-036,EV-017` · **Done when:** Cross-dealer access denied in automated tests.
- [ ] **EV-067** · P0 · M · **Build dealer inventory and leads console**  
  Depends: `EV-066` · **Done when:** Scoped CRUD and statuses working.

## Quality (6 tasks)

- [ ] **EV-068** · P0 · M · **Run accessibility audits on all P0 flows**  
  Depends: `EV-063` · **Done when:** Keyboard, contrast, errors and screen reader QA signed.
- [ ] **EV-069** · P0 · M · **Run SEO, perf and image checks**  
  Depends: `EV-063` · **Done when:** Canonical/meta/sitemap and CWV results documented.
- [ ] **EV-070** · P0 · M · **Run privacy, auth, CSRF and security checks**  
  Depends: `EV-045,EV-060` · **Done when:** No critical/high severity issue unresolved.
- [ ] **EV-071** · P0 · M · **Test payment webhook retries/refunds/reconciliation**  
  Depends: `EV-045` · **Done when:** Duplicate events do not duplicate fulfilment.
- [ ] **EV-072** · P0 · M · **Test external service outage states**  
  Depends: `EV-053,EV-060` · **Done when:** Maps and partners fail gracefully.
- [ ] **EV-073** · P0 · M · **End-to-end buyer/seller/dealer/admin UAT**  
  Depends: `EV-067` · **Done when:** Complete flows pass using safe non-production fixtures.

## Launch (5 tasks)

- [ ] **EV-074** · P0 · M · **Provision production/staging with secrets and domains**  
  Depends: `EV-073` · **Done when:** Separate env, SSL, scoped secrets and observability.
- [ ] **EV-075** · P0 · S · **Verify backups and restore drill**  
  Depends: `EV-074` · **Done when:** Recoverable staging backup demonstrated.
- [ ] **EV-076** · P0 · S · **Publish terms/privacy/refund/support pages**  
  Depends: `EV-074` · **Done when:** Legal sign-off, correct contact and policies.
- [ ] **EV-077** · P0 · S · **Seed permissioned live content and audit claims**  
  Depends: `EV-002,EV-073` · **Done when:** No fake seller or ratings; listing source recorded.
- [ ] **EV-078** · P0 · S · **Go/no-go review and pilot release**  
  Depends: `EV-075,EV-076,EV-077` · **Done when:** Owner signoff and rollback runbook ready.

## Pilot (2 tasks)

- [ ] **EV-079** · P0 · M · **Track pilot KPIs and response times weekly**  
  Depends: `EV-078` · **Done when:** Dashboard includes supply, lead quality and complaints.
- [ ] **EV-080** · P0 · M · **Run 20-user usability and trust review**  
  Depends: `EV-079` · **Done when:** Findings prioritized and shipped to backlog.

## Scale (7 tasks)

- [ ] **EV-081** · P1 · M · **Pilot dealer subscriptions and pricing**  
  Depends: `EV-079` · **Done when:** Business metrics and refund policy evaluated.
- [ ] **EV-082** · P1 · L · **Add independent battery diagnostics pipeline**  
  Depends: `EV-079` · **Done when:** Partner QA and claims policy signed.
- [ ] **EV-083** · P1 · L · **Add operator-backed near-real-time charger status**  
  Depends: `EV-052` · **Done when:** Contracts, freshness SLA and fallback monitored.
- [ ] **EV-084** · P1 · M · **Dealer CSV bulk inventory import**  
  Depends: `EV-067` · **Done when:** Validation, duplicate checks, import summary.
- [ ] **EV-085** · P1 · L · **Build mobile Expo app with shared SDK**  
  Depends: `EV-079` · **Done when:** Core buyer flows and auth accepted by QA.
- [ ] **EV-086** · P2 · L · **Explore third-party accessory marketplace**  
  Depends: `EV-079` · **Done when:** Operational/legal feasibility before payout build.
- [ ] **EV-087** · P2 · M · **Explore owner garage and reminders**  
  Depends: `EV-079` · **Done when:** Validated demand and privacy first.

## Release blocking tasks
All relevant P0 tasks EV-001 through EV-078 must pass for release, subject to explicit scope cuts. EV-079 and EV-080 are **post-launch pilot** tasks; P1/P2 scale tasks are later. Discovery legal/provider gates cannot be deferred without feature removal.

## Current progress
- Total: **87 tasks** across 16 phases.
- Completed: **1** (EV-009).
- Next engineering task: EV-010 (tooling acceptance). EV-011 and EV-012 are also dependency-ready after EV-009.
- Discovery EV-001–EV-008 remains open; EV-004 was not completed by the scaffold exception.

## When something changes
Update PRD acceptance criteria → screen spec → database/API contract → impacted task dependencies → tests. Maintain one source of truth; never implement a design-only assumption as backend truth.
