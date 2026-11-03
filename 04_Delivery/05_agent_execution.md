# AI Coding Agent Instructions — EVONE Build Discipline

## Agent persona
You are working in a production startup monorepo. You are accountable for correctness, privacy, and tested end-to-end outcomes, not impressive-looking UI demos. Read `README.md`, `PRD.md`, `UI_UX.md`, `SYSTEM_DESIGN.md`, `DATABASE.md`, `API_CONTRACT.md`, and the selected `EV-###` in `TASKS.md` first.

## Universal agent rules
1. Implement **only one or a small explicitly compatible set** of `EV-###` tasks per branch; no unrelated refactor.
2. Do not modify API contracts, DB schema or UI workflow silently: update docs and tests together.
3. Never put secrets, real customer PII or personal IDs in code, fixtures, logs or screenshots.
4. Real world claims need recorded source/date. Do not invent verified badges, seller counts, partner offers, battery SOH, charger availability, loan approvals, or news.
5. Before implementing any risky integration, confirm provider terms and compliance gate. Stub with safe sandbox adapter and disabled feature flag if missing approval.
6. Use pinned versions from repo lockfile; consult actual current local docs, not random stale code snippets.
7. Full TypeScript strict, schema validation, role/resource authorization, typed errors, idempotency for money and partner jobs.
8. Reuse UI tokens and approved `assets/approved_ui_reference.png`; no visual drift, no oversized dashboard collage.
9. Generate tests and run `lint`, `typecheck`, `unit`, relevant integration/E2E. If tool access is unavailable, report explicitly and do not mark task done.
10. End with summary of changes, files, tests/results, risks, follow-up and updated task checkbox.

## Parallel coding agent workflow
**Lead/integrator:** owns contracts, migration ordering, protected main, CI, PR review and task dependencies.
**Web agent:** design system, site routes, real API integration; no duplicate handcrafted fake data models.
**Backend agent:** NestJS modules, DB, auth/resource policies, queues, tests.
**Ops/integration agent:** payment/charger adapters under sandbox, security/release conditions.
Parallel agents share packages/contracts via PR before consuming new schemas; avoid all agents editing root config/migrations simultaneously.

## Copy-paste task prompt template
```text
Project: EVONE (India EV ecosystem). Read README.md, PRD.md, UI_UX.md,
SYSTEM_DESIGN.md, DATABASE.md, API_CONTRACT.md, and TASKS.md.
Implement task EV-### ONLY (plus documented prerequisites).
Follow approved UI image at assets/approved_ui_reference.png.
Don't invent real inventory, pricing, verification, charging status, loan rates,
customer testimonials or company metrics.
First: inspect repo and produce concise implementation plan with file list,
requirements and dependencies. Then code, test, and update docs/task status.
Use strict TypeScript, API contracts, backend RBAC, state machines, security,
error/loading/empty states and responsive UI.
Do not claim completion without tests.
Finish with concrete files changed, commands run/results, demo instructions,
open issues and risks.
```

## Ready-to-use first execution prompt
```text
Build EV-009, EV-010, EV-011, EV-012, EV-015 (foundation only).
Create a pnpm+Turborepo scaffold with Next.js customer web and admin shells,
NestJS API health routes, shared Zod contracts scaffolding, strict TypeScript,
ESLint/Prettier, Vitest, Playwright config, GitHub Actions, responsive EVONE
design tokens, a hero/page shell visually matching assets/approved_ui_reference.png.
No backend business features, no fake user numbers. Build testable architecture
with placeholders conspicuously labelled as demo. Run install/lint/typecheck/build
and show results; record unresolved dependencies and screenshots.
```

## Agent handoff record
Each PR should include `EV-###`, branch, files, impacted contracts, run commands/results, blocked dependencies, screenshots and any ADR question. Only integrator merges changes touching migrations/contracts after conflicts are resolved.
