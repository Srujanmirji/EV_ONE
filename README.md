# EVONE — Startup & Engineering Blueprint

**Status:** EV-009 foundation verified locally and in CI · **Date:** 2026-11-03 · **Region:** India · **Design:** approved EVONE monochrome automotive + restrained Liquid Glass concept.

> **Purpose:** source of truth for a web-first electric-vehicle ecosystem. The initial workspace now contains a minimal web preview, not completed business features or a legal/compliance certification.

## Run the foundation

Use Node `24.18.0` and pnpm `11.20.0` (pinned in `.node-version` and `package.json`).

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:3000`. No credentials or external services are required. For production-mode local verification:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @evone/web exec playwright install chromium
pnpm test
pnpm start
```

`pnpm test` builds first through Turbo, starts an isolated production server on port 3100, and checks the preview and 404 recovery at four viewport widths. CI also installs Chromium's Linux system dependencies. The suite fails if port 3100 is already occupied.

Implemented workspace members: `apps/web` and `packages/config`. The API, admin, mobile, worker, contracts, SDK and shared UI packages are introduced by their own tasks when used. Documentation stays at its existing paths. The original `MANIFEST_SHA256.txt` describes the supplied blueprint archive, not current edited files.

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
