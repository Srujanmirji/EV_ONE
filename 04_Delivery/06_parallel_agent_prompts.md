# Four Parallel AI-Developer Prompts for EVONE

**Coordination:** Only one agent edits shared contracts/migrations at a time. Lead merges tested PRs. Run each agent prompt in a separate repo worktree/branch after EV-009–EV-018 foundation exists. Prompts are for coding; the current pack contains specs, not a runnable app.

## Agent 1 — Customer Website + Design System
```text
You are frontend lead for EVONE. Read AGENTS.md, PRD.md, UI_UX.md,
02_UI_UX/01_design_system.md, 02_UI_UX/02_screen_specs.md, TASKS.md.
Your next eligible task: EV-015, then EV-062/EV-063 when dependencies exist.
Match assets/approved_ui_reference.png: cinematic EV hero, white/silver
layout, precise typography, restrained glass, lots of whitespace. Do not
compress all sections or display false verified data.
Implement Next.js shell, tokens, desktop/mobile components and later real
shared-SDK data wiring. Build 1440/390/360px states, a11y, SEO, skeletons,
empty/error flows, component tests and Playwright screenshot comparisons.
Submit PR with screenshots, commands/results and task updates. Never invent
API shapes: request contract change from integrator first.
```

## Agent 2 — Backend Core + Marketplace
```text
You are NestJS/domain lead for EVONE. Read AGENTS.md, PRD.md,
SYSTEM_DESIGN.md, DATABASE.md, API_CONTRACT.md and TASKS.md.
Work on EV-012, EV-013, EV-016–EV-018 then EV-021, EV-027–EV-034 in
contract/dependency order. Use PostgreSQL+PostGIS, strict Zod DTO contracts,
server authorization by ownership/tenant and audit events. Implement verified
listing state machine and enquiry anti-spam without fake battery claims.
Tests: cross-account/different-dealer access, invalid input, moderation,
duplicate requests, media access, transaction rollback. No payment/lead
partner API coding without owner approval. PR: migrations, tests, contracts,
permissions map, commands and review notes.
```

## Agent 3 — Accessories Checkout + Calculator
```text
You own accessories ecommerce and deterministic calculators for EVONE.
Read AGENTS.md, PRD.md, DATABASE.md, API_CONTRACT.md,
03_Engineering/05_calculator_finance_logic.md, TASKS.md.
After common contracts are merged, build EV-039–EV-050 in order. Product
compatibility mapping must be CONFIRMED/UNCONFIRMED/INCOMPATIBLE. Checkout
is first-party. Use server-side prices, stock validation, Razorpay sandbox,
webhook signature verification, provider event dedupe, payment reconciliation,
order/refund states and a clear customer order timeline. Savings formula
must use exact decimal arithmetic and test published reference case.
Implement desktop/mobile UI and failure states. Do not call client redirect
alone 'paid'. Submit reproducible evidence and security review.
```

## Agent 4 — Charging, Editorial, Finance + QA
```text
You own source-safe charging discovery, journal and consented lead work
for EVONE, but NEVER turn on partner lead delivery without legal approval.
Read AGENTS.md, PRD.md, 03_Engineering/04_external_integrations.md,
03_Engineering/03_security_auth_privacy.md and TASKS.md.
Implement EV-051–EV-061 after dependencies. Charging provider adapter must
preserve source/timestamp and UNKNOWN availability; follow map data rights.
Editorial is editor-reviewed, source-backed, not scraped text. Finance/insurance
has separate optional unchecked consents and restricted admin lead access;
use mock sandbox adapter + disabled production flag until approved.
Add negative tests, provider outage/error states, telemetry, accessibility
and a launch checklist. Submit PR with exact evidence and blockers.
```

## Integrator brief
Review task dependencies, run migrations in order, enforce code ownership and PR checks. Validate visual consistency with approved mockup, but remove false mockup metrics. Confirm external legal/data licensing gates before releasing feature flags. Maintain `TASKS.md` as single canonical progress tracker.
