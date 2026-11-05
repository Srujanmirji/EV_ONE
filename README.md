# EVONE — Startup & Engineering Blueprint

**Status:** 16/87 tasks complete; EV-048/EV-049 passed CI; EV-019 live alert pending; EV-050 passed CI · **Date:** 2026-11-04 · **Region:** India · **Design:** approved EVONE monochrome automotive + restrained Liquid Glass concept.

> **Purpose:** source of truth for a web-first electric-vehicle ecosystem. The workspace contains the web shell, read-only EV catalogue/comparison, API/database/contracts and a foundation queue worker. The exact savings API and `/calculator` customer flow are implemented. Marketplace, checkout and other business journeys remain pending.

## Run the foundation

Use Node `24.18.0` and pnpm `11.20.0` (pinned in `.node-version` and `package.json`).

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:3000` for the web preview; the API runs at `http://127.0.0.1:4000/api/v1` (`/health/live`, `/health/ready`). The API needs local Redis (`REDIS_URL`) and the PostGIS database (`pnpm db:up`, then `pnpm db:migrate:deploy`; see `PROJECT_SETUP.md`). No provider credentials are required. For production-mode local verification:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm verify:gates
pnpm --filter @evone/web exec playwright install chromium
pnpm test:e2e
pnpm start
```

`pnpm test:unit` runs Vitest (`*.test.ts` beside the code). `pnpm test:e2e` builds first through Turbo, then starts the built API on a free port (startup, readiness, graceful SIGTERM, invalid-config refusal) and an isolated web production server on port 3100 (home, every section page, header navigation, the mobile menu, robots.txt/sitemap.xml and 404 recovery at four viewport widths in full Chromium). `pnpm test` runs both; `pnpm test:integration` runs database/API tests against a migrated database plus queue tests against Redis. Both `DATABASE_URL` and `REDIS_URL` must be exported for integration/E2E tests; see `PROJECT_SETUP.md`. `pnpm verify:gates` writes deliberately broken probe files and fails if typecheck, format, lint or unit tests accept them. CI also installs Chromium's Linux system dependencies. The suite fails if port 3100 is already occupied.

Implemented workspace members: `apps/web`, `apps/api`, `packages/db` (Prisma + PostGIS migrations), `packages/contracts` (Zod schemas → OpenAPI 3.1), `packages/sdk` (generated typed client), `packages/ui` and `packages/config`. The worker is a separate NestJS process in `apps/api` using `pnpm --filter @evone/api worker:start` after build. Admin and mobile remain future tasks. Documentation stays at its existing paths. The original `MANIFEST_SHA256.txt` describes the supplied blueprint archive, not current edited files.

## Product promise
EVONE helps Indian customers **buy and sell used EVs**, discover new EVs, shop compatible accessories, calculate EV savings, find charging stations, read EV news/reviews, and request loan/insurance quotations through approved partners.

## Read in this order
1. [`PRD.md`](PRD.md) — scope, requirements, non-goals and acceptance criteria.
2. [`UI_UX.md`](UI_UX.md) and [`02_UI_UX/02_screen_specs.md`](02_UI_UX/02_screen_specs.md) — visual design and all screen specs.
3. [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) — architecture, reliability, integrations, boundaries.
4. [`DATABASE.md`](DATABASE.md) + [`API_CONTRACT.md`](API_CONTRACT.md) — backend contracts.
5. [`TASKS.md`](TASKS.md) — numbered execution backlog with sequencing and acceptance criteria.
6. [`ROADMAP.md`](ROADMAP.md) — milestones, release gates and pilot strategy.
7. [`04_Delivery/05_agent_execution.md`](04_Delivery/05_agent_execution.md) — coding-agent rules and task prompts.

## Directory map
- `01_Product/`: vision, personas, use cases, metrics, feature acceptance and launch strategy.
- `02_UI_UX/`: design system, screens, user journeys, Google Stitch master prompt, content, accessibility.
- `03_Engineering/`: architecture details, API, auth, search, charging, ecommerce, calculations, finance, events, infra.
- `04_Delivery/`: sprints, tests, tasks, release checklists, AI-agent workflows.
- `05_Operations/`: editorial, dealer ops, listing moderation, partnerships, analytics.
- `06_Reference/`: assumptions, references, glossary, open decisions.
- `assets/approved_ui_reference.png`: **visual concept only**, not a screenshot of an implemented product. Text, prices, counts and badges in the image are decorative placeholders, **not verified data**.

## Seven product modules
| Module | MVP | Following release |
|---|---|---|
| Used EV marketplace | listings, search, enquiry, self-service listing, moderation | inspected battery reports, dealer paid plans |
| Accessories | curated single-merchant catalogue, cart, payment, orders | third-party sellers, installation partners |
| EV catalogue | model/variant/spec pages, compare | richer research tools and media |
| EV savings | transparent calculated estimates and assumptions | richer TCO forecast |
| Charging locator | map/list from licensed provider data, connector filters | operator live feeds and status |
| News & reviews | editorial articles, factual attribution | owner reviews and submissions |
| Loans & insurance | information, EMI example, separately-consented partner enquiries | comparison when licensed/approved |

## Explicit MVP constraints
- **Web-first** (Next.js), responsive mobile design. Expo app is a later launch consuming the same API.
- **Used EV purchases occur off-platform**; EVONE provides discovery and contact/enquiry, not escrow, custody of vehicle funds, guarantees or transfers of title.
- **Accessory checkout is a first-party inventory/merchant model in MVP**, not multi-vendor settlements.
- **Partner finance leads are just leads**, never a loan application decision, policy issuance or underwriting by EVONE.
- **Unknown charging availability displays “Availability not provided”**, not guessed statuses.
- **No invented inventory, verified badges, user counts, prices, loan offers, or live data in production.**
- **No real user personal documents in seed data.**

## Proposed stack
Next.js + React + TypeScript + Tailwind + shadcn/ui · NestJS REST · PostgreSQL + PostGIS · Prisma (pinned and tested) · Redis + BullMQ · Cloudflare R2 · managed auth · Razorpay · Google Maps/Places or licensed charger feeds · Vercel + Railway · Sentry + PostHog · pnpm + Turborepo.

## Important pre-build decisions
See [`06_Reference/02_decision_register.md`](06_Reference/02_decision_register.md). Pick a definitive auth provider, confirm map licensing/charging data rights, validate seller verification rules and insurer/lender partner model, and approve the accessories fulfillment model **before building the corresponding integrations**.

## Definition of done
A feature counts as done only when the user journey works end to end with loading/empty/error states, access control, database persistence, tests, basic telemetry and acceptance criteria. Mocked visuals alone are **not** done.

## Backend observability (EV-019, in progress)
API and worker logs are JSON with fixed event names and approved metadata only. HTTP completion/error records use the same UUID as `X-Request-ID` and the response envelope, and log the matched route template instead of user URLs. Headers, queries, bodies, raw exception messages/stacks and job payloads are excluded.

External telemetry stays disabled while `SENTRY_DSN` is absent. When an approved project is available, set its DSN in the API/worker environment and run `pnpm --filter @evone/api telemetry:smoke` after building. This sends one synthetic event and exits nonzero on rejected/network delivery; a live issue and alert receipt must still be verified before completing EV-019. Local tests use the real SDK against a loopback receiver. See `PROJECT_SETUP.md` and `04_Delivery/22_EV-019_observability_evidence.md`.

## Savings calculator (EV-048/EV-049)
`/calculator` accepts driving, fuel/EV efficiency and a blended electricity tariff, with an optional EV purchase premium in rupees. It requests the exact savings API through a Server Action; set `API_BASE_URL` in the web environment (see `apps/web/.env.example`). Empty inputs stay empty until entered; the example button is explicitly illustrative. Results include a cost comparison, monthly/yearly amounts, simple payback and exclusions. Inputs are retained on errors but not persisted; editing hides stale results until recalculated. EV-048 and EV-049 passed hosted CI, including the calculator focus follow-up. The homepage now has a compact energy-cost teaser linking to the blank calculator with explicit exclusions and no savings guarantee (EV-050, locally and in hosted CI verified).


## Authentication development spike (EV-005, in progress)

Clerk was selected for a local development spike. An isolated `/auth-spike` scaffold and token probe are disabled outside development and require explicit opt-in; missing instance configuration shows an honest unavailable state without provider requests. Local tests exercise the actual SDK with ephemeral JWT/JWKS fixtures and mocked session transitions. Real sign-in/cookies/logout remain unverified because no development instance is available. See `PROJECT_SETUP.md` and `04_Delivery/26_EV-005_auth_decision.md`; production authentication and RBAC remain EV-016/017.


EV-016 now adds a local-only API bearer guard and protected status probe under an explicit owner-approved prerequisite exception. It defaults off and refuses production enablement; public endpoints remain public. Neither EV-005 nor EV-016 is complete until live provider acceptance is verified. See `04_Delivery/27_EV-016_local_auth_evidence.md`.


EV-017 adds a local scoped-permission and decision-audit foundation under a separate owner-approved exception. Database grants enforce own-account/exact-dealer scope, and audit storage must succeed before an allow response. Production auth remains disabled; native database/full CI passed on PR #14, while live acceptance remains pending, so progress stays **16/87**. See `04_Delivery/28_EV-017_local_rbac_evidence.md`.

EV-020 adds a local-only private media foundation: owner-authorized signed uploads, bounded image validation, sanitized WebP output and temporary private reads. No R2 bucket exists yet; production media/auth remain disabled and native CI passed and completion awaits live provider evidence. See `04_Delivery/29_EV-020_local_media_evidence.md`.

EV-022 adds a development-only `/admin/catalogue` workspace for new catalogue entries. Editors save/submit private drafts; a different admin reviews citations and publishes the complete entry as demo data. Production auth remains disabled and live Clerk acceptance is pending. Enable only with the existing local Clerk setup plus `CATALOGUE_EDITOR_ENABLED=true`; no instance is configured yet. See `04_Delivery/31_EV-022_catalogue_editor_evidence.md`.
