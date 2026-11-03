# Repository Structure, Hosting, Environment, CI/CD

## Monorepo layout
```text
evone/
  apps/
    web/                         # Next.js public customer site
      app/(public)/              # home, used EVs, catalogue, accessories, charging, journal, finance
      app/(account)/             # auth-gated customer pages
      components/
    admin/                       # Next.js restricted admin + dealer tools
      app/(dealer)/
      app/(admin)/
    api/                         # NestJS modular-monolith REST
      src/modules/{identity,catalogue,marketplace,dealers,commerce,calculator,charging,editorial,finance,notifications,admin}/
      src/common/{auth,validation,errors,logging}
    worker/                      # BullMQ consumers, idempotent side effects
    mobile/                      # Expo later; don't block web MVP
  packages/
    contracts/                   # shared Zod schemas/enums + OpenAPI
    sdk/                         # generated typed HTTP client
    ui/                          # shared web components, NOT native UI
    config/                      # ESLint, TS, Tailwind, prettier settings
    utils/                       # pure shared calculations where stable
  infra/
    docker/docker-compose.yml
    scripts/
  docs/                           # copy planning pack here
  .github/workflows/
  .env.example
  pnpm-workspace.yaml
  turbo.json
```

## Version policy
- Pin a tested Node.js LTS, pnpm, stable Next.js/React, NestJS, Prisma, Redis and PostgreSQL/PostGIS versions at kickoff. Record actual versions in an ADR. **Do not copy stale tutorials blindly**. Prisma PostGIS support differs by major version.
- API schemas: Zod is canonical; NestJS guards/pipes enforce schemas. Generate OpenAPI and typed SDK in CI; avoid hand-maintained duplicate TS interfaces.
- Internal module boundaries: NestJS; one API deploy and worker, horizontally scalable if needed.

## Hosting proposal
| Component | Host | Notes |
|---|---|---|
| Public website/admin | Vercel | distinct apps, preview deployments, no production secrets in client |
| API and worker | Railway | private outbound creds, health checks, separate services |
| Postgres + PostGIS | managed supported Postgres | verify extension install and backup/restore capability |
| Redis | managed Redis with TLS | bullmq queues, cache, throttle; not source of truth |
| Images/docs | Cloudflare R2 | signed upload/download, lifecycle policies |
| Maps | Google Maps or licensed CPO aggregation | per-request price/caching terms reviewed |
| Payments | Razorpay | service-side order and webhook verification |
| Errors & analytics | Sentry, PostHog | data minimization, sampled sessions, no sensitive data |

## Environment setup
- `local`: Docker Postgres+PostGIS and Redis; third-party sandbox; fake labelled demo content.
- `preview`: per-PR frontend, staging API against isolated/staging DB, no production partner sends.
- `staging`: production-like domain with sandbox Razorpay and fake finance partner adapter.
- `production`: separate provider projects, secrets, DB and webhook URLs; feature flags for risky integrations.

## Essential environment variables (names only)
```
NODE_ENV=
PUBLIC_WEB_URL=
NEXT_PUBLIC_API_BASE_URL=
API_BASE_URL=
DATABASE_URL=
REDIS_URL=
AUTH_JWKS_URL=
AUTH_ISSUER=
AUTH_AUDIENCE=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
MAPS_BROWSER_KEY=
MAPS_SERVER_KEY=
EMAIL_API_KEY=
SENTRY_DSN=
POSTHOG_KEY=
FINANCE_PARTNER_ENABLED=false
```
Real `.env` files never committed. Prefix `NEXT_PUBLIC_` only for intentionally public values. Validate all env vars at API startup.

## CI pipeline
1. `pnpm install --frozen-lockfile`
2. `pnpm lint && pnpm typecheck`
3. Generate contracts/OpenAPI and verify repository clean
4. Unit tests / integration tests with ephemeral Postgres+Redis
5. Build web/admin/api/worker
6. Security dependency audit + secret scan
7. Playwright E2E against preview/staging
8. Deploy migration with safe sequencing and human gate for production
9. Smoke test + monitor error budget

## Deployment release order
DB forward-compatible migration → API/worker → web/admin → feature flag → smoke tests. On rollback, revert app/flags; prefer backward-compatible DB migrations so rollback does not require dropping columns.

## Scaling and cost levers
Cache public read-heavy catalogue metadata at edge; images use CDN. Use provider quotas and budgets/alerts for maps, R2 egress and SMS. Keep DB search until measured traffic proves need for search service. Avoid unnecessary GPU/AI costs.
