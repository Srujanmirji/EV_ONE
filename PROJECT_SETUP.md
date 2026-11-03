# Engineer Kickoff — From Planning Files to Running Repository

## EV-009 local foundation

The runnable workspace is now this directory; do not create a nested `evone` folder. Use Node `24.18.0` and pnpm `11.20.0`. The preview requires no environment variables, database, Docker or provider credentials.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The web preview runs at `http://127.0.0.1:3000`. Root scripts dispatch through Turborepo. `pnpm start` serves the web build after `pnpm build`.

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @evone/web exec playwright install chromium
pnpm test
```

Browser evidence is written to `apps/web/test-results/`; failed tests retain a trace. Fonts are self-hosted from the pinned Fontsource packages (Inter and Manrope, SIL Open Font License), with no Google Fonts request at build or runtime. This preview is explicitly `noindex, nofollow` until publishing is authorized. It collects no user data and has no inventory, checkout or lead intake.

No unit runner is installed yet because there is no business logic. The initial test suite covers the running production application. Integration, migration, seed and contract scripts below are future acceptance targets, not implemented commands.

## Stage 1 — later setup prerequisites
- GitHub repo private for initial work, team access and required review.
- Node LTS, pnpm, Docker, Postgres/PostGIS, Redis, provider sandbox accounts.
- Decisions: auth vendor, map provider rights/cost, accessories seller-of-record, finance legal gate.
- Add this documentation pack to `/docs` in the actual repo and root `AGENTS.md` for coding agents.

## Stage 2 — original blueprint scaffold target (historical)
```bash
mkdir evone && cd evone
git init
# Use the checked-in pnpm workspace/Turborepo template created in EV-009.
# Do NOT run package installs from this documentation alone until the repo exists.
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
EV-009 uses the existing root instead of duplicating this directory. Follow the runnable instructions above. Future application/service commands are added only with their tasks.

## Stage 3 — build order
1. EV-009–EV-020 scaffold, auth, contracts, schema.
2. EV-021–EV-037 model catalogue + real used-vehicle seller/buyer journey.
3. EV-039–EV-050 accessories first-party commerce and calculators.
4. EV-051–EV-067 charging/editorial/finance/account/dashboard.
5. EV-068–EV-078 QA and controlled deployment.
6. EV-079–EV-080 pilot learning before P1/P2 scale.

## Required local scripts once repo exists
- `pnpm dev`: run web/admin/API/worker with local dependencies.
- `pnpm lint`, `typecheck`, `test`, `test:integration`, `test:e2e`, `build`.
- `pnpm db:migrate:dev`, `db:migrate:deploy`, `db:seed:demo` (seed safely labelled demo only).
- `pnpm contract:generate` and `contract:check`.

## Demo data boundary
Development/demo stage may use fabricated EV listing entries **only if visibly tagged `DEMO / FICTIONAL`**. Production uses real seller permission and reliable specs. Do not mix production environments with seeded test IDs.

## What's not included in this zip
The complete runnable Next.js/NestJS application, API keys, licensed stock imagery, regulator approvals, partner agreements, and verified real inventory. This ZIP is the thorough handoff/specification and execution backlog for building that software.
